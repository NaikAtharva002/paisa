import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBLocalDatabase } from '../lib/db/indexedDB';
import { PaisaRepository } from '../lib/db/repository';
import {
  migrateLocalStorageToIndexedDB,
  rollbackLocalStorageMigration,
  computeFinancialSnapshot,
} from '../lib/db/migration';
import { Transaction, Account, Budget, SavingsGoal, RecurringPayment } from '../types';

class MemoryStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string) { return this.store.get(key) || null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(index: number) { return Array.from(this.store.keys())[index] || null; }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
}

describe('PAISA Stage Two & Three — Offline Database & Non-Destructive Migration Suite', () => {
  let db: IndexedDBLocalDatabase;
  let repo: PaisaRepository;

  const TEST_USER = 'user_test_migration_001';

  beforeEach(async () => {
    // Clear localStorage simulation
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    db = new IndexedDBLocalDatabase();
    await db.init();
    repo = new PaisaRepository(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('1. Local Database Repository CRUD & Metadata Operations', () => {
    it('should insert a transaction with initial version 1 and pending_insert status', async () => {
      const tx = await repo.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-31',
        merchant: 'Swiggy',
        amount: 450,
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
      });

      expect(tx.id).toBeDefined();
      expect(tx.version).toBe(1);
      expect(tx.sync_status).toBe('pending_insert');
      expect(tx.created_at).toBeDefined();
      expect(tx.deleted_at).toBeNull();

      // Verify outbox mutation was enqueued
      const mutations = await repo.getPendingMutations();
      expect(mutations.length).toBe(1);
      expect(mutations[0].table_name).toBe('transactions');
      expect(mutations[0].action).toBe('insert');
      expect(mutations[0].record_id).toBe(tx.id);
    });

    it('should increment version and set pending_update status upon record update', async () => {
      const created = await repo.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-31',
        merchant: 'Blinkit',
        amount: 600,
        transaction_type: 'expense',
        category_id: 'cat_groceries',
        payment_method: 'UPI',
      });

      const updated = await repo.updateTransaction(
        created.id,
        { amount: 650, notes: 'Added milk carton' },
        TEST_USER
      );

      expect(updated).not.toBeNull();
      expect(updated?.version).toBe(2);
      expect(updated?.amount).toBe(650);
      expect(updated?.sync_status).toBe('pending_update');
      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(created.created_at).getTime()
      );

      // Verify outbox records update
      const mutations = await repo.getPendingMutations();
      expect(mutations.length).toBe(2);
      expect(mutations[1].action).toBe('update');
      expect(mutations[1].record_id).toBe(created.id);
    });

    it('should perform soft deletion (tombstone) without physically purging the record', async () => {
      const created = await repo.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-30',
        merchant: 'Uber Ride',
        amount: 280,
        transaction_type: 'expense',
        category_id: 'cat_transport',
        payment_method: 'UPI',
      });

      const deleted = await repo.deleteTransaction(created.id, TEST_USER);
      expect(deleted).toBe(true);

      // Normal query should exclude soft-deleted transactions
      const activeTxs = await repo.getTransactions(TEST_USER);
      expect(activeTxs.find(t => t.id === created.id)).toBeUndefined();

      // Database internal query with includeDeleted = true should retain the tombstone
      const rawAll = await db.getAll<Transaction>('transactions', TEST_USER, true);
      const tombstone = rawAll.find(t => t.id === created.id);
      expect(tombstone).toBeDefined();
      expect(tombstone?.deleted_at).toBeDefined();
      expect(tombstone?.sync_status).toBe('pending_delete');
      expect(tombstone?.version).toBe(2);

      // Outbox must contain deletion mutation
      const mutations = await repo.getPendingMutations();
      const delMutation = mutations.find(m => m.action === 'delete' && m.record_id === created.id);
      expect(delMutation).toBeDefined();
    });

    it('should reject updates and deletions by non-owner users', async () => {
      const created = await repo.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-31',
        merchant: 'Amazon',
        amount: 1200,
        transaction_type: 'expense',
        category_id: 'cat_shopping',
        payment_method: 'Credit card',
      });

      const unauthorizedUpdate = await repo.updateTransaction(
        created.id,
        { amount: 500 },
        'unauthorized_attacker_id'
      );
      expect(unauthorizedUpdate).toBeNull();

      const unauthorizedDelete = await repo.deleteTransaction(
        created.id,
        'unauthorized_attacker_id'
      );
      expect(unauthorizedDelete).toBe(false);
    });
  });

  describe('2. Non-Destructive localStorage Migration & Financial Verification', () => {
    beforeEach(() => {
      // Seed sample legacy localStorage dataset
      const legacyTxs = [
        {
          id: 'tx_legacy_001',
          user_id: TEST_USER,
          transaction_date: '2026-10-28',
          merchant: 'Swiggy',
          amount: 450.5,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
          created_at: '2026-10-28T12:00:00Z',
          updated_at: '2026-10-28T12:00:00Z',
        },
        {
          id: 'tx_legacy_002',
          user_id: TEST_USER,
          transaction_date: '2026-10-27',
          merchant: 'Salary Credit',
          amount: 85000,
          transaction_type: 'income',
          category_id: 'income',
          payment_method: 'Net banking',
          created_at: '2026-10-27T10:00:00Z',
          updated_at: '2026-10-27T10:00:00Z',
        },
      ];

      const legacyAccs = [
        {
          id: 'acc_legacy_001',
          user_id: TEST_USER,
          account_name: 'HDFC Salary',
          account_type: 'savings',
          provider: 'HDFC Bank',
          balance: 85450.5,
          connection_status: 'connected',
          is_demo: false,
        },
      ];

      const legacyBudgets = [
        {
          id: 'bgt_legacy_001',
          user_id: TEST_USER,
          category_id: 'cat_food',
          limit_amount: 15000,
          period: 'monthly',
          start_date: '2026-10-01',
          end_date: '2026-10-31',
        },
      ];

      localStorage.setItem('paisa_transactions', JSON.stringify(legacyTxs));
      localStorage.setItem('paisa_accounts', JSON.stringify(legacyAccs));
      localStorage.setItem('paisa_budgets', JSON.stringify(legacyBudgets));
    });

    it('should migrate all legacy records while keeping original localStorage completely intact', async () => {
      const result = await migrateLocalStorageToIndexedDB(db, TEST_USER);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.alreadyMigrated).toBe(false);
      expect(result.recordsMigrated.transactions).toBe(2);
      expect(result.recordsMigrated.accounts).toBe(1);
      expect(result.recordsMigrated.budgets).toBe(1);

      // Verify financial totals match down to the exact paise (integer arithmetic)
      expect(result.preTotals.total_expense_paisa).toBe(result.postTotals.total_expense_paisa);
      expect(result.preTotals.total_income_paisa).toBe(result.postTotals.total_income_paisa);
      expect(result.preTotals.total_balance_paisa).toBe(result.postTotals.total_balance_paisa);
      expect(result.postTotals.total_expense_paisa).toBe(45050); // ₹450.50 = 45,050 paise
      expect(result.postTotals.total_income_paisa).toBe(8500000); // ₹85,000.00 = 8,500,000 paise

      // CRITICAL NON-NEGOTIABLE CHECK: localStorage must not be modified or cleared!
      expect(localStorage.getItem('paisa_transactions')).not.toBeNull();
      expect(localStorage.getItem('paisa_accounts')).not.toBeNull();
      expect(localStorage.getItem('paisa_budgets')).not.toBeNull();
      const rawStored = JSON.parse(localStorage.getItem('paisa_transactions') || '[]');
      expect(rawStored.length).toBe(2);
    });

    it('should be safe to run again (idempotent repeat migration without duplicate records)', async () => {
      // First run
      const firstRun = await migrateLocalStorageToIndexedDB(db, TEST_USER);
      expect(firstRun.success).toBe(true);
      expect(firstRun.alreadyMigrated).toBe(false);

      // Second run immediately after
      const secondRun = await migrateLocalStorageToIndexedDB(db, TEST_USER);
      expect(secondRun.success).toBe(true);
      expect(secondRun.alreadyMigrated).toBe(true);

      // Verify no duplicates created
      const allTxs = await db.getAll<Transaction>('transactions', TEST_USER);
      expect(allTxs.length).toBe(2);
      const allAccs = await db.getAll<Account>('accounts', TEST_USER);
      expect(allAccs.length).toBe(1);
    });

    it('should provide safe rollback without altering legacy localStorage', async () => {
      await migrateLocalStorageToIndexedDB(db, TEST_USER);

      // Rollback
      await rollbackLocalStorageMigration(db);

      const status = await db.getMigrationStatus();
      expect(status?.status).toBe('rolled_back');

      // Database stores must be clear
      const txs = await db.getAll('transactions');
      expect(txs.length).toBe(0);

      // Legacy localStorage must remain 100% untouched
      expect(JSON.parse(localStorage.getItem('paisa_transactions')!).length).toBe(2);
    });
  });

  describe('3. Outbox Synchronization Queue Operations', () => {
    it('should manage pending mutations and mark them synced upon acknowledgement', async () => {
      const tx = await repo.addTransaction({
        user_id: TEST_USER,
        transaction_date: '2026-10-31',
        merchant: 'BookMyShow',
        amount: 800,
        transaction_type: 'expense',
        category_id: 'cat_entertainment',
        payment_method: 'UPI',
      });

      const pending = await repo.getPendingMutations();
      expect(pending.length).toBe(1);
      const mutationId = pending[0].id;

      // Update to syncing state
      await repo.updateMutationStatus(mutationId, 'syncing');
      const syncing = await db.getPendingOutboxMutations();
      // 'syncing' status is in flight, so it shouldn't show in pending query
      expect(syncing.length).toBe(0);

      // Simulate network acknowledgement
      await repo.markMutationSynced(mutationId, 'transactions', tx.id);

      // Mutation removed from outbox
      const afterSync = await repo.getPendingMutations();
      expect(afterSync.length).toBe(0);

      // Entity sync_status updated to 'synced'
      const syncedRecord = await repo.getTransactionById(tx.id);
      expect(syncedRecord?.sync_status).toBe('synced');
      expect(syncedRecord?.last_synced_at).toBeDefined();
    });
  });
});
