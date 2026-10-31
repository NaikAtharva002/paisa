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

export type SyncStatus =
  | 'synced'
  | 'pending_insert'
  | 'pending_update'
  | 'pending_delete'
  | 'failed'
  | 'conflict';

export interface SyncMetadata {
  version: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  last_synced_at?: string | null;
  conflict_data?: Record<string, unknown> | null;
}

export type SyncedEntity<T> = T & SyncMetadata;

export type SyncableTableName =
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'categories'
  | 'savings_goals'
  | 'recurring_payments'
  | 'financial_profiles'
  | 'notification_preferences'
  | 'bank_consents';

export type MutationAction = 'insert' | 'update' | 'delete';

export interface OutboxMutation {
  id: string; // UUID
  table_name: SyncableTableName;
  record_id: string;
  action: MutationAction;
  payload: Record<string, unknown>;
  client_timestamp: string;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  error_message?: string | null;
}

export interface FinancialTotalsSnapshot {
  transaction_count: number;
  total_expense_paisa: number;
  total_income_paisa: number;
  account_count: number;
  total_balance_paisa: number;
  budget_count: number;
  savings_goal_count: number;
  recurring_bill_count: number;
}

export interface LocalMigrationStatus {
  id: string;
  version: number;
  migrated_at: string;
  status: 'completed' | 'failed' | 'rolled_back';
  pre_migration_totals: FinancialTotalsSnapshot;
  post_migration_totals: FinancialTotalsSnapshot;
  record_counts: Record<string, number>;
  verified: boolean;
  error?: string | null;
}

export interface ILocalDatabase {
  init(): Promise<void>;
  close(): Promise<void>;
  
  // Generic entity operations
  get<T>(storeName: SyncableTableName, id: string): Promise<SyncedEntity<T> | null>;
  getAll<T>(storeName: SyncableTableName, userId?: string, includeDeleted?: boolean): Promise<SyncedEntity<T>[]>;
  put<T>(storeName: SyncableTableName, record: SyncedEntity<T>): Promise<void>;
  putBulk<T>(storeName: SyncableTableName, records: SyncedEntity<T>[]): Promise<void>;
  softDelete(storeName: SyncableTableName, id: string, userId: string): Promise<boolean>;

  // Outbox operations
  addOutboxMutation(mutation: OutboxMutation): Promise<void>;
  getPendingOutboxMutations(limit?: number): Promise<OutboxMutation[]>;
  updateOutboxMutation(id: string, updates: Partial<OutboxMutation>): Promise<void>;
  removeOutboxMutation(id: string): Promise<void>;
  clearOutbox(): Promise<void>;

  // Migration status
  getMigrationStatus(): Promise<LocalMigrationStatus | null>;
  saveMigrationStatus(status: LocalMigrationStatus): Promise<void>;
  clearAllStores(preserveMigrationMeta?: boolean): Promise<void>;
}
