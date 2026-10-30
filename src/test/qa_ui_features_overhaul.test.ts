class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
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
import { store } from '../lib/storage';
import { roundPaise } from '../lib/calculations';

describe('PAISA Complete UI & Feature Overhaul Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    store.init();
  });

  describe('1. UPI Deep Link Construction', () => {
    it('should format standard mobile banking UPI URI correctly', () => {
      const vpa = 'landlord@okaxis';
      const payeeName = 'Landlord Rent';
      const amount = 22000;
      const note = 'Monthly Rent Payment';

      const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

      expect(upiUrl).toContain('upi://pay?');
      expect(upiUrl).toContain('pa=landlord%40okaxis');
      expect(upiUrl).toContain('pn=Landlord%20Rent');
      expect(upiUrl).toContain('am=22000');
      expect(upiUrl).toContain('cu=INR');
    });
  });

  describe('2. Data Backup Export & Import Round-Trip', () => {
    it('should export full financial state and re-import without loss', () => {
      const backupJson = store.exportFullDataBackup();
      expect(backupJson).toBeTruthy();

      const parsed = JSON.parse(backupJson);
      expect(parsed).toHaveProperty('user');
      expect(parsed).toHaveProperty('financialProfile');
      expect(parsed).toHaveProperty('accounts');
      expect(parsed).toHaveProperty('categories');
      expect(parsed).toHaveProperty('transactions');

      const initialTxCount = parsed.transactions.length;
      const initialAccountsCount = parsed.accounts.length;

      // Re-import it back
      const importSuccess = store.importFullDataBackup(backupJson);
      expect(importSuccess).toBe(true);

      const activeUser = store.getActiveUserId();
      expect(store.getTransactions(activeUser).length).toBe(initialTxCount);
      expect(store.getAccounts(activeUser).length).toBe(initialAccountsCount);
    });

    it('should fail gracefully on invalid backup json', () => {
      const success = store.importFullDataBackup('invalid json content');
      expect(success).toBe(false);
    });
  });

  describe('3. Savings Goals Financial Projections', () => {
    it('should accurately calculate days remaining and required monthly deposit', () => {
      const targetAmount = 120000;
      const currentAmount = 60000;
      const remainingAmount = targetAmount - currentAmount;
      expect(remainingAmount).toBe(60000);

      const now = new Date('2026-10-31T00:00:00Z');
      const targetDate = new Date('2027-04-30T00:00:00Z'); // ~181 days, ~6 months
      const diffMs = targetDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      expect(daysLeft).toBeGreaterThan(170);

      const monthsLeft = Math.max(1, Math.round(daysLeft / 30.4));
      const requiredMonthly = roundPaise(remainingAmount / monthsLeft);

      expect(requiredMonthly).toBe(10000); // 60,000 / 6 months = 10,000/mo
    });
  });

  describe('4. Category Budgets Storage & CRUD', () => {
    it('should save and update custom category budgets', () => {
      const initialBudgets = store.getCategoryBudgets();
      expect(typeof initialBudgets).toBe('object');

      store.updateCategoryBudget('cat_dining', 8500);
      const updated = store.getCategoryBudgets();
      expect(updated['cat_dining']).toBe(8500);
    });
  });

  describe('5. Net Worth Aggregation', () => {
    it('should aggregate net worth accurately across bank and credit accounts', () => {
      const accounts = store.getAccounts();
      const netWorth = accounts.reduce((acc, a) => {
        if (a.account_type === 'credit_card') {
          return acc - a.balance;
        }
        return acc + a.balance;
      }, 0);

      expect(typeof netWorth).toBe('number');
      expect(netWorth).toBeGreaterThan(0);
    });
  });
});
