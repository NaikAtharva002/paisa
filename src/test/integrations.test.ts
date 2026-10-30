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
  simulateAaConsentFlow,
  isConsentExpired,
  syncAccountFeed,
  disconnectAccountIntegration,
  SUPPORTED_INDIAN_BANKS,
  ACCOUNT_AGGREGATORS,
} from '../lib/bankAdapter';
import {
  parseTransactionsJson,
  parseStatementFile,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROWS,
  parseTransactionsCsv,
} from '../lib/csvParser';
import {
  getNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  isWithinQuietHours,
  evaluateFinancialTriggers,
} from '../lib/notifications';
import { store } from '../lib/storage';
import { auditLogger } from '../lib/auditLogger';
import { Account, BankConsent, FinancialProfile, NotificationPreference, RecurringPayment, Transaction } from '../types';

describe('PAISA Level 05 Integration Suite: Bank Data, Statement Imports & Notifications', () => {
  const TEST_USER_A = 'usr_test_user_a';
  const TEST_USER_B = 'usr_test_user_b';

  beforeEach(() => {
    localStorage.clear();
    auditLogger.clearLogs();
    clearAllNotifications();
  });

  // ============================================================================
  // 1. Bank Data Integration & Consent Lifecycle (RBI AA / Sahamati Protocol)
  // ============================================================================
  describe('1. Bank Data Integration & RBI AA Consent Lifecycle', () => {
    it('should list official RBI licensed Account Aggregators and supported Indian banks', () => {
      expect(ACCOUNT_AGGREGATORS.length).toBeGreaterThanOrEqual(4);
      expect(ACCOUNT_AGGREGATORS.some(aa => aa.name.includes('Setu'))).toBe(true);
      expect(ACCOUNT_AGGREGATORS.some(aa => aa.name.includes('Finvu'))).toBe(true);

      expect(SUPPORTED_INDIAN_BANKS.length).toBeGreaterThanOrEqual(5);
      expect(SUPPORTED_INDIAN_BANKS.some(b => b.name === 'HDFC Bank')).toBe(true);
      expect(SUPPORTED_INDIAN_BANKS.some(b => b.name === 'State Bank of India')).toBe(true);
    });

    it('should simulate an RBI AA consent request and return an active consent structure', async () => {
      const consentResult = await simulateAaConsentFlow({
        userId: TEST_USER_A,
        provider: 'Setu AA',
        dataRangeMonths: 12,
        consentDurationYears: 1,
        selectedFips: ['HDFC'],
      });

      expect(consentResult.status).toBe('ACTIVE');
      expect(consentResult.consentId).toMatch(/^SETU-AA-/);
      expect(consentResult.accountsDiscovered.length).toBeGreaterThan(0);
      expect(consentResult.accountsDiscovered[0].fipName).toBe('HDFC Bank');
    });

    it('should accurately determine whether a consent artifact is active or expired', () => {
      const activeConsent: BankConsent = {
        id: 'consent_active_01',
        user_id: TEST_USER_A,
        provider: 'Setu AA',
        consent_reference: 'ref_123',
        consent_handle: 'handle_123',
        status: 'ACTIVE',
        data_range_from: '2025-01-01',
        data_range_to: '2026-10-31',
        accounts_linked: ['HDFC Bank'],
        created_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days in future
      };

      const pastExpiryConsent: BankConsent = {
        id: 'consent_expired_01',
        user_id: TEST_USER_A,
        provider: 'Setu AA',
        consent_reference: 'ref_exp_123',
        consent_handle: 'handle_123',
        status: 'ACTIVE',
        data_range_from: '2025-01-01',
        data_range_to: '2026-10-31',
        accounts_linked: ['HDFC Bank'],
        created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
        expiry_date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days in past
      };

      const revokedConsent: BankConsent = {
        ...activeConsent,
        id: 'consent_revoked_01',
        status: 'REVOKED',
      };

      expect(isConsentExpired(activeConsent)).toBe(false);
      expect(isConsentExpired(pastExpiryConsent)).toBe(true);
      expect(isConsentExpired(revokedConsent)).toBe(true);
    });

    it('should isolate bank consents between tenants and enforce permission check on revocation', () => {
      const consentA: BankConsent = {
        id: 'consent_tenant_a',
        user_id: TEST_USER_A,
        provider: 'Setu AA',
        consent_reference: 'ref_tenant_a',
        consent_handle: 'handle_a',
        status: 'ACTIVE',
        data_range_from: '2025-01-01',
        data_range_to: '2026-10-31',
        accounts_linked: ['HDFC Bank'],
        created_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      };

      store.addBankConsent(consentA);

      // Verify User A sees it
      const userAConsents = store.getBankConsents(TEST_USER_A);
      expect(userAConsents.some(c => c.id === 'consent_tenant_a')).toBe(true);

      // Verify User B cannot see it
      const userBConsents = store.getBankConsents(TEST_USER_B);
      expect(userBConsents.some(c => c.id === 'consent_tenant_a')).toBe(false);

      // User B cannot revoke User A's consent
      const revokeByB = store.revokeBankConsent('consent_tenant_a', TEST_USER_B);
      expect(revokeByB).toBe(false);
      expect(store.getBankConsents(TEST_USER_A)[0].status).toBe('ACTIVE');

      // User A can revoke their own consent
      const revokeByA = store.revokeBankConsent('consent_tenant_a', TEST_USER_A);
      expect(revokeByA).toBe(true);
      expect(store.getBankConsents(TEST_USER_A)[0].status).toBe('REVOKED');
    });
  });

  // ============================================================================
  // 2. Account Synchronization Engine & Idempotency
  // ============================================================================
  describe('2. Account Synchronization Engine & Incremental Deduplication', () => {
    let testAccount: Account;

    beforeEach(() => {
      testAccount = store.addAccount(
        {
          account_name: 'HDFC Salary Account',
          account_type: 'savings',
          balance: 50000,
          is_demo: false,
          provider: 'HDFC Bank',
          connection_status: 'connected',
        },
        TEST_USER_A
      );

      // Active consent for HDFC Bank
      store.addBankConsent({
        id: 'hdfc_consent_valid',
        user_id: TEST_USER_A,
        provider: 'Setu AA',
        consent_reference: 'ref_hdfc_valid',
        consent_handle: 'h_hdfc',
        status: 'ACTIVE',
        data_range_from: '2025-01-01',
        data_range_to: '2026-10-31',
        accounts_linked: ['HDFC Bank'],
        created_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 86400000 * 365).toISOString(),
      });
    });

    it('should successfully sync new feed items and update account balance', async () => {
      const result = await syncAccountFeed(testAccount.id, TEST_USER_A);

      expect(result.success).toBe(true);
      expect(result.newTransactionsCount).toBeGreaterThan(0);
      expect(result.updatedBalance).toBeLessThanOrEqual(50000);

      // Transactions are stored in user ledger
      const txs = store.getTransactions(TEST_USER_A);
      expect(txs.length).toBe(result.newTransactionsCount);
      expect(txs[0].notes).toContain('Account Aggregator');

      // Notification is dispatched
      const notifs = getNotifications();
      expect(notifs.some(n => n.title.includes('HDFC Bank Synchronized'))).toBe(true);
    });

    it('should skip duplicate transactions on subsequent synchronizations (idempotency)', async () => {
      const firstSync = await syncAccountFeed(testAccount.id, TEST_USER_A);
      expect(firstSync.success).toBe(true);
      const initialTxCount = store.getTransactions(TEST_USER_A).length;

      // Seed same transactions into existing ledger and simulate second sync
      const secondSync = await syncAccountFeed(testAccount.id, TEST_USER_A);
      expect(secondSync.success).toBe(true);
      expect(secondSync.duplicatesSkippedCount).toBeGreaterThan(0);

      const postTxCount = store.getTransactions(TEST_USER_A).length;
      expect(postTxCount).toBe(initialTxCount); // No duplicate explosion
    });

    it('should reject synchronization if consent is expired and notify the user', async () => {
      // Revoke valid consent first
      store.revokeBankConsent('hdfc_consent_valid', TEST_USER_A);

      // Add expired consent
      store.addBankConsent({
        id: 'hdfc_expired_consent',
        user_id: TEST_USER_A,
        provider: 'Setu AA',
        consent_reference: 'ref_expired',
        consent_handle: 'h_expired',
        status: 'EXPIRED',
        data_range_from: '2025-01-01',
        data_range_to: '2026-10-31',
        accounts_linked: ['HDFC Bank'],
        created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
        expiry_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      });

      const res = await syncAccountFeed(testAccount.id, TEST_USER_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('consent has expired');

      const notifs = getNotifications();
      expect(notifs.some(n => n.title.includes('Consent Expired'))).toBe(true);
    });

    it('should gracefully reject sync if account is disconnected', async () => {
      store.updateAccount(testAccount.id, { connection_status: 'disconnected' }, TEST_USER_A);

      const res = await syncAccountFeed(testAccount.id, TEST_USER_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('disconnected');
    });
  });

  // ============================================================================
  // 3. Integration Management & Safe Disconnection
  // ============================================================================
  describe('3. Integration Management & Safe Disconnection', () => {
    it('should disconnect an account while preserving all existing transactions', () => {
      const account = store.addAccount(
        {
          account_name: 'ICICI Savings',
          account_type: 'savings',
          balance: 20000,
          is_demo: false,
          provider: 'ICICI Bank',
          connection_status: 'connected',
        },
        TEST_USER_A
      );

      // Seed transactions
      store.addTransaction({
        user_id: TEST_USER_A,
        account_id: account.id,
        transaction_date: '2026-10-30',
        merchant: 'BookMyShow',
        description: 'Movie tickets',
        amount: 850,
        transaction_type: 'expense',
        category_id: 'cat_entertainment',
        payment_method: 'UPI',
        is_unplanned: false,
      });

      expect(store.getTransactions(TEST_USER_A).length).toBe(1);

      // Disconnect account
      const disconnected = disconnectAccountIntegration(account.id, TEST_USER_A);
      expect(disconnected).toBe(true);

      const updatedAccount = store.getAccounts(TEST_USER_A).find(a => a.id === account.id);
      expect(updatedAccount?.connection_status).toBe('disconnected');

      // Transactions remain intact
      expect(store.getTransactions(TEST_USER_A).length).toBe(1);

      // Audit logged
      const logs = auditLogger.getLogs();
      expect(logs.some(l => l.eventType === 'AUTH_LOGOUT' && l.details.includes('Disconnected integration'))).toBe(true);
    });
  });

  // ============================================================================
  // 4. Statement Imports (CSV & JSON) and Safeguards
  // ============================================================================
  describe('4. Statement Imports (CSV & JSON) and Validation', () => {
    it('should enforce file size and row limits', () => {
      expect(MAX_IMPORT_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024); // 5 MB
      expect(MAX_IMPORT_ROWS).toBe(5000);
    });

    it('should parse valid JSON bank statements into typed transactions', () => {
      const jsonContent = JSON.stringify([
        {
          date: '2026-10-25',
          merchant: 'Swiggy',
          description: 'Food delivery dinner',
          amount: 450,
          type: 'expense',
          payment_method: 'UPI',
          external_transaction_id: 'SWIGGY-1025-A',
        },
        {
          date: '2026-10-26',
          merchant: 'Employer Corp',
          description: 'Monthly Salary',
          amount: 75000,
          type: 'income',
          payment_method: 'Net banking',
          external_transaction_id: 'SAL-1026-B',
        },
      ]);

      const result = parseTransactionsJson(jsonContent, [], TEST_USER_A);
      expect(result.errors.length).toBe(0);
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].merchant).toBe('Swiggy');
      expect(result.validRows[0].amount).toBe(450);
      expect(result.validRows[0].category_id).toBe('cat_food');
      expect(result.validRows[1].type).toBe('income');
      expect(result.validRows[1].amount).toBe(75000);
    });

    it('should support object wrapped JSON with a transactions key', () => {
      const wrappedJson = JSON.stringify({
        account: 'HDFC Bank ••4921',
        transactions: [
          {
            date: '2026-10-27',
            merchant: 'Blinkit',
            amount: '620.50',
            ref: 'BLK-9988',
          },
        ],
      });

      const result = parseTransactionsJson(wrappedJson, [], TEST_USER_A);
      expect(result.validRows.length).toBe(1);
      expect(result.validRows[0].merchant).toBe('Blinkit');
      expect(result.validRows[0].amount).toBe(620.5);
      expect(result.validRows[0].category_id).toBe('cat_groceries');
    });

    it('should handle corrupt or invalid JSON gracefully without throwing', () => {
      const corruptJson = '{"transactions": [ broken json syntax';
      const result = parseTransactionsJson(corruptJson, [], TEST_USER_A);
      expect(result.validRows.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid JSON format');
    });

    it('should detect duplicate rows matching existing transactions by external ID or tuple', () => {
      const existing: Transaction[] = [
        {
          id: 'tx_existing_01',
          user_id: TEST_USER_A,
          account_id: 'acc_01',
          transaction_date: '2026-10-25',
          merchant: 'Uber India',
          description: 'Cab ride to office',
          amount: 320,
          transaction_type: 'expense',
          category_id: 'cat_transport',
          payment_method: 'UPI',
          external_transaction_id: 'UBER-REF-889',
          is_unplanned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const csvData = [
        'Date,Merchant,Amount,Payment Method,Reference ID',
        '2026-10-25,Uber India,320,UPI,UBER-REF-889', // Duplicate by external ID
        '2026-10-26,Zomato,250,UPI,ZOMATO-REF-111', // New
      ].join('\n');

      const parsed = parseTransactionsCsv(csvData, existing, TEST_USER_A);
      expect(parsed.validRows.length).toBe(2);
      expect(parsed.duplicatesCount).toBe(1);
      expect(parsed.validRows[0].is_duplicate).toBe(true);
      expect(parsed.validRows[1].is_duplicate).toBe(false);
    });

    it('should route CSV and JSON through universal parseStatementFile', () => {
      const csvData = 'Date,Merchant,Amount\n2026-10-28,Café Coffee Day,180';
      const csvResult = parseStatementFile(csvData, 'csv', [], TEST_USER_A);
      expect(csvResult.validRows.length).toBe(1);
      expect(csvResult.validRows[0].merchant).toBe('Café Coffee Day');

      const jsonData = JSON.stringify([{ date: '2026-10-28', merchant: 'Blue Tokai', amount: 220 }]);
      const jsonResult = parseStatementFile(jsonData, 'json', [], TEST_USER_A);
      expect(jsonResult.validRows.length).toBe(1);
      expect(jsonResult.validRows[0].merchant).toBe('Blue Tokai');
    });
  });

  // ============================================================================
  // 5. Import History & Atomic Rollback
  // ============================================================================
  describe('5. Import History & Atomic Rollback', () => {
    it('should record an import batch and support atomic rollback of all batch transactions', () => {
      // 1. Create 3 transactions to import
      const tx1 = store.addTransaction({
        user_id: TEST_USER_A,
        account_id: 'acc_salary',
        transaction_date: '2026-10-20',
        merchant: 'Store A',
        description: 'Groceries',
        amount: 1200,
        transaction_type: 'expense',
        category_id: 'cat_groceries',
        payment_method: 'UPI',
        is_unplanned: false,
      });

      const tx2 = store.addTransaction({
        user_id: TEST_USER_A,
        account_id: 'acc_salary',
        transaction_date: '2026-10-21',
        merchant: 'Store B',
        description: 'Fuel',
        amount: 800,
        transaction_type: 'expense',
        category_id: 'cat_transport',
        payment_method: 'UPI',
        is_unplanned: false,
      });

      // 2. Pre-existing unrelated transaction
      const preExistingTx = store.addTransaction({
        user_id: TEST_USER_A,
        account_id: 'acc_salary',
        transaction_date: '2026-10-01',
        merchant: 'Pre-existing Rent',
        description: 'House rent',
        amount: 25000,
        transaction_type: 'expense',
        category_id: 'cat_bills',
        payment_method: 'Net banking',
        is_unplanned: false,
      });

      expect(store.getTransactions(TEST_USER_A).length).toBe(3);

      // 3. Record import record
      const importRecord = store.recordImport(
        {
          user_id: TEST_USER_A,
          file_name: 'hdfc_oct_statement.csv',
          file_format: 'csv',
          total_detected: 2,
          imported_count: 2,
          duplicates_skipped: 0,
          failed_count: 0,
          transaction_ids: [tx1.id, tx2.id],
        },
        TEST_USER_A
      );

      const history = store.getImportHistory(TEST_USER_A);
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(importRecord.id);

      // 4. Atomic Rollback
      const rollbackOk = store.rollbackImport(importRecord.id, TEST_USER_A);
      expect(rollbackOk).toBe(true);

      // Imported transactions must be deleted
      const remainingTxs = store.getTransactions(TEST_USER_A);
      expect(remainingTxs.length).toBe(1);
      expect(remainingTxs[0].id).toBe(preExistingTx.id);

      // Import record itself must be deleted from history
      expect(store.getImportHistory(TEST_USER_A).length).toBe(0);

      // Audit logged
      const logs = auditLogger.getLogs();
      expect(logs.some(l => l.eventType === 'DATA_RESET' && l.details.includes('Rolled back import'))).toBe(true);
    });
  });

  // ============================================================================
  // 6. In-App Notifications & Real-Time Financial Triggers
  // ============================================================================
  describe('6. In-App Notifications & Financial Triggers', () => {
    it('should perform CRUD operations on in-app notifications', () => {
      const notif1 = addNotification({
        title: 'Welcome to Paisa',
        body: 'Your intelligent financial co-pilot is ready.',
        type: 'system',
      });

      const notif2 = addNotification({
        title: 'Weekly Summary',
        body: 'You saved ₹3,400 this week.',
        type: 'morning',
      });

      expect(notif1).not.toBeNull();
      expect(notif2).not.toBeNull();

      let list = getNotifications();
      expect(list.length).toBe(2);
      expect(list[0].read).toBe(false);

      // Mark single read
      markNotificationAsRead(notif1!.id);
      list = getNotifications();
      expect(list.find(n => n.id === notif1!.id)?.read).toBe(true);
      expect(list.find(n => n.id === notif2!.id)?.read).toBe(false);

      // Mark all read
      markAllNotificationsAsRead();
      list = getNotifications();
      expect(list.every(n => n.read)).toBe(true);

      // Delete one
      deleteNotification(notif1!.id);
      list = getNotifications();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(notif2!.id);

      // Clear all
      clearAllNotifications();
      expect(getNotifications().length).toBe(0);
    });

    it('should suppress duplicate notifications using dedupKey within same cycle', () => {
      const first = addNotification({
        title: 'Daily Budget Warning',
        body: 'You have spent 75% of your daily budget.',
        type: 'warning',
        dedupKey: 'warning_2026-10-31',
      });

      const secondDuplicate = addNotification({
        title: 'Daily Budget Warning',
        body: 'You have spent 78% of your daily budget.',
        type: 'warning',
        dedupKey: 'warning_2026-10-31',
      });

      expect(first).not.toBeNull();
      expect(secondDuplicate).toBeNull(); // Suppressed
      expect(getNotifications().length).toBe(1);
    });

    it('should calculate quiet hours accurately including overnight intervals', () => {
      const prefsOvernight: NotificationPreference = {
        user_id: TEST_USER_A,
        morning_reminder: true,
        morning_reminder_time: '08:00',
        evening_summary: true,
        evening_summary_time: '21:00',
        warning_threshold: 75,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_tone: 'friendly',
        browser_push_enabled: false,
      };

      // 23:30 is in quiet hours (11:30 PM)
      const lateNight = new Date(2026, 9, 31, 23, 30);
      expect(isWithinQuietHours(prefsOvernight, lateNight)).toBe(true);

      // 06:15 is in quiet hours (6:15 AM)
      const earlyMorning = new Date(2026, 9, 31, 6, 15);
      expect(isWithinQuietHours(prefsOvernight, earlyMorning)).toBe(true);

      // 14:00 is outside quiet hours (2:00 PM)
      const afternoon = new Date(2026, 9, 31, 14, 0);
      expect(isWithinQuietHours(prefsOvernight, afternoon)).toBe(false);

      // Disabled quiet hours returns false
      expect(isWithinQuietHours({ ...prefsOvernight, quiet_hours_enabled: false }, lateNight)).toBe(false);
    });

    it('should trigger daily budget warning and overrun alerts via evaluateFinancialTriggers', () => {
      const profile: FinancialProfile = {
        user_id: TEST_USER_A,
        monthly_income: 60000,
        fixed_commitments: 20000,
        savings_target: 10000,
        salary_credit_day: 1,
        daily_budget_override: 0,
        budgeting_mode: 'spendable_income',
      };

      const prefs: NotificationPreference = {
        user_id: TEST_USER_A,
        morning_reminder: true,
        morning_reminder_time: '08:00',
        evening_summary: true,
        evening_summary_time: '21:00',
        warning_threshold: 70,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_tone: 'friendly',
        browser_push_enabled: false,
      };

      const testDate = new Date(2026, 9, 31, 15, 0); // Oct 31, 2026 at 3 PM
      const todayStr = '2026-10-31';

      // Daily budget for 30000 discretionary in Oct (31 days) is ~967.74
      // Spend 800 (approx 82%) => Warning pacing trigger
      const pacingTxs: Transaction[] = [
        {
          id: 'tx_pacing_1',
          user_id: TEST_USER_A,
          account_id: 'acc_01',
          transaction_date: todayStr,
          merchant: 'Zara',
          amount: 800,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'UPI',
          is_unplanned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const pacingAlerts = evaluateFinancialTriggers({
        transactions: pacingTxs,
        profile,
        recurringPayments: [],
        preferences: prefs,
        currentDate: testDate,
      });

      expect(pacingAlerts.some(a => a.type === 'warning' && a.title.includes('Daily Budget Pacing'))).toBe(true);

      // Clear notifications and test Overspent trigger (Spend 1500 > 967)
      clearAllNotifications();
      const overspentTxs: Transaction[] = [
        {
          id: 'tx_over_1',
          user_id: TEST_USER_A,
          account_id: 'acc_01',
          transaction_date: todayStr,
          merchant: 'Electronics Store',
          amount: 1500,
          transaction_type: 'expense',
          category_id: 'cat_shopping',
          payment_method: 'Credit card',
          is_unplanned: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const overspentAlerts = evaluateFinancialTriggers({
        transactions: overspentTxs,
        profile,
        recurringPayments: [],
        preferences: prefs,
        currentDate: testDate,
      });

      expect(overspentAlerts.some(a => a.type === 'overspent' && a.title.includes('Daily Budget Exceeded'))).toBe(true);
    });

    it('should trigger reminder for upcoming recurring bills due within 3 days', () => {
      const profile: FinancialProfile = {
        user_id: TEST_USER_A,
        monthly_income: 60000,
        fixed_commitments: 20000,
        savings_target: 10000,
        salary_credit_day: 1,
        daily_budget_override: 0,
        budgeting_mode: 'spendable_income',
      };

      const prefs: NotificationPreference = {
        user_id: TEST_USER_A,
        morning_reminder: true,
        morning_reminder_time: '08:00',
        evening_summary: true,
        evening_summary_time: '21:00',
        warning_threshold: 70,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_tone: 'friendly',
        browser_push_enabled: false,
      };

      const testDate = new Date(2026, 9, 28, 12, 0); // Oct 28, 2026

      const upcomingBills: RecurringPayment[] = [
        {
          id: 'rec_jio_fiber',
          user_id: TEST_USER_A,
          name: 'JioFiber Broadband',
          amount: 1179,
          category_id: 'cat_bills',
          frequency: 'monthly',
          next_due_date: '2026-10-30', // 2 days away (<= 3 days)
          is_active: true,
          auto_record: true,
        },
        {
          id: 'rec_annual_sub',
          user_id: TEST_USER_A,
          name: 'Annual Software License',
          amount: 5000,
          category_id: 'cat_bills',
          frequency: 'yearly',
          next_due_date: '2026-11-20', // > 3 days away
          is_active: true,
          auto_record: false,
        },
      ];

      const alerts = evaluateFinancialTriggers({
        transactions: [],
        profile,
        recurringPayments: upcomingBills,
        preferences: prefs,
        currentDate: testDate,
      });

      expect(alerts.some(a => a.type === 'bill' && a.title.includes('Upcoming Bill: JioFiber Broadband'))).toBe(true);
      expect(alerts.some(a => a.title.includes('Annual Software License'))).toBe(false);
    });
  });
});
