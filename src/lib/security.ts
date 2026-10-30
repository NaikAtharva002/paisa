/**
 * PAISA Security & Input Sanitization Engine
 * -----------------------------------------
 * Implements OWASP ASVS v5.0.0 guidelines:
 * - Anti-XSS HTML sanitization
 * - Anti-CSV Formula Injection (DDE Defense)
 * - Safe numeric & string validators
 */

/**
 * Sanitizes user-provided string inputs to neutralize cross-site scripting (XSS).
 * Strips script tags, HTML tags, and dangerous protocol attributes.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<[^>]*>/g, '') // Strip full HTML tags like <script>, </script>, <img>
    .replace(/[<>]/g, '') // Strip any remaining stray angle brackets
    .replace(/javascript:/gi, '') // Strip javascript pseudo-protocol
    .replace(/data:/gi, '') // Strip data pseudo-protocol
    .replace(/vbscript:/gi, '') // Strip vbscript pseudo-protocol
    .replace(/on\w+=/gi, '') // Strip inline event handlers (e.g. onerror=, onclick=)
    .trim();
}

/**
 * Defends against CSV / Spreadsheet Formula Injection (CWE-1236 / DDE Injection).
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', an apostrophe prefix is added
 * so spreadsheet software treats it purely as text rather than an executable formula.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  
  // If original string begins with tab, CR, or formula initiation characters
  if (/^[\t\r=+\-@]/.test(value)) {
    return `'${value}`;
  }

  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Validates password strength according to OWASP Authentication Guidelines:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character.' };
  }
  return { isValid: true };
}

/**
 * Masks sensitive financial strings (e.g. account numbers or email addresses).
 * e.g. "atharva@example.com" -> "a***a@example.com"
 * e.g. "501004921987" -> "•••• 987"
 */
export function maskSensitive(str: string, type: 'email' | 'account' = 'account'): string {
  if (!str) return '••••';

  if (type === 'email') {
    const parts = str.split('@');
    if (parts.length !== 2) return '••••';
    const name = parts[0];
    const maskedName = name.length <= 2 
      ? name.charAt(0) + '*' 
      : name.charAt(0) + '*'.repeat(Math.max(1, name.length - 2)) + name.charAt(name.length - 1);
    return `${maskedName}@${parts[1]}`;
  }

  // Account mask: show only last 4 digits
  const digits = str.replace(/\D/g, '');
  if (digits.length <= 4) return `•••• ${digits}`;
  return `•••• ${digits.slice(-4)}`;
}
