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
import {
  toPaise,
  fromPaise,
  roundPaise,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatINR,
  formatINRCompact,
  isLeapYear,
  getDaysInMonth,
  calculateDailyIncomeEquivalent,
  calculateDailySpendableBudget,
  getEffectiveDailyBudget,
  isSpendingExpense,
  calculateTotalSpending,
  calculateTotalIncome,
  getBudgetStatus,
  getBudgetStatusLabel,
  calculateDailyReport,
  calculateMonthlyTrends,
  advanceNextDueDate,
  calculateEssentialDiscretionarySplit,
  compareMonthlySpending,
} from '../lib/calculations';
import { store } from '../lib/storage';
import { FinancialProfile, Transaction } from '../types';

describe('PAISA Level 06 QA — Financial Accuracy & Edge Cases Suite', () => {
  const TEST_USER = 'usr_qa_finance_tester';

  beforeEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // 1. Mandatory Core Financial Arithmetic Cases
  // ============================================================================
  describe('1. Mandatory Financial Precision Cases', () => {
    it('₹100.50 + ₹200.25 must exactly equal ₹300.75 without floating point error', () => {
      const result = addMoney(100.50, 200.25);
      expect(result).toBe(300.75);
      expect(formatINR(result)).toContain('300.75');
    });

    it('₹1,000.00 income - ₹350.00 expense must exactly equal ₹650.00 net cash flow', () => {
      const netCashFlow = subtractMoney(1000.00, 350.00);
      expect(netCashFlow).toBe(650.00);
      expect(formatINR(netCashFlow)).toContain('650.00');
    });

    it('₹5,000.00 budget - ₹1,250.00 spending must exactly equal ₹3,750.00 remaining', () => {
      const remaining = subtractMoney(5000.00, 1250.00);
      expect(remaining).toBe(3750.00);
      expect(formatINR(remaining)).toContain('3,750.00');
    });

    it('eliminates classical JavaScript 0.1 + 0.2 floating point binary rounding traps', () => {
      // In vanilla JS, 0.1 + 0.2 === 0.30000000000000004
      const jsSum = 0.1 + 0.2;
      expect(jsSum).not.toBe(0.3); // Proves the standard JS flaw

      const paisaSum = addMoney(0.10, 0.20);
      expect(paisaSum).toBe(0.30);
    });

    it('handles high volume fractional transactions without cumulative rounding drift', () => {
      // Add 1,000 increments of ₹0.33. In floating point: 1000 * 0.33 = 330.00000000000006
      let total = 0;
      for (let i = 0; i < 1000; i++) {
        total = addMoney(total, 0.33);
      }
      expect(total).toBe(330.00);
    });

    it('multiplies money with integer paise rounding precision', () => {
      // ₹150.35 * 1.18 (18% GST) = 177.413 => rounds to 177.41
      expect(multiplyMoney(150.35, 1.18)).toBe(177.41);
    });

    it('formats Indian currency (Lakhs and Crores) accurately', () => {
      expect(formatINRCompact(450)).toBe('₹450');
      expect(formatINRCompact(15000)).toBe('₹15.0 K');
      expect(formatINRCompact(250000)).toBe('₹2.50 L');
      expect(formatINRCompact(15000000)).toBe('₹1.50 Cr');
    });
  });

  // ============================================================================
  // 2. Calendar, Leap Years, Month Boundaries & Date Clamping
  // ============================================================================
  describe('2. Calendar, Leap Year & Month Clamping Precision', () => {
    it('correctly calculates leap years including century rules', () => {
      expect(isLeapYear(2024)).toBe(true);  // Regular leap year
      expect(isLeapYear(2026)).toBe(false); // Current non-leap year
      expect(isLeapYear(2000)).toBe(true);  // Century divisible by 400
      expect(isLeapYear(1900)).toBe(false); // Century divisible by 100 but not 400
      expect(isLeapYear(2400)).toBe(true);
    });

    it('returns exact days for all 12 calendar months in leap vs non-leap years', () => {
      // 2026 (non-leap): Feb has 28 days
      expect(getDaysInMonth(2026, 1)).toBe(31);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2026, 3)).toBe(31);
      expect(getDaysInMonth(2026, 4)).toBe(30);
      expect(getDaysInMonth(2026, 5)).toBe(31);
      expect(getDaysInMonth(2026, 6)).toBe(30);
      expect(getDaysInMonth(2026, 7)).toBe(31);
      expect(getDaysInMonth(2026, 8)).toBe(31);
      expect(getDaysInMonth(2026, 9)).toBe(30);
      expect(getDaysInMonth(2026, 10)).toBe(31);
      expect(getDaysInMonth(2026, 11)).toBe(30);
      expect(getDaysInMonth(2026, 12)).toBe(31);

      // 2024 (leap): Feb has 29 days
      expect(getDaysInMonth(2024, 2)).toBe(29);

      // Invalid month throws error
      expect(() => getDaysInMonth(2026, 0)).toThrow('Invalid month: 0');
      expect(() => getDaysInMonth(2026, 13)).toThrow('Invalid month: 13');
    });

    it('accurately advances monthly bills without skipping months across boundaries', () => {
      // Jan 31 -> Feb 28 in non-leap year (NOT March 3rd)
      const feb2026 = advanceNextDueDate('2026-01-31', 'monthly');
      expect(feb2026).toBe('2026-02-28');

      // Jan 31 -> Feb 29 in leap year
      const feb2024 = advanceNextDueDate('2024-01-31', 'monthly');
      expect(feb2024).toBe('2024-02-29');

      // Aug 31 -> Sep 30 (September has 30 days, NOT Oct 1st)
      const sepDue = advanceNextDueDate('2026-08-31', 'monthly');
      expect(sepDue).toBe('2026-09-30');

      // Dec 31 -> Jan 31 next year
      const janNext = advanceNextDueDate('2026-12-31', 'monthly');
      expect(janNext).toBe('2027-01-31');

      // Leap day Feb 29, 2024 advanced yearly clamps to Feb 28, 2025
      const leapYearly = advanceNextDueDate('2024-02-29', 'yearly');
      expect(leapYearly).toBe('2025-02-28');

      // Weekly advance
      const weekly = advanceNextDueDate('2026-10-25', 'weekly');
      expect(weekly).toBe('2026-11-01');
    });

    it('calculates daily income equivalents accurately across month lengths', () => {
      const monthlyIncome = 62000;
      // In 31-day month: 62000 / 31 = 2000.00
      expect(calculateDailyIncomeEquivalent(monthlyIncome, 2026, 1)).toBe(2000.00);

      // In 28-day Feb 2026: 62000 / 28 = 2214.29
      expect(calculateDailyIncomeEquivalent(monthlyIncome, 2026, 2)).toBe(2214.29);

      // In 29-day Feb 2024: 62000 / 29 = 2137.93
      expect(calculateDailyIncomeEquivalent(monthlyIncome, 2024, 2)).toBe(2137.93);
    });
  });

  // ============================================================================
  // 3. Transactions, Double-Counting Prevention, Refunds & Transfers
  // ============================================================================
  describe('3. Transaction Accounting & Exclusion Rules', () => {
    it('excludes credit card repayments from daily consumption', () => {
      const ccPayment: Transaction = {
        id: 'tx_cc_pay',
        user_id: TEST_USER,
        transaction_date: '2026-10-15',
        merchant: 'HDFC Credit Card Auto-Debit',
        amount: 25000,
        transaction_type: 'expense',
        category_id: 'cat_bills',
        payment_method: 'Net banking',
        is_credit_card_payment: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(isSpendingExpense(ccPayment)).toBe(false);
      expect(calculateTotalSpending([ccPayment])).toBe(0);
    });

    it('excludes internal bank transfers from spending totals', () => {
      const transfer: Transaction = {
        id: 'tx_transfer',
        user_id: TEST_USER,
        transaction_date: '2026-10-16',
        merchant: 'Transfer to ICICI Savings',
        amount: 15000,
        transaction_type: 'expense',
        category_id: 'cat_savings',
        payment_method: 'Net banking',
        is_internal_transfer: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(isSpendingExpense(transfer)).toBe(false);
      expect(calculateTotalSpending([transfer])).toBe(0);
    });

    it('reduces net spending when refunds are present', () => {
      const txs: Transaction[] = [
        {
          id: 'tx_purchase',
          user_id: TEST_USER,
          transaction_date: '2026-10-20',
          merchant: 'Myntra Fashion',
          amount: 3200,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx_refund',
          user_id: TEST_USER,
          transaction_date: '2026-10-22',
          merchant: 'Myntra Return Refund',
          amount: 1200,
          transaction_type: 'refund',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      expect(calculateTotalSpending(txs)).toBe(2000.00); // 3200 - 1200
    });

    it('ensures refunds cannot cause net spending to become negative', () => {
      const txs: Transaction[] = [
        {
          id: 'tx_large_refund',
          user_id: TEST_USER,
          transaction_date: '2026-10-22',
          merchant: 'Refund',
          amount: 5000,
          transaction_type: 'refund',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      expect(calculateTotalSpending(txs)).toBe(0);
    });

    it('normalizes negative or unrounded amounts when saved to storage', () => {
      const tx = store.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-28',
        merchant: 'Store',
        amount: -450.555, // Negative with 3 decimals
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
      });

      expect(tx.amount).toBe(450.56); // Normalized to positive 2-decimal paise
    });
  });

  // ============================================================================
  // 4. Budget Status & Reality Message Edge Cases
  // ============================================================================
  describe('4. Budget Status Thresholds & Reality Reporting', () => {
    it('accurately resolves status transitions at boundary values', () => {
      expect(getBudgetStatus(0)).toBe('comfortable');
      expect(getBudgetStatus(69.9)).toBe('comfortable');
      expect(getBudgetStatus(70.0)).toBe('getting_close'); // Warning threshold boundary
      expect(getBudgetStatus(99.9)).toBe('getting_close');
      expect(getBudgetStatus(100.0)).toBe('budget_reached');
      expect(getBudgetStatus(100.1)).toBe('overspent');
      expect(getBudgetStatus(250.0)).toBe('overspent');
    });

    it('generates reality report with correct variance and remaining allowance', () => {
      const dailyBudget = 1000;
      const todayTxs: Transaction[] = [
        {
          id: 'tx_lunch',
          user_id: TEST_USER,
          transaction_date: '2026-10-31',
          merchant: 'Biryani House',
          amount: 450,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          is_unplanned: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const report = calculateDailyReport(dailyBudget, todayTxs, '2026-10-31', 1000, 'friendly');
      expect(report.actualSpending).toBe(450);
      expect(report.variance).toBe(550);
      expect(report.remainingAllowance).toBe(550);
      expect(report.overspending).toBe(0);
      expect(report.percentUsed).toBe(45);
      expect(report.status).toBe('comfortable');
      expect(report.unplannedCount).toBe(1);
    });

    it('correctly calculates overspending report when budget is exceeded', () => {
      const dailyBudget = 1000;
      const todayTxs: Transaction[] = [
        {
          id: 'tx_gadget',
          user_id: TEST_USER,
          transaction_date: '2026-10-31',
          merchant: 'Headphones',
          amount: 1450,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          is_unplanned: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const report = calculateDailyReport(dailyBudget, todayTxs, '2026-10-31', 1000, 'straightforward');
      expect(report.actualSpending).toBe(1450);
      expect(report.variance).toBe(-450);
      expect(report.overspending).toBe(450);
      expect(report.percentUsed).toBe(145);
      expect(report.status).toBe('overspent');
      expect(report.message).toContain('Budget exceeded by ₹450.00');
    });
  });

  // ============================================================================
  // 5. Essential vs Discretionary Split & Month-over-Month Analytics
  // ============================================================================
  describe('5. Essential vs Discretionary Split & Historical Comparison', () => {
    it('categorizes Groceries, Bills, and Rent as Essential and Dining/Shopping as Discretionary', () => {
      const txs: Transaction[] = [
        {
          id: 'tx_1',
          user_id: TEST_USER,
          transaction_date: '2026-10-10',
          merchant: 'Blinkit',
          amount: 2000,
          transaction_type: 'expense',
          category_id: 'cat_groceries', // Essential
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx_2',
          user_id: TEST_USER,
          transaction_date: '2026-10-12',
          merchant: 'Electricity Bill',
          amount: 1500,
          transaction_type: 'expense',
          category_id: 'cat_bills', // Essential
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx_3',
          user_id: TEST_USER,
          transaction_date: '2026-10-14',
          merchant: 'Zara Shopping',
          amount: 3500,
          transaction_type: 'expense',
          category_id: 'cat_shopping', // Discretionary
          payment_method: 'Credit card',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const split = calculateEssentialDiscretionarySplit(txs);
      expect(split.essentialTotal).toBe(3500); // 2000 + 1500
      expect(split.discretionaryTotal).toBe(3500);
      expect(split.totalSpending).toBe(7000);
      expect(split.essentialPercentage).toBe(50);
      expect(split.discretionaryPercentage).toBe(50);
    });

    it('computes Month-over-Month spending comparative changes across year transitions', () => {
      const txs: Transaction[] = [
        {
          id: 'tx_dec',
          user_id: TEST_USER,
          transaction_date: '2025-12-20',
          merchant: 'Dec Shopping',
          amount: 20000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx_jan',
          user_id: TEST_USER,
          transaction_date: '2026-01-15',
          merchant: 'Jan Shopping',
          amount: 25000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Compare 2026-01 against 2025-12
      const comp = compareMonthlySpending(txs, '2026-01');
      expect(comp.currentPeriodKey).toBe('2026-01');
      expect(comp.previousPeriodKey).toBe('2025-12');
      expect(comp.currentSpending).toBe(25000);
      expect(comp.previousSpending).toBe(20000);
      expect(comp.deltaAmount).toBe(5000);
      expect(comp.percentageChange).toBe(25.0); // +25%
      expect(comp.hasPreviousData).toBe(true);
    });
  });
});
