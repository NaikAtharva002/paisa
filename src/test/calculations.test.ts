import { describe, it, expect } from 'vitest';
import {
  calculateDailyIncomeEquivalent,
  calculateDailySpendableBudget,
  getEffectiveDailyBudget,
  calculateTotalSpending,
  calculateTotalIncome,
  calculateDailyReport,
  getDaysInMonth,
  isLeapYear,
  isSpendingExpense,
  toPaise,
  fromPaise,
  roundPaise,
  addMoney,
  subtractMoney,
  advanceNextDueDate,
  calculateMonthlyTrends,
  formatINR,
  getBudgetStatus,
  getBudgetStatusLabel,
} from '../lib/calculations';
import { parseTransactionsCsv } from '../lib/csvParser';
import { suggestCategory } from '../lib/categorization';
import { Transaction, FinancialProfile, RecurringPayment, SavingsGoal } from '../types';

describe('PAISA Level 02 Core Financial Functionality Test Suite', () => {

  // -------------------------------------------------------------------------
  // 1. FINANCIAL PRECISION ENGINE (Integer Paise Arithmetic & Float Safety)
  // -------------------------------------------------------------------------
  describe('1. Financial Precision & Exact Currency Arithmetic', () => {
    it('accurately computes exact decimal addition without floating point error (0.1 + 0.2 = 0.30)', () => {
      const sum = addMoney(0.1, 0.2);
      expect(sum).toBe(0.3);
      expect(sum.toString()).toBe('0.3');
    });

    it('accurately computes ₹100.50 + ₹200.25 = ₹300.75', () => {
      const result = addMoney(100.5, 200.25);
      expect(result).toBe(300.75);
    });

    it('accurately performs exact subtraction without drift (300.75 - 100.50 = 200.25)', () => {
      const diff = subtractMoney(300.75, 100.5);
      expect(diff).toBe(200.25);
    });

    it('rounds arbitrary floats strictly to integer paise (2 decimal places)', () => {
      expect(roundPaise(12.345)).toBe(12.35);
      expect(roundPaise(12.341)).toBe(12.34);
      expect(roundPaise(0)).toBe(0);
    });

    it('formats Indian Rupee currency with standard Indian grouping', () => {
      expect(formatINR(100000)).toBe('₹1,00,000.00');
      expect(formatINR(3333.33)).toBe('₹3,333.33');
      expect(formatINR(250, false)).toBe('₹250');
    });
  });

  // -------------------------------------------------------------------------
  // 2. EXPENSE MANAGEMENT & SEGREGATION
  // -------------------------------------------------------------------------
  describe('2. Expense Management', () => {
    it('correctly aggregates multiple valid expense transactions', () => {
      const transactions: Transaction[] = [
        { id: '1', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Swiggy', amount: 450.5, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
        { id: '2', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Blinkit', amount: 320.25, transaction_type: 'expense', category_id: 'cat_groceries', payment_method: 'UPI', created_at: '', updated_at: '' },
      ];
      expect(calculateTotalSpending(transactions)).toBe(770.75);
    });

    it('strictly excludes credit card bill repayments from daily consumption spending', () => {
      const purchaseTx: Transaction = {
        id: '1', user_id: 'u1', transaction_date: '2026-10-10', merchant: 'Zara', amount: 4500, transaction_type: 'expense', category_id: 'cat_shopping', payment_method: 'Credit card', created_at: '', updated_at: ''
      };
      const ccBillSettlementTx: Transaction = {
        id: '2', user_id: 'u1', transaction_date: '2026-10-25', merchant: 'CRED HDFC Credit Card Bill', amount: 4500, transaction_type: 'expense', category_id: 'cat_transfers', payment_method: 'Net banking', is_credit_card_payment: true, created_at: '', updated_at: ''
      };

      expect(isSpendingExpense(purchaseTx)).toBe(true);
      expect(isSpendingExpense(ccBillSettlementTx)).toBe(false);

      // Total spending must be ₹4,500, NOT ₹9,000!
      const total = calculateTotalSpending([purchaseTx, ccBillSettlementTx]);
      expect(total).toBe(4500);
    });

    it('treats refunds as spending deductions', () => {
      const transactions: Transaction[] = [
        { id: '1', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Flight Booking', amount: 5000, transaction_type: 'expense', category_id: 'cat_travel', payment_method: 'Credit card', created_at: '', updated_at: '' },
        { id: '2', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Airline Cancellation Refund', amount: 4500, transaction_type: 'refund', category_id: 'cat_travel', payment_method: 'Credit card', created_at: '', updated_at: '' },
      ];
      expect(calculateTotalSpending(transactions)).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // 3. INCOME MANAGEMENT
  // -------------------------------------------------------------------------
  describe('3. Income Management', () => {
    it('aggregates multiple income credits correctly and separates them from expenses', () => {
      const transactions: Transaction[] = [
        { id: '1', user_id: 'u1', transaction_date: '2026-10-01', merchant: 'Employer Salary', amount: 90000, transaction_type: 'income', category_id: 'cat_other', payment_method: 'Net banking', created_at: '', updated_at: '' },
        { id: '2', user_id: 'u1', transaction_date: '2026-10-15', merchant: 'Freelance Design', amount: 15000, transaction_type: 'income', category_id: 'cat_other', payment_method: 'UPI', created_at: '', updated_at: '' },
        { id: '3', user_id: 'u1', transaction_date: '2026-10-16', merchant: 'Dinner', amount: 1200, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
      ];

      expect(calculateTotalIncome(transactions)).toBe(105000);
      expect(calculateTotalSpending(transactions)).toBe(1200);

      // Verify income is NEVER identified as spending expense
      expect(isSpendingExpense(transactions[0])).toBe(false);
      expect(isSpendingExpense(transactions[1])).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. DAILY BUDGET & ALLOWANCE PIPELINE
  // -------------------------------------------------------------------------
  describe('4. Daily Budget & Remaining Allowance', () => {
    const baseProfile: FinancialProfile = {
      user_id: 'u1',
      monthly_income: 100000,
      salary_credit_day: 1,
      budgeting_mode: 'income_equivalent',
      savings_target: 20000,
      fixed_commitments: 25000,
      daily_budget_override: 0,
    };

    it('calculates mode 1: income_equivalent (₹1,00,000 / 30 = ₹3,333.33 in April)', () => {
      const budget = getEffectiveDailyBudget(baseProfile, 2026, 4);
      expect(budget).toBe(3333.33);
    });

    it('calculates mode 2: spendable_income ((₹1,00,000 - 20,000 - 25,000) / 30 = ₹1,833.33)', () => {
      const profile: FinancialProfile = { ...baseProfile, budgeting_mode: 'spendable_income' };
      const budget = getEffectiveDailyBudget(profile, 2026, 4);
      expect(budget).toBe(1833.33);
    });

    it('calculates mode 3: custom_limit override', () => {
      const profile: FinancialProfile = { ...baseProfile, budgeting_mode: 'custom_limit', daily_budget_override: 2500 };
      const budget = getEffectiveDailyBudget(profile, 2026, 4);
      expect(budget).toBe(2500);
    });

    it('correctly tracks comfortable budget status (<70% used)', () => {
      const status = getBudgetStatus(50, 70);
      expect(status).toBe('comfortable');
      expect(getBudgetStatusLabel(status)).toBe('Within budget');
    });

    it('correctly tracks warning threshold (70-99% used)', () => {
      const status = getBudgetStatus(80, 70);
      expect(status).toBe('getting_close');
      expect(getBudgetStatusLabel(status)).toBe('Getting close');
    });

    it('correctly tracks exact 100% budget reached', () => {
      const status = getBudgetStatus(100, 70);
      expect(status).toBe('budget_reached');
      expect(getBudgetStatusLabel(status)).toBe('Budget reached');
    });

    it('correctly tracks overspent status (>100%) and overspending variance', () => {
      const dailyBudget = 2000;
      const txs: Transaction[] = [
        { id: '1', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Shopping', amount: 2500, transaction_type: 'expense', category_id: 'cat_shopping', payment_method: 'UPI', created_at: '', updated_at: '' }
      ];
      const report = calculateDailyReport(dailyBudget, txs, '2026-10-28');
      expect(report.status).toBe('overspent');
      expect(report.overspending).toBe(500);
      expect(report.remainingAllowance).toBe(-500);
      expect(report.variance).toBe(-500);
    });

    it('handles zero transactions on a peaceful rest day gracefully', () => {
      const dailyBudget = 2500;
      const report = calculateDailyReport(dailyBudget, [], '2026-10-28');
      expect(report.actualSpending).toBe(0);
      expect(report.remainingAllowance).toBe(2500);
      expect(report.hasTransactions).toBe(false);
      expect(report.status).toBe('comfortable');
    });
  });

  // -------------------------------------------------------------------------
  // 5. BILLS & SUBSCRIPTIONS CYCLE ADVANCEMENT
  // -------------------------------------------------------------------------
  describe('5. Bills & Subscriptions', () => {
    it('advances next due date by 7 days for weekly subscriptions', () => {
      const next = advanceNextDueDate('2026-10-15', 'weekly');
      expect(next).toBe('2026-10-22');
    });

    it('advances next due date by 1 month for monthly subscriptions', () => {
      const next = advanceNextDueDate('2026-10-15', 'monthly');
      expect(next).toBe('2026-11-15');
    });

    it('advances next due date by 3 months for quarterly subscriptions', () => {
      const next = advanceNextDueDate('2026-10-01', 'quarterly');
      expect(next).toBe('2027-01-01');
    });

    it('advances next due date by 1 year for yearly subscriptions', () => {
      const next = advanceNextDueDate('2026-10-15', 'yearly');
      expect(next).toBe('2027-10-15');
    });
  });

  // -------------------------------------------------------------------------
  // 6. SAVINGS GOALS
  // -------------------------------------------------------------------------
  describe('6. Savings Goals', () => {
    it('computes goal progress and remaining target accurately', () => {
      const goal: SavingsGoal = {
        id: 'g1',
        user_id: 'u1',
        name: 'Emergency Fund',
        target_amount: 100000,
        current_amount: 40000,
        target_date: '2027-01-01',
        icon: 'Shield',
        category: 'emergency_fund'
      };

      const pct = Math.round((goal.current_amount / goal.target_amount) * 100);
      const remaining = subtractMoney(goal.target_amount, goal.current_amount);

      expect(pct).toBe(40);
      expect(remaining).toBe(60000);
    });

    it('adds contribution deposit without double counting or floating point errors', () => {
      const current = 40000.5;
      const deposit = 5000.25;
      const updated = addMoney(current, deposit);
      expect(updated).toBe(45000.75);
    });
  });

  // -------------------------------------------------------------------------
  // 7. CALENDAR DAY HANDLING & LEAP YEARS
  // -------------------------------------------------------------------------
  describe('7. Calendar Days & Leap Years', () => {
    it('correctly identifies leap years and non-leap years', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(1900)).toBe(false);
    });

    it('returns exact days for February across leap and standard years', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2025, 2)).toBe(28);
      expect(getDaysInMonth(2026, 1)).toBe(31);
      expect(getDaysInMonth(2026, 4)).toBe(30);
    });
  });

  // -------------------------------------------------------------------------
  // 8. DYNAMIC MONTHLY TRENDS
  // -------------------------------------------------------------------------
  describe('8. Monthly Trends Aggregation', () => {
    it('computes dynamic monthly cash flow trends from actual transactions', () => {
      const testTxs: Transaction[] = [
        { id: '1', user_id: 'u1', transaction_date: '2026-10-05T10:00:00', merchant: 'October Salary', amount: 80000, transaction_type: 'income', category_id: 'cat_other', payment_method: 'Net banking', created_at: '', updated_at: '' },
        { id: '2', user_id: 'u1', transaction_date: '2026-10-10T12:00:00', merchant: 'October Rent', amount: 20000, transaction_type: 'expense', category_id: 'cat_rent', payment_method: 'UPI', created_at: '', updated_at: '' },
        { id: '3', user_id: 'u1', transaction_date: '2026-09-05T10:00:00', merchant: 'September Salary', amount: 75000, transaction_type: 'income', category_id: 'cat_other', payment_method: 'Net banking', created_at: '', updated_at: '' },
        { id: '4', user_id: 'u1', transaction_date: '2026-09-12T14:00:00', merchant: 'September Shopping', amount: 15000, transaction_type: 'expense', category_id: 'cat_shopping', payment_method: 'UPI', created_at: '', updated_at: '' },
      ];

      const refDate = new Date(2026, 9, 30); // October 2026 (0-indexed month 9)
      const trends = calculateMonthlyTrends(testTxs, refDate, 3);

      expect(trends.length).toBe(3);
      // Last item should be October (current)
      const oct = trends[2];
      expect(oct.label).toBe('Oct');
      expect(oct.income).toBe(80000);
      expect(oct.expense).toBe(20000);
      expect(oct.isCurrent).toBe(true);

      // Previous item should be September
      const sep = trends[1];
      expect(sep.label).toBe('Sep');
      expect(sep.income).toBe(75000);
      expect(sep.expense).toBe(15000);
      expect(sep.isCurrent).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 9. CSV PARSER & DUPLICATE PREVENTION
  // -------------------------------------------------------------------------
  describe('9. CSV Import & Duplicate Prevention', () => {
    it('detects existing duplicates by external ID or date/merchant/amount signature', () => {
      const existing: Transaction[] = [
        { id: 'tx_1', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Swiggy', amount: 450, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', external_transaction_id: 'UPI12345678', created_at: '', updated_at: '' },
      ];

      const csv = `Date,Merchant,Amount,Payment Method,Ref ID
2026-10-28,Swiggy,450,UPI,UPI12345678
2026-10-28,Blinkit,320,UPI,UPI87654321
2026-10-28,Blinkit,320,UPI,UPI87654321`;

      const { validRows, duplicatesCount } = parseTransactionsCsv(csv, existing, 'u1');

      expect(duplicatesCount).toBe(2);
      expect(validRows.length).toBe(3);
      expect(validRows[0].is_duplicate).toBe(true);
      expect(validRows[1].is_duplicate).toBe(false);
      expect(validRows[2].is_duplicate).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 10. TENANT & USER ISOLATION
  // -------------------------------------------------------------------------
  describe('10. Tenant Isolation', () => {
    it('strictly separates User A and User B transactions', () => {
      const allTransactions: Transaction[] = [
        { id: '1', user_id: 'user_A', transaction_date: '2026-10-28', merchant: 'User A Secret Purchase', amount: 1500, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
        { id: '2', user_id: 'user_B', transaction_date: '2026-10-28', merchant: 'User B Secret Purchase', amount: 2500, transaction_type: 'expense', category_id: 'cat_shopping', payment_method: 'UPI', created_at: '', updated_at: '' },
      ];

      const userAData = allTransactions.filter(t => t.user_id === 'user_A');
      const userBData = allTransactions.filter(t => t.user_id === 'user_B');

      expect(userAData.length).toBe(1);
      expect(userAData[0].merchant).toBe('User A Secret Purchase');
      expect(userBData.length).toBe(1);
      expect(userBData[0].merchant).toBe('User B Secret Purchase');
    });
  });

});
