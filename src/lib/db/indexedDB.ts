import {
  ILocalDatabase,
  SyncableTableName,
  SyncedEntity,
  OutboxMutation,
  LocalMigrationStatus,
} from './types';

const DB_NAME = 'paisa_offline_db';
const DB_VERSION = 1;

const STORES: SyncableTableName[] = [
  'transactions',
  'accounts',
  'budgets',
  'categories',
  'savings_goals',
  'recurring_payments',
  'financial_profiles',
  'notification_preferences',
  'bank_consents',
];

const OUTBOX_STORE = 'outbox_mutations';
const MIGRATION_STORE = 'migration_meta';

export class IndexedDBLocalDatabase implements ILocalDatabase {
  private db: IDBDatabase | null = null;
  private isMemoryFallback = false;
  private memoryStore: Map<string, Map<string, unknown>> = new Map();

  constructor() {
    // Initialize in-memory fallback maps in case IndexedDB is unavailable (e.g. Node.js unit tests)
    [...STORES, OUTBOX_STORE, MIGRATION_STORE].forEach(store => {
      this.memoryStore.set(store, new Map());
    });
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isMemoryFallback = true;
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Transactions Store
          if (!db.objectStoreNames.contains('transactions')) {
            const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
            txStore.createIndex('user_id', 'user_id', { unique: false });
            txStore.createIndex('transaction_date', 'transaction_date', { unique: false });
            txStore.createIndex('category_id', 'category_id', { unique: false });
            txStore.createIndex('sync_status', 'sync_status', { unique: false });
            txStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          }

          // 2. Accounts Store
          if (!db.objectStoreNames.contains('accounts')) {
            const accStore = db.createObjectStore('accounts', { keyPath: 'id' });
            accStore.createIndex('user_id', 'user_id', { unique: false });
            accStore.createIndex('sync_status', 'sync_status', { unique: false });
            accStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          }

          // 3. Budgets Store
          if (!db.objectStoreNames.contains('budgets')) {
            const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
            budgetStore.createIndex('user_id', 'user_id', { unique: false });
            budgetStore.createIndex('sync_status', 'sync_status', { unique: false });
            budgetStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          }

          // 4. Categories Store
          if (!db.objectStoreNames.contains('categories')) {
            const catStore = db.createObjectStore('categories', { keyPath: 'id' });
            catStore.createIndex('user_id', 'user_id', { unique: false });
            catStore.createIndex('sync_status', 'sync_status', { unique: false });
          }

          // 5. Savings Goals Store
          if (!db.objectStoreNames.contains('savings_goals')) {
            const goalStore = db.createObjectStore('savings_goals', { keyPath: 'id' });
            goalStore.createIndex('user_id', 'user_id', { unique: false });
            goalStore.createIndex('sync_status', 'sync_status', { unique: false });
            goalStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          }

          // 6. Recurring Payments Store
          if (!db.objectStoreNames.contains('recurring_payments')) {
            const recStore = db.createObjectStore('recurring_payments', { keyPath: 'id' });
            recStore.createIndex('user_id', 'user_id', { unique: false });
            recStore.createIndex('sync_status', 'sync_status', { unique: false });
            recStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          }

          // 7. Financial Profiles Store (Keyed by user_id)
          if (!db.objectStoreNames.contains('financial_profiles')) {
            const profStore = db.createObjectStore('financial_profiles', { keyPath: 'user_id' });
            profStore.createIndex('sync_status', 'sync_status', { unique: false });
          }

          // 8. Notification Preferences Store (Keyed by user_id)
          if (!db.objectStoreNames.contains('notification_preferences')) {
            const notifStore = db.createObjectStore('notification_preferences', { keyPath: 'user_id' });
            notifStore.createIndex('sync_status', 'sync_status', { unique: false });
          }

          // 9. Bank Consents Store
          if (!db.objectStoreNames.contains('bank_consents')) {
            const consentStore = db.createObjectStore('bank_consents', { keyPath: 'id' });
            consentStore.createIndex('user_id', 'user_id', { unique: false });
            consentStore.createIndex('sync_status', 'sync_status', { unique: false });
          }

          // 10. Outbox Mutation Queue Store
          if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
            const outboxStore = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
            outboxStore.createIndex('status', 'status', { unique: false });
            outboxStore.createIndex('table_name', 'table_name', { unique: false });
            outboxStore.createIndex('client_timestamp', 'client_timestamp', { unique: false });
          }

          // 11. Migration Meta Store
          if (!db.objectStoreNames.contains(MIGRATION_STORE)) {
            db.createObjectStore(MIGRATION_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isMemoryFallback = false;
          resolve();
        };

        request.onerror = () => {
          console.warn('IndexedDB open error; falling back to memory store:', request.error);
          this.isMemoryFallback = true;
          resolve();
        };
      } catch (err) {
        console.warn('IndexedDB not supported; falling back to memory store:', err);
        this.isMemoryFallback = true;
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getKey(storeName: string, record: unknown): string {
    const r = record as Record<string, unknown>;
    if (storeName === 'financial_profiles' || storeName === 'notification_preferences') {
      return String(r.user_id || 'default');
    }
    return String(r.id || 'default');
  }

  async get<T>(storeName: SyncableTableName, id: string): Promise<SyncedEntity<T> | null> {
    if (this.isMemoryFallback || !this.db) {
      const storeMap = this.memoryStore.get(storeName);
      return (storeMap?.get(id) as SyncedEntity<T>) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result ? (req.result as SyncedEntity<T>) : null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll<T>(
    storeName: SyncableTableName,
    userId?: string,
    includeDeleted = false
  ): Promise<SyncedEntity<T>[]> {
    if (this.isMemoryFallback || !this.db) {
      const storeMap = this.memoryStore.get(storeName);
      if (!storeMap) return [];
      const all = Array.from(storeMap.values()) as SyncedEntity<T>[];
      return all.filter(item => {
        const matchesUser = !userId || (item as unknown as { user_id?: string }).user_id === userId;
        const matchesDeleted = includeDeleted || !item.deleted_at;
        return matchesUser && matchesDeleted;
      });
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = (req.result || []) as SyncedEntity<T>[];
        const filtered = all.filter(item => {
          const matchesUser = !userId || (item as unknown as { user_id?: string }).user_id === userId;
          const matchesDeleted = includeDeleted || !item.deleted_at;
          return matchesUser && matchesDeleted;
        });
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: SyncableTableName, record: SyncedEntity<T>): Promise<void> {
    const key = this.getKey(storeName, record);

    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(storeName)?.set(key, record);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putBulk<T>(storeName: SyncableTableName, records: SyncedEntity<T>[]): Promise<void> {
    if (records.length === 0) return;

    if (this.isMemoryFallback || !this.db) {
      const map = this.memoryStore.get(storeName);
      records.forEach(r => {
        map?.set(this.getKey(storeName, r), r);
      });
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      records.forEach(r => store.put(r));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async softDelete(storeName: SyncableTableName, id: string, userId: string): Promise<boolean> {
    const record = await this.get(storeName, id);
    if (!record) return false;

    // Verify ownership
    if ((record as unknown as { user_id?: string }).user_id && (record as unknown as { user_id?: string }).user_id !== userId) {
      return false;
    }

    const updated: SyncedEntity<unknown> = {
      ...record,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: (record.version || 1) + 1,
      sync_status: 'pending_delete',
    };

    await this.put(storeName, updated);
    return true;
  }

  // Outbox Mutation Queue Operations
  async addOutboxMutation(mutation: OutboxMutation): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(OUTBOX_STORE)?.set(mutation.id, mutation);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.put(mutation);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingOutboxMutations(limit = 100): Promise<OutboxMutation[]> {
    if (this.isMemoryFallback || !this.db) {
      const map = this.memoryStore.get(OUTBOX_STORE);
      if (!map) return [];
      const all = Array.from(map.values()) as OutboxMutation[];
      return all
        .filter(m => m.status === 'pending' || m.status === 'failed')
        .sort((a, b) => a.client_timestamp.localeCompare(b.client_timestamp))
        .slice(0, limit);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OUTBOX_STORE, 'readonly');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = (req.result || []) as OutboxMutation[];
        const pending = all
          .filter(m => m.status === 'pending' || m.status === 'failed')
          .sort((a, b) => a.client_timestamp.localeCompare(b.client_timestamp))
          .slice(0, limit);
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateOutboxMutation(id: string, updates: Partial<OutboxMutation>): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      const map = this.memoryStore.get(OUTBOX_STORE);
      const existing = map?.get(id) as OutboxMutation;
      if (existing) {
        map?.set(id, { ...existing, ...updates });
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        if (!getReq.result) {
          resolve();
          return;
        }
        const updated = { ...getReq.result, ...updates };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async removeOutboxMutation(id: string): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(OUTBOX_STORE)?.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearOutbox(): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(OUTBOX_STORE)?.clear();
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Migration Status Operations
  async getMigrationStatus(): Promise<LocalMigrationStatus | null> {
    const key = 'initial_localstorage_migration';
    if (this.isMemoryFallback || !this.db) {
      return (this.memoryStore.get(MIGRATION_STORE)?.get(key) as LocalMigrationStatus) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(MIGRATION_STORE, 'readonly');
      const store = tx.objectStore(MIGRATION_STORE);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveMigrationStatus(status: LocalMigrationStatus): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      this.memoryStore.get(MIGRATION_STORE)?.set(status.id, status);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(MIGRATION_STORE, 'readwrite');
      const store = tx.objectStore(MIGRATION_STORE);
      const req = store.put(status);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllStores(preserveMigrationMeta = true): Promise<void> {
    if (this.isMemoryFallback || !this.db) {
      STORES.forEach(s => this.memoryStore.get(s)?.clear());
      this.memoryStore.get(OUTBOX_STORE)?.clear();
      if (!preserveMigrationMeta) {
        this.memoryStore.get(MIGRATION_STORE)?.clear();
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const storesToClear = [...STORES, OUTBOX_STORE];
      if (!preserveMigrationMeta) {
        storesToClear.push(MIGRATION_STORE);
      }

      const tx = this.db!.transaction(storesToClear, 'readwrite');
      storesToClear.forEach(s => {
        tx.objectStore(s).clear();
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Singleton database instance
export const localDB = new IndexedDBLocalDatabase();
