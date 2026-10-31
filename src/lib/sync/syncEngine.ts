import { ILocalDatabase, OutboxMutation, SyncableTableName, SyncedEntity } from '../db/types';
import { localDB } from '../db/indexedDB';
import { ICloudSyncAdapter, SyncEngineStatus, SyncResult, SyncState } from './types';
import { defaultCloudAdapter } from './cloudAdapter';
import { conflictResolver, ConflictResolver } from './conflictResolver';
import { authService } from '../authService';
import { store } from '../storage';

const TABLES_TO_SYNC: SyncableTableName[] = [
  'transactions',
  'accounts',
  'budgets',
  'categories',
  'savings_goals',
  'recurring_payments',
  'financial_profiles',
];

export class SyncEngine {
  private db: ILocalDatabase;
  private adapter: ICloudSyncAdapter;
  private resolver: ConflictResolver;
  
  private state: SyncState = 'idle';
  private isOnline = true;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private isSyncing = false;
  private listeners: Set<(status: SyncEngineStatus) => void> = new Set();

  constructor(
    database: ILocalDatabase = localDB,
    adapter: ICloudSyncAdapter = defaultCloudAdapter,
    resolver: ConflictResolver = conflictResolver
  ) {
    this.db = database;
    this.adapter = adapter;
    this.resolver = resolver;

    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // Lifecycle & Status Listeners
  subscribe(listener: (status: SyncEngineStatus) => void): () => void {
    this.listeners.add(listener);
    // Notify immediately with current status
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => {
      try {
        fn(status);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }

  getStatus(): SyncEngineStatus {
    const unresolvedConflicts = this.resolver.getUnresolvedConflicts();
    const session = authService.getCurrentSession();
    const isAuthenticated = Boolean(session && Date.now() < session.expires_at);

    return {
      state: unresolvedConflicts.length > 0 ? 'conflict' : this.state,
      isOnline: this.isOnline,
      isAuthenticated,
      pendingOutboxCount: 0, // Calculated dynamically when queried
      unresolvedConflictCount: unresolvedConflicts.length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (!online) {
      this.state = 'offline';
    } else if (this.state === 'offline') {
      this.state = 'idle';
    }
    this.notify();
  }

  private handleOnline() {
    this.setOnlineStatus(true);
    // Automatically trigger queue drain on reconnection if authenticated
    this.triggerSync().catch(err => {
      console.warn('Sync on reconnection failed:', err);
    });
  }

  private handleOffline() {
    this.setOnlineStatus(false);
  }

  /**
   * Main synchronization orchestrator:
   * 1. Check network & session
   * 2. Push local mutations from outbox (FIFO)
   * 3. Pull cloud deltas
   * 4. Update sync timestamps & notify UI
   */
  async triggerSync(userIdOverride?: string): Promise<SyncResult> {
    const now = new Date().toISOString();

    if (!this.isOnline) {
      this.state = 'offline';
      this.notify();
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: this.resolver.getUnresolvedConflicts().length,
        error: 'Cannot synchronize while offline.',
        timestamp: now,
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: this.resolver.getUnresolvedConflicts().length,
        error: 'Synchronization already in progress.',
        timestamp: now,
      };
    }

    const session = authService.getCurrentSession();
    const activeUserId = userIdOverride || session?.user?.id;

    if (!activeUserId) {
      this.state = 'auth_required';
      this.notify();
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
        error: 'Active user authentication session required for cloud sync.',
        timestamp: now,
      };
    }

    // Check session expiration
    if (session && Date.now() > session.expires_at) {
      authService.logout();
      this.state = 'auth_required';
      this.notify();
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
        error: 'Authentication session expired. Please sign in again.',
        timestamp: now,
      };
    }

    if (!this.adapter.isConfigured()) {
      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
        error: 'Cloud sync adapter is not configured.',
        timestamp: now,
      };
    }

    this.isSyncing = true;
    this.state = 'syncing';
    this.lastError = null;
    this.notify();

    let uploadedCount = 0;
    let downloadedCount = 0;
    let syncError: string | undefined;

    try {
      // Step A: Push Outbox Mutations
      const pushRes = await this.processOutbox(activeUserId);
      uploadedCount = pushRes.uploadedCount;

      // Step B: Pull Cloud Deltas
      const pullRes = await this.pullCloudChanges(activeUserId);
      downloadedCount = pullRes.downloadedCount;

      this.lastSyncedAt = new Date().toISOString();
      this.state = this.resolver.getUnresolvedConflicts().length > 0 ? 'conflict' : 'idle';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed.';
      this.lastError = msg;
      syncError = msg;
      this.state = 'error';
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return {
      success: !syncError && this.resolver.getUnresolvedConflicts().length === 0,
      uploadedCount,
      downloadedCount,
      conflictCount: this.resolver.getUnresolvedConflicts().length,
      error: syncError,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Drains the Outbox Mutation Queue in FIFO order.
   * Guarantees:
   * - Mutations are only deleted after cloud confirmation.
   * - Failed mutations stay in outbox with incremented retry count.
   * - Conflicts are halted and recorded without data loss.
   */
  async processOutbox(activeUserId: string): Promise<{ uploadedCount: number; errors: string[] }> {
    const mutations = await this.db.getPendingOutboxMutations(50);
    let uploadedCount = 0;
    const errors: string[] = [];

    // Sort strictly FIFO by client timestamp
    mutations.sort((a, b) => new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime());

    for (const mutation of mutations) {
      if (!this.isOnline) break;

      // Check user isolation
      const mutationUserId = (mutation.payload.user_id as string) || activeUserId;
      if (mutationUserId !== activeUserId) {
        // Skip mutations that do not belong to active authenticated user
        continue;
      }

      await this.db.updateOutboxMutation(mutation.id, { status: 'syncing' });

      const res = await this.adapter.uploadMutation(mutation, activeUserId);

      if (res.success) {
        // Cloud confirmed: update local record sync status and remove outbox entry
        uploadedCount++;
        const localEntity = await this.db.get<Record<string, unknown>>(mutation.table_name, mutation.record_id);
        if (localEntity) {
          await this.db.put(mutation.table_name, {
            ...localEntity,
            sync_status: 'synced',
            version: res.remoteVersion || localEntity.version || 1,
            last_synced_at: new Date().toISOString(),
          });
        }
        await this.db.removeOutboxMutation(mutation.id);
      } else if (res.conflict) {
        // Conflict detected: record in conflict resolver
        const localEntity = await this.db.get<Record<string, unknown>>(mutation.table_name, mutation.record_id);
        if (localEntity && res.remoteData) {
          this.resolver.recordConflict(mutation.table_name, mutation.record_id, localEntity, res.remoteData);
        }
        await this.db.updateOutboxMutation(mutation.id, {
          status: 'conflict',
          error_message: res.error,
        });
        errors.push(`Conflict on ${mutation.table_name}:${mutation.record_id}`);
      } else {
        // Retryable failure: mark failed and increment retry_count
        const retryCount = (mutation.retry_count || 0) + 1;
        await this.db.updateOutboxMutation(mutation.id, {
          status: 'failed',
          retry_count: retryCount,
          error_message: res.error,
        });
        errors.push(res.error || 'Upload failed');
      }
    }

    return { uploadedCount, errors };
  }

  /**
   * Inbound Delta Puller:
   * Downloads changes from cloud since last_synced_at and safely merges them into local DB.
   */
  async pullCloudChanges(activeUserId: string): Promise<{ downloadedCount: number; errors: string[] }> {
    let downloadedCount = 0;
    const errors: string[] = [];

    for (const table of TABLES_TO_SYNC) {
      const { records, error } = await this.adapter.fetchDeltas(table, activeUserId, this.lastSyncedAt || undefined);

      if (error) {
        errors.push(`Failed pulling ${table}: ${error}`);
        continue;
      }

      for (const remoteRecord of records) {
        const recordId = remoteRecord.id as string;
        if (!recordId) continue;

        const localEntity = await this.db.get<Record<string, unknown>>(table, recordId);

        if (localEntity) {
          // Check if local has pending uncommitted mutations
          const outboxMutations = await this.db.getPendingOutboxMutations();
          const hasPendingLocalEdit = outboxMutations.some(m => m.record_id === recordId);

          if (hasPendingLocalEdit) {
            // Potential conflict between uncommitted local edit and incoming cloud change
            if (this.resolver.hasConflict(localEntity, remoteRecord)) {
              this.resolver.recordConflict(table, recordId, localEntity, remoteRecord);
              continue; // Do not overwrite dirty local draft!
            }
          }

          // Safe to apply cloud update
          const isDeleted = Boolean(remoteRecord.deleted_at);
          if (isDeleted) {
            await this.db.softDelete(table, recordId, activeUserId);
          } else {
            await this.db.put(table, {
              ...remoteRecord,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            } as SyncedEntity<Record<string, unknown>>);
          }
          downloadedCount++;
        } else {
          // New record created on another device
          if (!remoteRecord.deleted_at) {
            await this.db.put(table, {
              ...remoteRecord,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            } as SyncedEntity<Record<string, unknown>>);
            downloadedCount++;
          }
        }
      }
    }

    // Refresh in-memory store so React UI updates immediately
    if (downloadedCount > 0) {
      this.refreshStoreFromLocalDb(activeUserId).catch(err => {
        console.warn('Error refreshing store from local DB after cloud pull:', err);
      });
    }

    return { downloadedCount, errors };
  }

  /**
   * Synchronizes local IndexedDB data back into the synchronous React `store`.
   */
  async refreshStoreFromLocalDb(activeUserId: string): Promise<void> {
    const txs = await this.db.getAll<any>('transactions', activeUserId, false);
    if (txs.length > 0) {
      // Update store transactions
      const existingTxs = store.getTransactions(activeUserId);
      const txMap = new Map(existingTxs.map(t => [t.id, t]));
      
      txs.forEach(t => {
        txMap.set(t.id, {
          id: t.id,
          user_id: t.user_id,
          account_id: t.account_id,
          category_id: t.category_id,
          amount: t.amount,
          transaction_type: t.transaction_type,
          merchant: t.merchant,
          description: t.description,
          transaction_date: t.transaction_date,
          payment_method: t.payment_method,
          is_credit_card_payment: t.is_credit_card_payment,
          notes: t.notes,
          external_transaction_id: t.external_transaction_id,
          created_at: t.created_at,
          updated_at: t.updated_at,
        });
      });

      // Update in store
      try {
        localStorage.setItem('paisa_transactions', JSON.stringify(Array.from(txMap.values())));
      } catch {}
    }
  }
}

export const syncEngine = new SyncEngine();
