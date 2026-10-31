import { localDB } from './indexedDB';
import { ILocalDatabase, SyncedEntity, OutboxMutation, SyncStatus, SyncableTableName } from './types';
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
  User,
} from '../../types';
import { migrateLocalStorageToIndexedDB, MigrationResult } from './migration';

export interface RepositoryListener {
  (tableName: string): void;
}

export class PaisaRepository {
  private db: ILocalDatabase;
  private listeners: Set<RepositoryListener> = new Set();
  private initialized = false;

  constructor(database: ILocalDatabase = localDB) {
    this.db = database;
  }

  async init(targetUserId?: string): Promise<MigrationResult> {
    if (!this.initialized) {
      await this.db.init();
      this.initialized = true;
    }
    // Perform safe, non-destructive migration from localStorage if not already done
    const result = await migrateLocalStorageToIndexedDB(this.db, targetUserId);
    return result;
  }

  subscribe(listener: RepositoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(tableName: string) {
    this.listeners.forEach(fn => fn(tableName));
  }

  // --- Transactions ---

  async getTransactions(userId?: string): Promise<SyncedEntity<Transaction>[]> {
    return this.db.getAll<Transaction>('transactions', userId, false);
  }

  async getTransactionById(id: string): Promise<SyncedEntity<Transaction> | null> {
    return this.db.get<Transaction>('transactions', id);
  }

  async addTransaction(
    tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
    customId?: string
  ): Promise<SyncedEntity<Transaction>> {
    const now = new Date().toISOString();
    const id = customId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const entity: SyncedEntity<Transaction> = {
      ...tx,
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      sync_status: 'pending_insert',
      deleted_at: null,
      last_synced_at: undefined,
    };

    await this.db.put('transactions', entity);

    // Queue outbox mutation
    await this.db.addOutboxMutation({
      id: `outbox_tx_ins_${id}`,
      table_name: 'transactions',
      record_id: id,
      action: 'insert',
      payload: entity as unknown as Record<string, unknown>,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    this.notify('transactions');
    return entity;
  }

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    userId: string
  ): Promise<SyncedEntity<Transaction> | null> {
    const existing = await this.db.get<Transaction>('transactions', id);
    if (!existing || existing.deleted_at) return null;
    if (existing.user_id !== userId) return null;

    const now = new Date().toISOString();
    const updated: SyncedEntity<Transaction> = {
      ...existing,
      ...updates,
      updated_at: now,
      version: (existing.version || 1) + 1,
      sync_status: 'pending_update',
    };

    await this.db.put('transactions', updated);

    await this.db.addOutboxMutation({
      id: `outbox_tx_upd_${id}_v${updated.version}`,
      table_name: 'transactions',
      record_id: id,
      action: 'update',
      payload: updated as unknown as Record<string, unknown>,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    this.notify('transactions');
    return updated;
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const existing = await this.db.get<Transaction>('transactions', id);
    if (!existing || existing.deleted_at) return false;
    if (existing.user_id !== userId) return false;

    const now = new Date().toISOString();
    const success = await this.db.softDelete('transactions', id, userId);

    if (success) {
      await this.db.addOutboxMutation({
        id: `outbox_tx_del_${id}`,
        table_name: 'transactions',
        record_id: id,
        action: 'delete',
        payload: { id, user_id: userId, deleted_at: now },
        client_timestamp: now,
        retry_count: 0,
        status: 'pending',
      });
      this.notify('transactions');
    }

    return success;
  }

  // --- Accounts ---

  async getAccounts(userId?: string): Promise<SyncedEntity<Account>[]> {
    return this.db.getAll<Account>('accounts', userId, false);
  }

  async addAccount(account: Omit<Account, 'id'>, customId?: string): Promise<SyncedEntity<Account>> {
    const now = new Date().toISOString();
    const id = customId || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const entity: SyncedEntity<Account> = {
      ...account,
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      sync_status: 'pending_insert',
      deleted_at: null,
      last_synced_at: undefined,
    };

    await this.db.put('accounts', entity);

    await this.db.addOutboxMutation({
      id: `outbox_acc_ins_${id}`,
      table_name: 'accounts',
      record_id: id,
      action: 'insert',
      payload: entity as unknown as Record<string, unknown>,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    this.notify('accounts');
    return entity;
  }

  async updateAccount(
    id: string,
    updates: Partial<Account>,
    userId: string
  ): Promise<SyncedEntity<Account> | null> {
    const existing = await this.db.get<Account>('accounts', id);
    if (!existing || existing.deleted_at) return null;
    if (existing.user_id !== userId) return null;

    const now = new Date().toISOString();
    const updated: SyncedEntity<Account> = {
      ...existing,
      ...updates,
      updated_at: now,
      version: (existing.version || 1) + 1,
      sync_status: 'pending_update',
    };

    await this.db.put('accounts', updated);

    await this.db.addOutboxMutation({
      id: `outbox_acc_upd_${id}_v${updated.version}`,
      table_name: 'accounts',
      record_id: id,
      action: 'update',
      payload: updated as unknown as Record<string, unknown>,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    this.notify('accounts');
    return updated;
  }

  // --- Budgets ---

  async getBudgets(userId?: string): Promise<SyncedEntity<Budget>[]> {
    return this.db.getAll<Budget>('budgets', userId, false);
  }

  async setBudget(budget: Omit<Budget, 'id'>, customId?: string): Promise<SyncedEntity<Budget>> {
    const now = new Date().toISOString();
    const id = customId || `bgt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const entity: SyncedEntity<Budget> = {
      ...budget,
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      sync_status: 'pending_insert',
      deleted_at: null,
      last_synced_at: undefined,
    };

    await this.db.put('budgets', entity);

    await this.db.addOutboxMutation({
      id: `outbox_bgt_ins_${id}`,
      table_name: 'budgets',
      record_id: id,
      action: 'insert',
      payload: entity as unknown as Record<string, unknown>,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    this.notify('budgets');
    return entity;
  }

  // --- Outbox Management ---

  async getPendingMutations(limit = 100): Promise<OutboxMutation[]> {
    return this.db.getPendingOutboxMutations(limit);
  }

  async updateMutationStatus(
    id: string,
    status: 'pending' | 'syncing' | 'failed' | 'conflict',
    errorMessage?: string
  ): Promise<void> {
    await this.db.updateOutboxMutation(id, {
      status,
      error_message: errorMessage || null,
      retry_count: status === 'failed' ? 1 : 0,
    });
  }

  async markMutationSynced(mutationId: string, tableName: SyncableTableName, recordId: string): Promise<void> {
    await this.db.removeOutboxMutation(mutationId);
    const record = await this.db.get(tableName, recordId);
    if (record) {
      await this.db.put(tableName, {
        ...record,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      });
      this.notify(tableName);
    }
  }
}

export const paisaRepository = new PaisaRepository();
