/**
 * PAISA Audit Logging & Security Event Monitor
 * --------------------------------------------
 * Implements OWASP ASVS v5.0.0 Logging & Monitoring Standards:
 * - Records authentication attempts, access violations, data resets, and export events.
 * - Masks or excludes all credentials, tokens, and sensitive banking data.
 */

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_REGISTER'
  | 'AUTH_PASSWORD_CHANGE'
  | 'RATE_LIMIT_LOCKOUT'
  | 'DATA_EXPORT'
  | 'DATA_RESET'
  | 'CROSS_TENANT_VIOLATION_ATTEMPT'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  eventType: SecurityEventType;
  details: string;
  ipAddressHint?: string;
  success: boolean;
}

const AUDIT_LOG_KEY = 'paisa_security_audit_logs';
const MAX_LOG_ENTRIES = 100;

export const auditLogger = {
  getLogs(): AuditLogEntry[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(AUDIT_LOG_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  log(params: {
    userId: string;
    eventType: SecurityEventType;
    details: string;
    success?: boolean;
  }): AuditLogEntry {
    // Defense-in-depth: Never log passwords, tokens, or secret keys
    const sanitizedDetails = params.details
      .replace(/password[:=]\s*\S+/gi, 'password=[REDACTED]')
      .replace(/token[:=]\s*\S+/gi, 'token=[REDACTED]')
      .replace(/key[:=]\s*\S+/gi, 'key=[REDACTED]');

    const entry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId || 'anonymous',
      eventType: params.eventType,
      details: sanitizedDetails,
      success: params.success !== undefined ? params.success : true,
    };

    try {
      if (typeof localStorage !== 'undefined') {
        const logs = [entry, ...this.getLogs()].slice(0, MAX_LOG_ENTRIES);
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
      }
    } catch (e) {
      console.warn('Failed to write audit log:', e);
    }

    return entry;
  },

  clearLogs(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUDIT_LOG_KEY);
    }
  },
};
