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
import { authService } from '../lib/authService';
import { store } from '../lib/storage';
import {
  calculateTotalSpending,
  calculateTotalIncome,
  calculateDailyReport,
  calculateEssentialDiscretionarySplit,
  compareMonthlySpending,
} from '../lib/calculations';
import { calculateMonthEndForecast } from '../lib/forecasting';
import { parseTransactionsJson } from '../lib/csvParser';
import { evaluateFinancialTriggers, getNotifications, clearAllNotifications } from '../lib/notifications';
import { auditLogger } from '../lib/auditLogger';

describe('PAISA Level 06 QA — End-to-End User Journeys & Feature Matrix Suite', () => {
  const E2E_USER_EMAIL = 'atharva.qa@paisa.money';
  const E2E_PASSWORD = 'PaisaSecure#2026';
  const E2E_DISPLAY_NAME = 'Atharva Naik';

  beforeEach(() => {
    localStorage.clear();
    auditLogger.clearLogs();
    clearAllNotifications();
  });

  // ============================================================================
  // 1. Complete 15-Step Continuous End-to-End User Journey
  // ============================================================================
  it('executes the full 15-step continuous financial lifecycle with complete state persistence', async () => {
    // -------------------------------------------------------------
    // STEP 1: User Registration
    // -------------------------------------------------------------
    const regResult = await authService.register({
      email: E2E_USER_EMAIL,
      password: E2E_PASSWORD,
      display_name: E2E_DISPLAY_NAME,
    });
    expect(regResult.success).toBe(true);
    expect(regResult.user).toBeDefined();
    const userId = regResult.user!.id;
    expect(userId).toMatch(/^usr_/);
    expect(regResult.user!.email).toBe(E2E_USER_EMAIL);

    // -------------------------------------------------------------
    // STEP 2: User Sign In
    // -------------------------------------------------------------
    authService.logout(); // Ensure clean session start
    expect(authService.getCurrentUser()).toBeNull();

    const loginResult = await authService.login({
      email: E2E_USER_EMAIL,
      password: E2E_PASSWORD,
    });
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.id).toBe(userId);
    expect(authService.getCurrentUser()?.id).toBe(userId);

    // Setup initial financial profile for this user
    store.updateProfile({
      user_id: userId,
      monthly_income: 80000,
      fixed_commitments: 25000,
      savings_target: 15000,
      salary_credit_day: 1,
      daily_budget_override: 0,
      budgeting_mode: 'spendable_income',
    });

    // -------------------------------------------------------------
    // STEP 3: Add Income (Salary)
    // -------------------------------------------------------------
    const salaryTx = store.addTransaction({
      user_id: userId,
      transaction_date: '2026-10-01',
      merchant: 'Tech Solutions India',
      description: 'Monthly Salary Credit',
      amount: 80000,
      transaction_type: 'income',
      category_id: 'cat_salary',
      payment_method: 'Net banking',
      is_unplanned: false,
    });
    expect(salaryTx.id).toBeDefined();
    expect(calculateTotalIncome(store.getTransactions(userId))).toBe(80000);

    // -------------------------------------------------------------
    // STEP 4: Add Expense (Groceries)
    // -------------------------------------------------------------
    const groceryTx = store.addTransaction({
      user_id: userId,
      transaction_date: '2026-10-05',
      merchant: 'Nature Basket',
      description: 'Weekly Organic Groceries',
      amount: 2450,
      transaction_type: 'expense',
      category_id: 'cat_groceries',
      payment_method: 'UPI',
      is_unplanned: false,
    });
    expect(groceryTx.id).toBeDefined();
    expect(calculateTotalSpending(store.getTransactions(userId))).toBe(2450);

    // -------------------------------------------------------------
    // STEP 5: Edit Transaction (Correct amount to ₹2,800)
    // -------------------------------------------------------------
    const updatedTx = store.updateTransaction(
      groceryTx.id,
      { amount: 2800, description: 'Weekly Groceries + Household items' },
      userId
    );
    expect(updatedTx).not.toBeNull();
    expect(updatedTx?.amount).toBe(2800);
    expect(calculateTotalSpending(store.getTransactions(userId))).toBe(2800);

    // -------------------------------------------------------------
    // STEP 6: Delete Transaction (Add extra coffee and delete it)
    // -------------------------------------------------------------
    const coffeeTx = store.addTransaction({
      user_id: userId,
      transaction_date: '2026-10-06',
      merchant: 'Blue Tokai Coffee',
      description: 'Cappuccino',
      amount: 260,
      transaction_type: 'expense',
      category_id: 'cat_food',
      payment_method: 'UPI',
      is_unplanned: true,
    });
    expect(store.getTransactions(userId).length).toBe(3); // Salary + Grocery + Coffee

    const deleteOk = store.deleteTransaction(coffeeTx.id, userId);
    expect(deleteOk).toBe(true);
    expect(store.getTransactions(userId).length).toBe(2);
    expect(calculateTotalSpending(store.getTransactions(userId))).toBe(2800);

    // -------------------------------------------------------------
    // STEP 7: Set a Budget (Food & Dining limit ₹12,000)
    // -------------------------------------------------------------
    store.updateCategoryBudget('cat_food', 12000);
    expect(store.getCategoryBudgets()['cat_food']).toBe(12000);

    // -------------------------------------------------------------
    // STEP 8: Check Remaining Budget & Daily Allowance
    // -------------------------------------------------------------
    const profile = store.getProfile();
    const todayStr = '2026-10-05';
    const dailyBudget = (80000 - 25000 - 15000) / 31; // 40,000 discretionary / 31 = ~1290.32
    const dailyReport = calculateDailyReport(
      dailyBudget,
      store.getTransactions(userId).filter(t => t.transaction_date === todayStr),
      todayStr,
      dailyBudget,
      'friendly'
    );
    expect(dailyReport.actualSpending).toBe(2800);
    expect(dailyReport.status).toBe('overspent'); // 2800 > 1290
    expect(dailyReport.overspending).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STEP 9: Create a Savings Goal (Emergency Fund)
    // -------------------------------------------------------------
    const goal = store.addSavingsGoal({
      user_id: userId,
      name: 'Emergency Fund',
      target_amount: 100000,
      current_amount: 25000,
      target_date: '2027-06-30',
      icon: 'ShieldCheck',
      category: 'emergency_fund',
    }, userId);
    expect(goal.id).toBeDefined();

    const userGoals = store.getSavingsGoals(userId);
    expect(userGoals.some(g => g.name === 'Emergency Fund')).toBe(true);

    // -------------------------------------------------------------
    // STEP 10: Add a Recurring Bill (JioFiber due in 2 days)
    // -------------------------------------------------------------
    const bill = store.addRecurringPayment({
      user_id: userId,
      name: 'JioFiber Broadband',
      amount: 1179,
      category_id: 'cat_bills',
      frequency: 'monthly',
      next_due_date: '2026-10-31',
      is_active: true,
      auto_record: false,
    }, userId);
    expect(bill.id).toBeDefined();
    expect(store.getRecurringPayments(userId).length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STEP 11: Import a Bank Statement (JSON format)
    // -------------------------------------------------------------
    const statementJson = JSON.stringify([
      {
        date: '2026-10-10',
        merchant: 'Swiggy',
        description: 'Dinner delivery',
        amount: 540,
        type: 'expense',
        payment_method: 'UPI',
        external_transaction_id: 'STMT-SWIG-01',
      },
      {
        date: '2026-10-12',
        merchant: 'Uber India',
        description: 'Airport ride',
        amount: 850,
        type: 'expense',
        payment_method: 'UPI',
        external_transaction_id: 'STMT-UBER-02',
      },
    ]);

    const parsedStmt = parseTransactionsJson(statementJson, store.getTransactions(userId), userId);
    expect(parsedStmt.errors.length).toBe(0);
    expect(parsedStmt.validRows.length).toBe(2);

    const importTxCount = store.addTransactionsBulk(
      parsedStmt.validRows.map(r => ({
        user_id: userId,
        transaction_date: r.date,
        merchant: r.merchant,
        description: r.description,
        amount: r.amount,
        transaction_type: r.type,
        category_id: r.category_id,
        payment_method: r.payment_method,
        external_transaction_id: r.external_transaction_id,
      }))
    );
    expect(importTxCount).toBe(2);
    expect(store.getTransactions(userId).length).toBe(4); // Salary + Grocery + 2 Imported

    // -------------------------------------------------------------
    // STEP 12: Review Analytics (Essential vs Discretionary & MoM)
    // -------------------------------------------------------------
    const allTxs = store.getTransactions(userId);
    const split = calculateEssentialDiscretionarySplit(allTxs);
    expect(split.totalSpending).toBe(2800 + 540 + 850); // 4190
    expect(split.essentialTotal).toBe(2800); // Groceries
    expect(split.discretionaryTotal).toBe(1390); // Swiggy (food) + Uber (transport)

    const momComparison = compareMonthlySpending(allTxs, '2026-10');
    expect(momComparison.currentSpending).toBe(4190);

    // -------------------------------------------------------------
    // STEP 13: Review AI Insights & Spending Forecast
    // -------------------------------------------------------------
    const forecast = calculateMonthEndForecast({
      transactions: allTxs,
      recurringPayments: store.getRecurringPayments(userId),
      profile,
      categoryBudgets: store.getCategoryBudgets(),
      currentDate: new Date('2026-10-15T12:00:00Z'),
    });
    expect(forecast.actualSpentMtd).toBe(4190);
    expect(forecast.pendingRecurringTotal).toBe(1179);
    expect(forecast.projectedMonthEndSpent).toBeGreaterThan(4190);

    // -------------------------------------------------------------
    // STEP 14: Sign Out
    // -------------------------------------------------------------
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.getCurrentSession()).toBeNull();

    // -------------------------------------------------------------
    // STEP 15: Sign Back In & Verify Complete Data Integrity
    // -------------------------------------------------------------
    const reLogin = await authService.login({
      email: E2E_USER_EMAIL,
      password: E2E_PASSWORD,
    });
    expect(reLogin.success).toBe(true);
    expect(reLogin.user?.id).toBe(userId);

    // Verify all persisted data for this user
    const reloadedTxs = store.getTransactions(userId);
    expect(reloadedTxs.length).toBe(4);
    expect(calculateTotalSpending(reloadedTxs)).toBe(4190);
    expect(calculateTotalIncome(reloadedTxs)).toBe(80000);

    const reloadedGoals = store.getSavingsGoals(userId);
    expect(reloadedGoals.some(g => g.name === 'Emergency Fund')).toBe(true);

    const reloadedBills = store.getRecurringPayments(userId);
    expect(reloadedBills.some(b => b.name === 'JioFiber Broadband')).toBe(true);

    const reloadedBudgets = store.getCategoryBudgets();
    expect(reloadedBudgets['cat_food']).toBe(12000);
  });

  // ============================================================================
  // 2. Negative Paths, Authentication Guards & Error Recovery
  // ============================================================================
  describe('2. Negative Paths & Authentication Hardening', () => {
    it('rejects passwords below OWASP ASVS complexity requirements', async () => {
      // Missing uppercase, special char, and under 8 chars
      const weak = await authService.register({
        email: 'weak.user@paisa.money',
        password: 'password123',
        display_name: 'Weak Password User',
      });
      expect(weak.success).toBe(false);
      expect(weak.error).toContain('uppercase');
    });

    it('rejects duplicate registration attempts for the same email', async () => {
      await authService.register({
        email: 'duplicate@paisa.money',
        password: 'Password@2026',
        display_name: 'First User',
      });

      const dup = await authService.register({
        email: 'duplicate@paisa.money',
        password: 'AnotherPassword@2026',
        display_name: 'Second User',
      });
      expect(dup.success).toBe(false);
      expect(dup.error).toContain('already exists');
    });

    it('enforces brute-force lockout after 5 consecutive failed login attempts', async () => {
      const email = 'lockout.target@paisa.money';
      await authService.register({
        email,
        password: 'CorrectPassword#2026',
        display_name: 'Lockout Target',
      });
      authService.logout();

      // Attempt 1 to 5 with wrong password
      for (let i = 1; i <= 5; i++) {
        const res = await authService.login({ email, password: 'WrongPassword' });
        expect(res.success).toBe(false);
      }

      // 6th attempt must be locked out immediately without checking hash
      const lockedRes = await authService.login({ email, password: 'CorrectPassword#2026' });
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.error).toContain('temporarily locked');

      // Verify audit logger recorded the lockout
      const logs = auditLogger.getLogs();
      expect(logs.some(l => l.eventType === 'RATE_LIMIT_LOCKOUT')).toBe(true);
    });

    it('blocks cross-tenant data modification and records security violations', () => {
      const userA = 'usr_tenant_alice';
      const userB = 'usr_tenant_bob';

      const txA = store.addTransaction({
        user_id: userA,
        transaction_date: '2026-10-15',
        merchant: 'Alice Private Store',
        amount: 500,
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
      });

      // User B tries to maliciously edit User A's transaction
      const blockedUpdate = store.updateTransaction(txA.id, { amount: 10000 }, userB);
      expect(blockedUpdate).toBeNull();
      expect(store.getTransactions(userA)[0].amount).toBe(500); // Untouched

      // User B tries to maliciously delete User A's transaction
      const blockedDelete = store.deleteTransaction(txA.id, userB);
      expect(blockedDelete).toBe(false);
      expect(store.getTransactions(userA).length).toBe(1); // Still exists

      // Verify security audit logger recorded both violations
      const violationLogs = auditLogger.getLogs().filter(l => l.eventType === 'CROSS_TENANT_VIOLATION_ATTEMPT');
      expect(violationLogs.length).toBe(2);
    });
  });
});
