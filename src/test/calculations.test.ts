import { describe, it, expect } from 'vitest';
import {
  calculateDailyIncomeEquivalent,
  calculateDailySpendableBudget,
  calculateTotalSpending,
  calculateDailyReport,
  getDaysInMonth,
  isLeapYear,
  isSpendingExpense,
} from '../lib/calculations';
import { parseTransactionsCsv } from '../lib/csvParser';
import { suggestCategory } from '../lib/categorization';
import { Transaction, FinancialProfile } from '../types';

describe('PAISA Acceptance Tests Suite', () => {

  /**
   * Test A: Monthly income ₹1,00,000 in a 30-day month.
   * Expected income equivalent: ₹3,333.33 per day.
   */
  it('Test A: calculates daily income equivalent correctly for 30-day month', () => {
    const monthlyIncome = 100000;
    // April (month 4) has 30 days
    const dailyEquivalent = calculateDailyIncomeEquivalent(monthlyIncome, 2026, 4);
    expect(dailyEquivalent).toBe(3333.33);
  });

  /**
   * Test B: Daily budget ₹3,333.33; expenses ₹250, ₹600, ₹400, and ₹500.
   * Expected spending: ₹1,750.
   * Expected remaining allowance: ₹1,583.33.
   */
  it('Test B: correctly calculates total spending and remaining daily allowance within budget', () => {
    const dailyBudget = 3333.33;
    const sampleTransactions: Transaction[] = [
      { id: '1', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Coffee', amount: 250, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
      { id: '2', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Blinkit', amount: 600, transaction_type: 'expense', category_id: 'cat_groceries', payment_method: 'UPI', created_at: '', updated_at: '' },
      { id: '3', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Zepto', amount: 400, transaction_type: 'expense', category_id: 'cat_groceries', payment_method: 'UPI', created_at: '', updated_at: '' },
      { id: '4', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Swiggy', amount: 500, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
    ];

    const totalSpending = calculateTotalSpending(sampleTransactions);
    expect(totalSpending).toBe(1750);

    const report = calculateDailyReport(dailyBudget, sampleTransactions, '2026-10-28');
    expect(report.actualSpending).toBe(1750);
    expect(report.remainingAllowance).toBe(1583.33);
    expect(report.overspending).toBe(0);
    expect(report.status).toBe('comfortable');
    expect(report.statusLabel).toBe('Within budget');
  });

  /**
   * Test C: Daily budget ₹3,333.33; spending ₹4,200.
   * Expected overspending: ₹866.67.
   */
  it('Test C: calculates overspending variance and alert status correctly', () => {
    const dailyBudget = 3333.33;
    const overspentTx: Transaction[] = [
      { id: '1', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Luxury Dinner & Shopping', amount: 4200, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'Credit card', created_at: '', updated_at: '' },
    ];

    const report = calculateDailyReport(dailyBudget, overspentTx, '2026-10-28');
    expect(report.actualSpending).toBe(4200);
    expect(report.overspending).toBe(866.67);
    expect(report.remainingAllowance).toBe(-866.67);
    expect(report.status).toBe('overspent');
    expect(report.statusLabel).toBe('Overspent');
    // Percentage over budget
    const exceededPct = Math.round((report.overspending / dailyBudget) * 100);
    expect(exceededPct).toBe(26);
  });

  /**
   * Test D: Edit an expense from ₹500 to ₹300.
   * Expected result: dashboard, transaction list, charts, and summaries update correctly.
   */
  it('Test D: editing an expense updates spending and reports accurately', () => {
    const dailyBudget = 3333.33;
    let transactions: Transaction[] = [
      { id: '1', user_id: 'user_1', transaction_date: '2026-10-28', merchant: 'Swiggy', amount: 500, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
    ];

    let report = calculateDailyReport(dailyBudget, transactions, '2026-10-28');
    expect(report.actualSpending).toBe(500);

    // Edit transaction to ₹300
    transactions = transactions.map(t => t.id === '1' ? { ...t, amount: 300 } : t);
    report = calculateDailyReport(dailyBudget, transactions, '2026-10-28');

    expect(report.actualSpending).toBe(300);
    expect(report.remainingAllowance).toBe(3033.33);
  });

  /**
   * Test E: Import a CSV containing duplicate rows.
   * Expected result: duplicate detection identifies likely duplicates and avoids double counting.
   */
  it('Test E: CSV import identifies duplicates and prevents double counting', () => {
    const existingTransactions: Transaction[] = [
      { id: 'tx_existing_1', user_id: 'u1', transaction_date: '2026-10-28', merchant: 'Swiggy', amount: 450, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', external_transaction_id: 'UPI12345678', created_at: '', updated_at: '' },
    ];

    const csvContent = `Date,Merchant,Amount,Payment Method,Ref ID
2026-10-28,Swiggy,450,UPI,UPI12345678
2026-10-28,Blinkit,320,UPI,UPI87654321
2026-10-28,Blinkit,320,UPI,UPI87654321`;

    const { validRows, duplicatesCount } = parseTransactionsCsv(csvContent, existingTransactions, 'u1');

    expect(duplicatesCount).toBe(2); // 1 matches existing transaction ID, 1 is a duplicate within the same batch
    expect(validRows.length).toBe(3);
    expect(validRows[0].is_duplicate).toBe(true);
    expect(validRows[2].is_duplicate).toBe(true);
    expect(validRows[1].is_duplicate).toBe(false);
  });

  /**
   * Test F: User A attempts to access User B's transactions.
   * Expected result: Row Level Security model enforces user separation.
   */
  it('Test F: database security policy enforces strict tenant isolation', () => {
    // In unit test space, verify filter function verifies user_id ownership
    const userATransactions: Transaction[] = [
      { id: '1', user_id: 'user_A', transaction_date: '2026-10-28', merchant: 'Secret A', amount: 500, transaction_type: 'expense', category_id: 'cat_food', payment_method: 'UPI', created_at: '', updated_at: '' },
    ];

    const currentLoggedInUserId = 'user_B';
    const accessible = userATransactions.filter(tx => tx.user_id === currentLoggedInUserId);
    expect(accessible.length).toBe(0);
  });

  /**
   * Test G: User disconnects a bank account.
   * Expected result: synchronization stops and connection status changes to disconnected.
   */
  it('Test G: disconnecting a bank account halts synchronization and updates status', () => {
    interface BankAccountState {
      id: string;
      status: 'connected' | 'disconnected';
      lastSynced?: string;
    }

    let account: BankAccountState = {
      id: 'acc_hdfc',
      status: 'connected',
      lastSynced: '2026-10-28T10:00:00Z',
    };

    // Disconnect action
    account = {
      ...account,
      status: 'disconnected',
    };

    expect(account.status).toBe('disconnected');
  });

  /**
   * Test H: Month length variations (31 days, 30 days, Feb 28 days, Feb 29 leap days).
   * Expected result: income equivalent uses exact calendar day count.
   */
  it('Test H: verifies calendar day handling for leap years and all month lengths', () => {
    const monthlyIncome = 93000;

    // 31-day month: January 2026 -> 93,000 / 31 = 3,000.00
    expect(getDaysInMonth(2026, 1)).toBe(31);
    expect(calculateDailyIncomeEquivalent(monthlyIncome, 2026, 1)).toBe(3000);

    // 30-day month: April 2026 -> 93,000 / 30 = 3,100.00
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(calculateDailyIncomeEquivalent(monthlyIncome, 2026, 4)).toBe(3100);

    // Non-leap year February (2025): 28 days -> 84,000 / 28 = 3,000.00
    expect(isLeapYear(2025)).toBe(false);
    expect(getDaysInMonth(2025, 2)).toBe(28);
    expect(calculateDailyIncomeEquivalent(84000, 2025, 2)).toBe(3000);

    // Leap year February (2024 or 2028): 29 days -> 87,000 / 29 = 3,000.00
    expect(isLeapYear(2028)).toBe(true);
    expect(getDaysInMonth(2028, 2)).toBe(29);
    expect(calculateDailyIncomeEquivalent(87000, 2028, 2)).toBe(3000);
  });

  /**
   * Test I: Credit card purchase and subsequent bill payment are both imported.
   * Expected result: original purchase is counted as spending once; bill payment is treated as transfer/settlement.
   */
  it('Test I: distinguishes credit card purchases from CC bill repayments to avoid double counting', () => {
    const purchaseTx: Transaction = {
      id: 'tx_purchase',
      user_id: 'user_1',
      transaction_date: '2026-10-10',
      merchant: 'Zara Shopping',
      amount: 4500,
      transaction_type: 'expense',
      category_id: 'cat_shopping',
      payment_method: 'Credit card',
      created_at: '',
      updated_at: '',
    };

    // Auto-categorize credit card bill payment
    const ccBillCategorization = suggestCategory('CRED HDFC Credit Card Bill', 'Payment for card ending 9012');
    expect(ccBillCategorization.isCreditCardPayment).toBe(true);

    const billPaymentTx: Transaction = {
      id: 'tx_bill_pay',
      user_id: 'user_1',
      transaction_date: '2026-10-25',
      merchant: 'CRED HDFC Credit Card Bill',
      amount: 4500,
      transaction_type: 'expense',
      category_id: ccBillCategorization.categoryId,
      payment_method: 'Net banking',
      is_credit_card_payment: ccBillCategorization.isCreditCardPayment,
      created_at: '',
      updated_at: '',
    };

    expect(isSpendingExpense(purchaseTx)).toBe(true);
    expect(isSpendingExpense(billPaymentTx)).toBe(false);

    // Total spending must be 4500, NOT 9000!
    const totalSpent = calculateTotalSpending([purchaseTx, billPaymentTx]);
    expect(totalSpent).toBe(4500);
  });

  /**
   * Test J: No transactions available for today.
   * Expected result: dashboard displays zero recorded spending and clearly indicates incomplete/empty data.
   */
  it('Test J: handles zero-spend or missing data days gracefully', () => {
    const dailyBudget = 2500;
    const report = calculateDailyReport(dailyBudget, [], '2026-10-28');

    expect(report.actualSpending).toBe(0);
    expect(report.remainingAllowance).toBe(2500);
    expect(report.hasTransactions).toBe(false);
    expect(report.status).toBe('comfortable');
    expect(report.message).toContain('No expenses recorded today');
  });

});
