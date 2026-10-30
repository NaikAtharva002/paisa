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
  calculateEssentialDiscretionarySplit,
  compareMonthlySpending,
  calculateTotalSpending,
} from '../lib/calculations';
import {
  calculateMonthEndForecast,
  calculatePendingRecurringBills,
} from '../lib/forecasting';
import {
  suggestCategory,
  getConfidenceTier,
  MerchantRule,
} from '../lib/categorization';
import { store } from '../lib/storage';
import { parseTransactionsCsv } from '../lib/csvParser';
import { Transaction, RecurringPayment, FinancialProfile } from '../types';

describe('PAISA Level 04 Intelligence & Analytics Engine Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    store.init();
    store.clearDismissedInsights();
    store.setAIInsightsEnabled(true);
  });

  // ============================================================================
  // 1. Core Analytics: Month-over-Month Comparison & Trends
  // ============================================================================
  describe('Month-over-Month Trajectory & Trend Analytics', () => {
    it('accurately computes spending deltas between consecutive months', () => {
      const mockTxs: Transaction[] = [
        // Previous month (2026-09)
        {
          id: 'tx_prev_1',
          user_id: 'usr_test',
          transaction_date: '2026-09-05',
          merchant: 'Swiggy',
          amount: 5000,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-09-05T00:00:00Z',
          updated_at: '2026-09-05T00:00:00Z',
        },
        {
          id: 'tx_prev_2',
          user_id: 'usr_test',
          transaction_date: '2026-09-12',
          merchant: 'Amazon',
          amount: 15000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: '2026-09-12T00:00:00Z',
          updated_at: '2026-09-12T00:00:00Z',
        },
        // Current month (2026-10)
        {
          id: 'tx_cur_1',
          user_id: 'usr_test',
          transaction_date: '2026-10-04',
          merchant: 'Swiggy',
          amount: 8000,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-04T00:00:00Z',
          updated_at: '2026-10-04T00:00:00Z',
        },
        {
          id: 'tx_cur_2',
          user_id: 'usr_test',
          transaction_date: '2026-10-15',
          merchant: 'Amazon',
          amount: 10000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: '2026-10-15T00:00:00Z',
          updated_at: '2026-10-15T00:00:00Z',
        },
      ];

      const mom = compareMonthlySpending(mockTxs, '2026-10');

      expect(mom.hasPreviousData).toBe(true);
      expect(mom.currentSpending).toBe(18000); // 8000 + 10000
      expect(mom.previousSpending).toBe(20000); // 5000 + 15000
      expect(mom.deltaAmount).toBe(-2000); // 18000 - 20000 = -2000
      expect(mom.percentageChange).toBe(-10.0); // -2000 / 20000 * 100 = -10.0%

      // Check category deltas
      const foodDelta = mom.categoryDeltas.find(c => c.categoryId === 'cat_food');
      expect(foodDelta).toBeDefined();
      expect(foodDelta?.currentAmount).toBe(8000);
      expect(foodDelta?.previousAmount).toBe(5000);
      expect(foodDelta?.deltaAmount).toBe(3000); // +3000

      const shoppingDelta = mom.categoryDeltas.find(c => c.categoryId === 'cat_shopping');
      expect(shoppingDelta).toBeDefined();
      expect(shoppingDelta?.deltaAmount).toBe(-5000);
    });

    it('handles zero previous month data gracefully without division by zero', () => {
      const mockTxs: Transaction[] = [
        {
          id: 'tx_cur_1',
          user_id: 'usr_test',
          transaction_date: '2026-10-04',
          merchant: 'Swiggy',
          amount: 2500,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-04T00:00:00Z',
          updated_at: '2026-10-04T00:00:00Z',
        },
      ];

      const mom = compareMonthlySpending(mockTxs, '2026-10');
      expect(mom.hasPreviousData).toBe(false);
      expect(mom.previousSpending).toBe(0);
      expect(mom.deltaAmount).toBe(2500);
      expect(mom.percentageChange).toBe(0);
    });
  });

  // ============================================================================
  // 2. Core Analytics: Essential vs Discretionary Needs
  // ============================================================================
  describe('Essential Needs vs Discretionary Lifestyle Classification', () => {
    it('classifies core living needs separately from discretionary lifestyle', () => {
      const txs: Transaction[] = [
        // Essentials: Groceries (4000), Bills (3000), Rent (20000) = 27000
        {
          id: 'tx_1',
          user_id: 'usr_test',
          transaction_date: '2026-10-01',
          merchant: 'Blinkit',
          amount: 4000,
          transaction_type: 'expense',
          category_id: 'cat_groceries',
          payment_method: 'UPI',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
        {
          id: 'tx_2',
          user_id: 'usr_test',
          transaction_date: '2026-10-02',
          merchant: 'Tata Power',
          amount: 3000,
          transaction_type: 'expense',
          category_id: 'cat_bills',
          payment_method: 'UPI',
          created_at: '2026-10-02T00:00:00Z',
          updated_at: '2026-10-02T00:00:00Z',
        },
        {
          id: 'tx_3',
          user_id: 'usr_test',
          transaction_date: '2026-10-03',
          merchant: 'House Rent',
          amount: 20000,
          transaction_type: 'expense',
          category_id: 'cat_rent',
          payment_method: 'UPI',
          created_at: '2026-10-03T00:00:00Z',
          updated_at: '2026-10-03T00:00:00Z',
        },
        // Discretionary: Dining (5000), Shopping (4000) = 9000
        {
          id: 'tx_4',
          user_id: 'usr_test',
          transaction_date: '2026-10-04',
          merchant: 'Starbucks',
          amount: 5000,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-04T00:00:00Z',
          updated_at: '2026-10-04T00:00:00Z',
        },
        {
          id: 'tx_5',
          user_id: 'usr_test',
          transaction_date: '2026-10-05',
          merchant: 'Zara',
          amount: 4000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: '2026-10-05T00:00:00Z',
          updated_at: '2026-10-05T00:00:00Z',
        },
      ];

      const split = calculateEssentialDiscretionarySplit(txs);

      expect(split.essentialTotal).toBe(27000);
      expect(split.discretionaryTotal).toBe(9000);
      expect(split.totalSpending).toBe(36000);
      expect(split.essentialPercentage).toBe(75); // 27000 / 36000 = 75%
      expect(split.discretionaryPercentage).toBe(25); // 9000 / 36000 = 25%
    });

    it('accounts for refunds reducing their respective category bucket', () => {
      const txs: Transaction[] = [
        {
          id: 'tx_1',
          user_id: 'usr_test',
          transaction_date: '2026-10-01',
          merchant: 'Blinkit',
          amount: 2000,
          transaction_type: 'expense',
          category_id: 'cat_groceries',
          payment_method: 'UPI',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
        {
          id: 'tx_refund',
          user_id: 'usr_test',
          transaction_date: '2026-10-02',
          merchant: 'Blinkit Refund',
          amount: 500,
          transaction_type: 'refund',
          category_id: 'cat_groceries',
          payment_method: 'UPI',
          created_at: '2026-10-02T00:00:00Z',
          updated_at: '2026-10-02T00:00:00Z',
        },
      ];

      const split = calculateEssentialDiscretionarySplit(txs);
      expect(split.essentialTotal).toBe(1500); // 2000 - 500
      expect(split.discretionaryTotal).toBe(0);
      expect(split.totalSpending).toBe(1500);
    });
  });

  // ============================================================================
  // 3. Spending Forecasting & Run-Rate Modeling
  // ============================================================================
  describe('Spending Forecasting & Predictive Run-rate Modeling', () => {
    const testProfile: FinancialProfile = {
      user_id: 'usr_forecast_test',
      monthly_income: 100000,
      salary_credit_day: 1,
      budgeting_mode: 'income_equivalent',
      savings_target: 20000,
      fixed_commitments: 20000,
      daily_budget_override: 0,
      monthly_spending_target: 60000,
    };

    it('returns insufficient_data state when fewer than 2 days or 2 transactions exist', () => {
      const forecast = calculateMonthEndForecast({
        transactions: [],
        recurringPayments: [],
        profile: testProfile,
        categoryBudgets: {},
        currentDate: new Date('2026-10-01T12:00:00Z'), // Day 1
      });

      expect(forecast.status).toBe('insufficient_data');
      expect(forecast.explanatoryMessage).toContain('More data needed');
      expect(forecast.riskLevel).toBe('safe');
    });

    it('projects month-end spending based on elapsed daily pace and pending recurring bills', () => {
      // Scenario: Day 10 of a 31-day month (Oct).
      // Days elapsed = 10, days remaining = 21.
      // Spent so far: ₹10,000 regular spending -> ₹1,000/day run-rate.
      // Pending recurring bill due on Day 20: ₹4,000.
      // Expected projection: 10,000 + (1,000 * 21) + 4,000 = ₹35,000.
      const mockTxs: Transaction[] = [
        {
          id: 'tx_1',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-10-02',
          merchant: 'Daily Food',
          amount: 5000,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-02T00:00:00Z',
          updated_at: '2026-10-02T00:00:00Z',
        },
        {
          id: 'tx_2',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-10-08',
          merchant: 'Groceries',
          amount: 5000,
          transaction_type: 'expense',
          category_id: 'cat_groceries',
          payment_method: 'UPI',
          created_at: '2026-10-08T00:00:00Z',
          updated_at: '2026-10-08T00:00:00Z',
        },
      ];

      const mockRecurring: RecurringPayment[] = [
        {
          id: 'rec_1',
          user_id: 'usr_forecast_test',
          name: 'Broadband',
          amount: 4000,
          frequency: 'monthly',
          next_due_date: '2026-10-20', // Due on Day 20 (> Day 10)
          category_id: 'cat_bills',
          auto_record: true,
          is_active: true,
        },
        {
          id: 'rec_past',
          user_id: 'usr_forecast_test',
          name: 'Old Bill',
          amount: 1000,
          frequency: 'monthly',
          next_due_date: '2026-10-05', // Already passed on Day 5
          category_id: 'cat_bills',
          auto_record: true,
          is_active: true,
        },
      ];

      const forecast = calculateMonthEndForecast({
        transactions: mockTxs,
        recurringPayments: mockRecurring,
        profile: testProfile,
        categoryBudgets: { cat_food: 15000, cat_bills: 10000 },
        currentDate: new Date('2026-10-10T12:00:00Z'),
      });

      expect(forecast.status).toBe('sufficient_data');
      expect(forecast.daysElapsed).toBe(10);
      expect(forecast.daysRemaining).toBe(21);
      expect(forecast.actualSpentMtd).toBe(10000);
      expect(forecast.dailyRunRate).toBe(1000); // 10000 / 10
      expect(forecast.pendingRecurringTotal).toBe(4000); // Only rec_1
      expect(forecast.projectedMonthEndSpent).toBe(35000); // 10000 + (1000*21) + 4000 = 35000
      expect(forecast.projectedVariance).toBe(25000); // Budget 60000 - 35000 = +25000
      expect(forecast.projectedSavings).toBe(65000); // Income 100000 - 35000 = 65000
      expect(forecast.riskLevel).toBe('safe');
    });

    it('isolates one-time outlier purchases from inflating daily run-rate', () => {
      // Day 10: User spends ₹5,000 on regular items + ₹50,000 on a one-time laptop purchase.
      // Outlier cutoff is 20% of income (20,000).
      // Regular spending = ₹5,000, Outlier = ₹50,000.
      // Daily run rate should be based on ₹5,000 / 10 days = ₹500/day (NOT ₹55,000 / 10 = ₹5,500/day!).
      const mockTxs: Transaction[] = [
        {
          id: 'tx_laptop',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-10-03',
          merchant: 'Apple Store Laptop',
          amount: 50000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'Credit card',
          created_at: '2026-10-03T00:00:00Z',
          updated_at: '2026-10-03T00:00:00Z',
        },
        {
          id: 'tx_reg_1',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-10-05',
          merchant: 'Swiggy',
          amount: 2500,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-05T00:00:00Z',
          updated_at: '2026-10-05T00:00:00Z',
        },
        {
          id: 'tx_reg_2',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-10-09',
          merchant: 'Grocery',
          amount: 2500,
          transaction_type: 'expense',
          category_id: 'cat_groceries',
          payment_method: 'UPI',
          created_at: '2026-10-09T00:00:00Z',
          updated_at: '2026-10-09T00:00:00Z',
        },
      ];

      const forecast = calculateMonthEndForecast({
        transactions: mockTxs,
        recurringPayments: [],
        profile: testProfile,
        categoryBudgets: {},
        currentDate: new Date('2026-10-10T12:00:00Z'),
        outlierThreshold: 20000,
      });

      expect(forecast.actualSpentMtd).toBe(55000);
      expect(forecast.dailyRunRate).toBe(500); // 5000 regular / 10 days
      // Projected = Actual (55000) + (500 * 21) = 55000 + 10500 = 65500
      expect(forecast.projectedMonthEndSpent).toBe(65500);
      expect(forecast.riskLevel).toBe('moderate'); // 65500 > monthly budget 60000
    });

    it('flags high risk and calculates exhaustion day when budget is pacing to deplete early', () => {
      // Day 10 of 30-day month: Budget = 30,000.
      // Spent so far: ₹20,000 in 10 days = ₹2,000/day run rate.
      // Remaining budget = ₹10,000.
      // Exhaustion day = 10 + floor(10000 / 2000) = Day 15!
      const fastBurnTxs: Transaction[] = [
        {
          id: 'tx_1',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-04-03',
          merchant: 'High End Hotel',
          amount: 10000,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-04-03T00:00:00Z',
          updated_at: '2026-04-03T00:00:00Z',
        },
        {
          id: 'tx_2',
          user_id: 'usr_forecast_test',
          transaction_date: '2026-04-07',
          merchant: 'Shopping Mall',
          amount: 10000,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          created_at: '2026-04-07T00:00:00Z',
          updated_at: '2026-04-07T00:00:00Z',
        },
      ];

      const profile: FinancialProfile = {
        ...testProfile,
        monthly_spending_target: 30000,
      };

      const forecast = calculateMonthEndForecast({
        transactions: fastBurnTxs,
        recurringPayments: [],
        profile,
        categoryBudgets: {},
        currentDate: new Date('2026-04-10T12:00:00Z'),
        outlierThreshold: 50000,
      });

      expect(forecast.riskLevel).toBe('high');
      expect(forecast.projectedExhaustionDay).toBe(15);
      expect(forecast.explanatoryMessage).toContain('Day 15');
    });
  });

  // ============================================================================
  // 4. Categorization Engine, Confidence Scoring & Machine Learning Rules
  // ============================================================================
  describe('Categorization Engine & Learned Merchant Rules', () => {
    it('categorizes known Indian merchants with high confidence', () => {
      const swiggy = suggestCategory('Swiggy Instamart Order #991');
      expect(swiggy.categoryId).toBe('cat_groceries');
      expect(swiggy.confidence).toBeGreaterThanOrEqual(0.85);
      expect(swiggy.confidenceTier).toBe('high');
      expect(swiggy.confidenceLabel).toBe('High Confidence');

      const netflix = suggestCategory('Netflix Subscription');
      expect(netflix.categoryId).toBe('cat_subscriptions');
      expect(netflix.confidenceTier).toBe('high');

      const cred = suggestCategory('CRED HDFC Credit Card Pay');
      expect(cred.isCreditCardPayment).toBe(true);
      expect(cred.categoryId).toBe('cat_transfers');
    });

    it('falls back to cat_other with needs_review for unknown merchants', () => {
      const unknown = suggestCategory('Random XYZ Hardware Store 9912');
      expect(unknown.categoryId).toBe('cat_other');
      expect(unknown.confidenceTier).toBe('needs_review');
      expect(unknown.confidenceLabel).toBe('Needs Review');
    });

    it('gives custom learned merchant rules highest priority over built-in dictionary', () => {
      // User creates a rule mapping "Blue Tokai" to "cat_groceries" instead of standard "cat_food"
      const customRule: MerchantRule = {
        keywords: ['blue tokai'],
        categoryId: 'cat_groceries',
        user_id: 'usr_test',
      };

      const result = suggestCategory('Blue Tokai Roasters', '', [customRule]);
      expect(result.categoryId).toBe('cat_groceries');
      expect(result.isCustomLearned).toBe(true);
      expect(result.confidence).toBe(0.98);
      expect(result.confidenceTier).toBe('high');
    });

    it('persists and deletes custom learned merchant rules in store', () => {
      const saved = store.saveUserCategoryRule({
        keywords: ['local milk vendor'],
        categoryId: 'cat_groceries',
      });

      expect(saved.id).toMatch(/^rule_/);
      expect(saved.keywords).toContain('local milk vendor');

      const rules = store.getUserCategoryRules();
      expect(rules.some(r => r.id === saved.id)).toBe(true);

      const deleted = store.deleteUserCategoryRule(saved.id!);
      expect(deleted).toBe(true);

      const updatedRules = store.getUserCategoryRules();
      expect(updatedRules.some(r => r.id === saved.id)).toBe(false);
    });

    it('applies custom merchant rules during CSV parsing', () => {
      const customRule: MerchantRule = {
        keywords: ['special custom merchant'],
        categoryId: 'cat_education',
        user_id: 'usr_test',
      };

      const csvData = `Date,Merchant,Amount,Payment Method\n2026-10-10,Special Custom Merchant Books,1500,UPI`;
      const parsed = parseTransactionsCsv(csvData, [], 'usr_test', [customRule]);

      expect(parsed.validRows.length).toBe(1);
      expect(parsed.validRows[0].category_id).toBe('cat_education');
    });
  });

  // ============================================================================
  // 5. AI Insights Controls & Transparency
  // ============================================================================
  describe('AI Insights User Controls & Transparency', () => {
    it('records and filters dismissed insights', () => {
      expect(store.getDismissedInsights()).toEqual([]);

      store.dismissInsight('ins_top_cat');
      expect(store.getDismissedInsights()).toContain('ins_top_cat');

      store.dismissInsight('ins_savings');
      expect(store.getDismissedInsights()).toHaveLength(2);

      store.clearDismissedInsights();
      expect(store.getDismissedInsights()).toEqual([]);
    });

    it('persists AI insights master toggle preference', () => {
      expect(store.getAIInsightsEnabled()).toBe(true);

      store.setAIInsightsEnabled(false);
      expect(store.getAIInsightsEnabled()).toBe(false);

      store.setAIInsightsEnabled(true);
      expect(store.getAIInsightsEnabled()).toBe(true);
    });
  });
});
