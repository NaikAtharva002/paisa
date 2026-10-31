import { ILocalDatabase } from './types';
import {
  SyncedEntity,
  FinancialTotalsSnapshot,
  LocalMigrationStatus,
  OutboxMutation,
} from './types';
import {
  Transaction,
  Account,
  Budget,
  Category,
  SavingsGoal,
  RecurringPayment,
  FinancialProfile,
  NotificationPreference,
  BankConsent,
} from '../../types';
import { toPaise } from '../calculations';

const MIGRATION_ID = 'initial_localstorage_migration';
const MIGRATION_VERSION = 1;

const LEGACY_STORAGE_KEYS = {
  USER: 'paisa_user',
  PROFILE: 'paisa_financial_profile',
  ACCOUNTS: 'paisa_accounts',
  CATEGORIES: 'paisa_categories',
  TRANSACTIONS: 'paisa_transactions',
  BUDGETS: 'paisa_budgets',
  RECURRING: 'paisa_recurring_payments',
  SAVINGS: 'paisa_savings_goals',
  NOTIFICATIONS: 'paisa_notification_prefs',
  CONSENTS: 'paisa_bank_consents',
};

function readLegacyJson<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.warn(`Failed to read legacy key ${key}:`, err);
    return defaultValue;
  }
}

/**
 * Computes exact financial totals in integer paise to verify zero financial drift.
 */
export function computeFinancialSnapshot(
  txs: Array<{ amount: number; transaction_type: string }>,
  accs: Array<{ balance: number }>,
  budgets: unknown[],
  goals: unknown[],
  bills: unknown[]
): FinancialTotalsSnapshot {
  let totalExpensePaisa = 0;
  let totalIncomePaisa = 0;
  let totalBalancePaisa = 0;

  txs.forEach(t => {
    const p = toPaise(t.amount);
    if (t.transaction_type === 'income') {
      totalIncomePaisa += p;
    } else {
      totalExpensePaisa += p;
    }
  });

  accs.forEach(a => {
    totalBalancePaisa += toPaise(a.balance);
  });

  return {
    transaction_count: txs.length,
    total_expense_paisa: totalExpensePaisa,
    total_income_paisa: totalIncomePaisa,
    account_count: accs.length,
    total_balance_paisa: totalBalancePaisa,
    budget_count: budgets.length,
    savings_goal_count: goals.length,
    recurring_bill_count: bills.length,
  };
}

export interface MigrationResult {
  success: boolean;
  alreadyMigrated: boolean;
  recordsMigrated: Record<string, number>;
  preTotals: FinancialTotalsSnapshot;
  postTotals: FinancialTotalsSnapshot;
  verified: boolean;
  error?: string | null;
}

/**
 * Non-destructive migration from localStorage into the offline database.
 * Preserves all original data in localStorage untouched.
 */
export async function migrateLocalStorageToIndexedDB(
  db: ILocalDatabase,
  targetUserId?: string
): Promise<MigrationResult> {
  const now = new Date().toISOString();

  // 1. Check if already migrated
  const existingStatus = await db.getMigrationStatus();
  if (existingStatus && existingStatus.status === 'completed' && existingStatus.verified) {
    return {
      success: true,
      alreadyMigrated: true,
      recordsMigrated: existingStatus.record_counts,
      preTotals: existingStatus.pre_migration_totals,
      postTotals: existingStatus.post_migration_totals,
      verified: true,
    };
  }

  // 2. Read legacy records safely
  const legacyTxs = readLegacyJson<Transaction[]>(LEGACY_STORAGE_KEYS.TRANSACTIONS, []);
  const legacyAccs = readLegacyJson<Account[]>(LEGACY_STORAGE_KEYS.ACCOUNTS, []);
  const legacyBudgets = readLegacyJson<Budget[]>(LEGACY_STORAGE_KEYS.BUDGETS, []);
  const legacyCats = readLegacyJson<Category[]>(LEGACY_STORAGE_KEYS.CATEGORIES, []);
  const legacyGoals = readLegacyJson<SavingsGoal[]>(LEGACY_STORAGE_KEYS.SAVINGS, []);
  const legacyBills = readLegacyJson<RecurringPayment[]>(LEGACY_STORAGE_KEYS.RECURRING, []);
  const legacyProfile = readLegacyJson<FinancialProfile | null>(LEGACY_STORAGE_KEYS.PROFILE, null);
  const legacyNotifs = readLegacyJson<NotificationPreference | null>(LEGACY_STORAGE_KEYS.NOTIFICATIONS, null);
  const legacyConsents = readLegacyJson<BankConsent[]>(LEGACY_STORAGE_KEYS.CONSENTS, []);

  // Compute baseline financial totals
  const preTotals = computeFinancialSnapshot(
    legacyTxs,
    legacyAccs,
    legacyBudgets,
    legacyGoals,
    legacyBills
  );

  const counts: Record<string, number> = {
    transactions: 0,
    accounts: 0,
    budgets: 0,
    categories: 0,
    savings_goals: 0,
    recurring_payments: 0,
    financial_profiles: 0,
    notification_preferences: 0,
    bank_consents: 0,
  };

  try {
    // 3. Convert & insert Transactions
    const syncedTxs: SyncedEntity<Transaction>[] = legacyTxs.map((t, idx) => ({
      ...t,
      id: t.id || `tx_migrated_${idx}_${Date.now()}`,
      user_id: targetUserId || t.user_id,
      version: 1,
      sync_status: 'pending_insert',
      created_at: t.created_at || now,
      updated_at: t.updated_at || now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('transactions', syncedTxs);
    counts.transactions = syncedTxs.length;

    // 4. Convert & insert Accounts
    const syncedAccs: SyncedEntity<Account>[] = legacyAccs.map((a, idx) => ({
      ...a,
      id: a.id || `acc_migrated_${idx}_${Date.now()}`,
      user_id: targetUserId || a.user_id,
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('accounts', syncedAccs);
    counts.accounts = syncedAccs.length;

    // 5. Convert & insert Budgets
    const syncedBudgets: SyncedEntity<Budget>[] = legacyBudgets.map((b, idx) => ({
      ...b,
      id: b.id || `bgt_migrated_${idx}_${Date.now()}`,
      user_id: targetUserId || b.user_id,
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('budgets', syncedBudgets);
    counts.budgets = syncedBudgets.length;

    // 6. Convert & insert Categories
    const syncedCats: SyncedEntity<Category>[] = legacyCats.map(c => ({
      ...c,
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('categories', syncedCats);
    counts.categories = syncedCats.length;

    // 7. Convert & insert Savings Goals
    const syncedGoals: SyncedEntity<SavingsGoal>[] = legacyGoals.map((g, idx) => ({
      ...g,
      id: g.id || `goal_migrated_${idx}_${Date.now()}`,
      user_id: targetUserId || g.user_id,
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('savings_goals', syncedGoals);
    counts.savings_goals = syncedGoals.length;

    // 8. Convert & insert Recurring Payments
    const syncedBills: SyncedEntity<RecurringPayment>[] = legacyBills.map((r, idx) => ({
      ...r,
      id: r.id || `bill_migrated_${idx}_${Date.now()}`,
      user_id: targetUserId || r.user_id,
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: undefined,
    }));
    await db.putBulk('recurring_payments', syncedBills);
    counts.recurring_payments = syncedBills.length;

    // 9. Convert & insert Financial Profile
    if (legacyProfile) {
      const syncedProfile: SyncedEntity<FinancialProfile> = {
        ...legacyProfile,
        user_id: targetUserId || legacyProfile.user_id,
        version: 1,
        sync_status: 'pending_insert',
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_synced_at: undefined,
      };
      await db.put('financial_profiles', syncedProfile);
      counts.financial_profiles = 1;
    }

    // 10. Convert & insert Notification Preferences
    if (legacyNotifs) {
      const syncedNotifs: SyncedEntity<NotificationPreference> = {
        ...legacyNotifs,
        user_id: targetUserId || legacyNotifs.user_id,
        version: 1,
        sync_status: 'pending_insert',
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_synced_at: undefined,
      };
      await db.put('notification_preferences', syncedNotifs);
      counts.notification_preferences = 1;
    }

    // 11. Convert & insert Bank Consents
    if (legacyConsents.length > 0) {
      const syncedConsents: SyncedEntity<BankConsent>[] = legacyConsents.map((bc, idx) => ({
        ...bc,
        id: bc.id || `consent_migrated_${idx}_${Date.now()}`,
        user_id: targetUserId || bc.user_id,
        version: 1,
        sync_status: 'pending_insert',
        created_at: bc.created_at || now,
        updated_at: now,
        deleted_at: null,
        last_synced_at: undefined,
      }));
      await db.putBulk('bank_consents', syncedConsents);
      counts.bank_consents = syncedConsents.length;
    }

    // 12. Create Durable Outbox Mutations for all entities
    const mutations: OutboxMutation[] = [];

    syncedTxs.forEach(t => {
      mutations.push({
        id: `outbox_tx_${t.id}`,
        table_name: 'transactions',
        record_id: t.id,
        action: 'insert',
        payload: t as unknown as Record<string, unknown>,
        client_timestamp: now,
        retry_count: 0,
        status: 'pending',
      });
    });

    syncedAccs.forEach(a => {
      mutations.push({
        id: `outbox_acc_${a.id}`,
        table_name: 'accounts',
        record_id: a.id,
        action: 'insert',
        payload: a as unknown as Record<string, unknown>,
        client_timestamp: now,
        retry_count: 0,
        status: 'pending',
      });
    });

    syncedBudgets.forEach(b => {
      mutations.push({
        id: `outbox_bgt_${b.id}`,
        table_name: 'budgets',
        record_id: b.id,
        action: 'insert',
        payload: b as unknown as Record<string, unknown>,
        client_timestamp: now,
        retry_count: 0,
        status: 'pending',
      });
    });

    for (const m of mutations) {
      await db.addOutboxMutation(m);
    }

    // 13. Read back from database to verify integrity and financial accuracy
    const dbTxs = await db.getAll<Transaction>('transactions', targetUserId);
    const dbAccs = await db.getAll<Account>('accounts', targetUserId);
    const dbBudgets = await db.getAll<Budget>('budgets', targetUserId);
    const dbGoals = await db.getAll<SavingsGoal>('savings_goals', targetUserId);
    const dbBills = await db.getAll<RecurringPayment>('recurring_payments', targetUserId);

    const postTotals = computeFinancialSnapshot(dbTxs, dbAccs, dbBudgets, dbGoals, dbBills);

    // Verify financial totals and counts match exactly
    const countsMatch =
      preTotals.transaction_count === postTotals.transaction_count &&
      preTotals.account_count === postTotals.account_count &&
      preTotals.budget_count === postTotals.budget_count &&
      preTotals.savings_goal_count === postTotals.savings_goal_count &&
      preTotals.recurring_bill_count === postTotals.recurring_bill_count;

    const totalsMatch =
      preTotals.total_expense_paisa === postTotals.total_expense_paisa &&
      preTotals.total_income_paisa === postTotals.total_income_paisa &&
      preTotals.total_balance_paisa === postTotals.total_balance_paisa;

    const isVerified = countsMatch && totalsMatch;

    if (!isVerified) {
      throw new Error(
        `Financial verification mismatch during migration! Pre: ${JSON.stringify(preTotals)} vs Post: ${JSON.stringify(postTotals)}`
      );
    }

    // 14. Record completed migration status
    const statusRecord: LocalMigrationStatus = {
      id: MIGRATION_ID,
      version: MIGRATION_VERSION,
      migrated_at: now,
      status: 'completed',
      pre_migration_totals: preTotals,
      post_migration_totals: postTotals,
      record_counts: counts,
      verified: true,
    };

    await db.saveMigrationStatus(statusRecord);

    return {
      success: true,
      alreadyMigrated: false,
      recordsMigrated: counts,
      preTotals,
      postTotals,
      verified: true,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Migration failed:', errorMsg);

    const failedStatus: LocalMigrationStatus = {
      id: MIGRATION_ID,
      version: MIGRATION_VERSION,
      migrated_at: now,
      status: 'failed',
      pre_migration_totals: preTotals,
      post_migration_totals: {
        transaction_count: 0,
        total_expense_paisa: 0,
        total_income_paisa: 0,
        account_count: 0,
        total_balance_paisa: 0,
        budget_count: 0,
        savings_goal_count: 0,
        recurring_bill_count: 0,
      },
      record_counts: counts,
      verified: false,
      error: errorMsg,
    };
    await db.saveMigrationStatus(failedStatus);

    return {
      success: false,
      alreadyMigrated: false,
      recordsMigrated: counts,
      preTotals,
      postTotals: failedStatus.post_migration_totals,
      verified: false,
      error: errorMsg,
    };
  }
}

/**
 * Safely rolls back the IndexedDB migration without touching legacy localStorage.
 */
export async function rollbackLocalStorageMigration(db: ILocalDatabase): Promise<void> {
  await db.clearAllStores(false);
  const rollbackStatus: LocalMigrationStatus = {
    id: MIGRATION_ID,
    version: MIGRATION_VERSION,
    migrated_at: new Date().toISOString(),
    status: 'rolled_back',
    pre_migration_totals: {
      transaction_count: 0,
      total_expense_paisa: 0,
      total_income_paisa: 0,
      account_count: 0,
      total_balance_paisa: 0,
      budget_count: 0,
      savings_goal_count: 0,
      recurring_bill_count: 0,
    },
    post_migration_totals: {
      transaction_count: 0,
      total_expense_paisa: 0,
      total_income_paisa: 0,
      account_count: 0,
      total_balance_paisa: 0,
      budget_count: 0,
      savings_goal_count: 0,
      recurring_bill_count: 0,
    },
    record_counts: {},
    verified: false,
  };
  await db.saveMigrationStatus(rollbackStatus);
}
