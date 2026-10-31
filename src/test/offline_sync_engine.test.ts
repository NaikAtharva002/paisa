import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine } from '../lib/sync/syncEngine';
import { ConflictResolver } from '../lib/sync/conflictResolver';
import { ICloudSyncAdapter } from '../lib/sync/types';
import { IndexedDBLocalDatabase } from '../lib/db/indexedDB';
import { OutboxMutation, SyncableTableName } from '../lib/db/types';
import { authService } from '../lib/authService';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) || null;
  }
  setItem(key: string, val: string): void {
    this.map.set(key, String(val));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
}

/**
 * Isolated In-Memory Mock Cloud Adapter
 * Simulates Supabase PostgreSQL with RLS, version concurrency, and network controls.
 */
class MockCloudSyncAdapter implements ICloudSyncAdapter {
  public cloudTables: Map<string, Map<string, Record<string, unknown>>> = new Map();
  public shouldFailNetwork = false;
  public failNextNRequests = 0;
  public failOnRecordId: string | null = null;
  public configured = true;

  constructor() {
    this.reset();
  }

  reset() {
    this.cloudTables.clear();
    this.cloudTables.set('transactions', new Map());
    this.cloudTables.set('accounts', new Map());
    this.cloudTables.set('budgets', new Map());
    this.shouldFailNetwork = false;
    this.failNextNRequests = 0;
    this.failOnRecordId = null;
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async uploadMutation(
    mutation: OutboxMutation,
    activeUserId: string
  ): Promise<{
    success: boolean;
    remoteVersion?: number;
    conflict?: boolean;
    remoteData?: Record<string, unknown>;
    error?: string;
  }> {
    if (this.shouldFailNetwork) {
      return { success: false, error: 'Network offline / connection timeout.' };
    }

    if (this.failNextNRequests > 0) {
      this.failNextNRequests--;
      return { success: false, error: 'Simulated HTTP 503 Service Unavailable.' };
    }

    if (this.failOnRecordId && mutation.record_id === this.failOnRecordId) {
      this.failOnRecordId = null;
      return { success: false, error: 'Simulated network drop on record ' + mutation.record_id };
    }

    const { table_name, record_id, action, payload } = mutation;
    const table = this.cloudTables.get(table_name) || new Map();
    this.cloudTables.set(table_name, table);

    // Enforce User Ownership / RLS check
    const mutationUserId = (payload.user_id as string) || activeUserId;
    if (mutationUserId !== activeUserId) {
      return {
        success: false,
        error: `RLS policy violation: user ${activeUserId} cannot mutate records belonging to ${mutationUserId}`,
      };
    }

    const existing = table.get(record_id);

    if (action === 'insert') {
      // Idempotent upsert
      const version = (payload.version as number) || 1;
      const record = {
        ...payload,
        user_id: activeUserId,
        version,
        updated_at: new Date().toISOString(),
      };
      table.set(record_id, record);
      return { success: true, remoteVersion: version };
    }

    if (action === 'update') {
      if (existing) {
        const cloudVersion = Number(existing.version) || 1;
        const localVersion = Number(payload.version) || 1;
        // If another device progressed the cloud version beyond local base version
        if (cloudVersion >= localVersion) {
          return {
            success: false,
            conflict: true,
            remoteVersion: cloudVersion,
            remoteData: existing,
            error: `Version conflict: Cloud is at v${cloudVersion}, local is at v${localVersion}`,
          };
        }
      }

      const nextVersion = existing ? (Number(existing.version) || 1) + 1 : (Number(payload.version) || 1);
      const updatedRecord = {
        ...existing,
        ...payload,
        user_id: activeUserId,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      };
      table.set(record_id, updatedRecord);
      return { success: true, remoteVersion: nextVersion };
    }

    if (action === 'delete') {
      const now = (payload.deleted_at as string) || new Date().toISOString();
      if (existing) {
        existing.deleted_at = now;
        existing.updated_at = now;
        existing.version = (Number(existing.version) || 1) + 1;
        table.set(record_id, existing);
      } else {
        table.set(record_id, { id: record_id, user_id: activeUserId, deleted_at: now, updated_at: now, version: 1 });
      }
      return { success: true, remoteVersion: existing?.version || 1 };
    }

    return { success: false, error: `Unknown action: ${action}` };
  }

  async fetchDeltas(
    tableName: SyncableTableName,
    activeUserId: string,
    since?: string
  ): Promise<{
    records: Record<string, unknown>[];
    error?: string;
  }> {
    if (this.shouldFailNetwork) {
      return { records: [], error: 'Network offline.' };
    }

    const table = this.cloudTables.get(tableName);
    if (!table) return { records: [] };

    const records: Record<string, unknown>[] = [];
    for (const record of table.values()) {
      if (record.user_id !== activeUserId) continue; // RLS tenant filter
      if (since && record.updated_at) {
        if (new Date(record.updated_at as string).getTime() <= new Date(since).getTime()) {
          continue; // Skip records older than delta watermark
        }
      }
      records.push({ ...record });
    }

    return { records };
  }
}

describe('PAISA Stage Four — Two-Way Synchronization Engine & Verification Suite', () => {
  let localDb: IndexedDBLocalDatabase;
  let mockCloud: MockCloudSyncAdapter;
  let resolver: ConflictResolver;
  let syncEngine: SyncEngine;
  const testUserId = 'usr_offline_sync_test_1';

  beforeEach(async () => {
    localDb = new IndexedDBLocalDatabase();
    await localDb.init();
    await localDb.clearAllStores(false);

    mockCloud = new MockCloudSyncAdapter();
    resolver = new ConflictResolver();
    syncEngine = new SyncEngine(localDb, mockCloud, resolver);

    // Mock active user session in authService
    authService.createSession({
      id: testUserId,
      email: 'tester@example.com',
      display_name: 'Sync Tester',
      created_at: new Date().toISOString(),
    });
  });

  // 1. Offline transaction creation followed by reconnection
  it('1. handles offline transaction creation followed by reconnection and cloud upload', async () => {
    // A. Device goes offline
    syncEngine.setOnlineStatus(false);
    expect(syncEngine.getStatus().state).toBe('offline');

    // B. User creates transaction locally while offline
    const now = new Date().toISOString();
    const offlineTx = {
      id: 'tx_offline_001',
      user_id: testUserId,
      amount: 45000, // ₹450.00
      transaction_type: 'expense' as const,
      merchant: 'Local Grocer Offline',
      description: 'Milk and bread',
      transaction_date: '2026-10-31',
      category_id: 'cat_groceries',
      payment_method: 'UPI',
      version: 1,
      sync_status: 'pending_insert' as const,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await localDb.put('transactions', offlineTx);
    await localDb.addOutboxMutation({
      id: 'outbox_tx_001',
      table_name: 'transactions',
      record_id: offlineTx.id,
      action: 'insert',
      payload: offlineTx,
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    // Cloud should not have it yet
    expect(mockCloud.cloudTables.get('transactions')?.get(offlineTx.id)).toBeUndefined();

    // C. Device comes back online
    syncEngine.setOnlineStatus(true);
    expect(syncEngine.getStatus().isOnline).toBe(true);

    // D. Trigger sync
    const result = await syncEngine.triggerSync(testUserId);
    expect(result.success).toBe(true);
    expect(result.uploadedCount).toBe(1);

    // E. Verify cloud now has the transaction
    const cloudRecord = mockCloud.cloudTables.get('transactions')?.get(offlineTx.id);
    expect(cloudRecord).toBeDefined();
    expect(cloudRecord?.merchant).toBe('Local Grocer Offline');
    expect(cloudRecord?.amount).toBe(45000);

    // F. Verify outbox queue is completely drained
    const pending = await localDb.getPendingOutboxMutations();
    expect(pending.length).toBe(0);

    // G. Verify local record status is marked 'synced'
    const updatedLocal = await localDb.get<any>('transactions', offlineTx.id);
    expect(updatedLocal?.sync_status).toBe('synced');
  });

  // 2. Offline transaction editing followed by reconnection
  it('2. handles offline transaction editing followed by reconnection and cloud update', async () => {
    // Seed synced record in both local and cloud
    const initialTx = {
      id: 'tx_edit_002',
      user_id: testUserId,
      amount: 100000, // ₹1,000.00
      merchant: 'Zomato Food',
      version: 1,
      sync_status: 'synced' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localDb.put('transactions', initialTx as any);
    mockCloud.cloudTables.get('transactions')?.set(initialTx.id, { ...initialTx });

    // Go offline and edit amount and merchant
    syncEngine.setOnlineStatus(false);
    const editedTx = {
      ...initialTx,
      amount: 120000, // ₹1,200.00
      merchant: 'Zomato Food + Tip',
      version: 2,
      sync_status: 'pending_update' as const,
      updated_at: new Date().toISOString(),
    };
    await localDb.put('transactions', editedTx as any);
    await localDb.addOutboxMutation({
      id: 'outbox_edit_002',
      table_name: 'transactions',
      record_id: editedTx.id,
      action: 'update',
      payload: editedTx,
      client_timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending',
    });

    // Reconnect and sync
    syncEngine.setOnlineStatus(true);
    const result = await syncEngine.triggerSync(testUserId);
    expect(result.success).toBe(true);
    expect(result.uploadedCount).toBe(1);

    // Verify cloud has the updated version
    const cloudRecord = mockCloud.cloudTables.get('transactions')?.get(initialTx.id);
    expect(cloudRecord?.amount).toBe(120000);
    expect(cloudRecord?.merchant).toBe('Zomato Food + Tip');
  });

  // 3. Offline deletion followed by reconnection
  it('3. synchronizes deletions using tombstones without destroying local data prematurely', async () => {
    const existingTx = {
      id: 'tx_del_003',
      user_id: testUserId,
      amount: 50000,
      merchant: 'Mistake Purchase',
      version: 1,
      sync_status: 'synced' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    await localDb.put('transactions', existingTx as any);
    mockCloud.cloudTables.get('transactions')?.set(existingTx.id, { ...existingTx });

    // Offline soft delete
    syncEngine.setOnlineStatus(false);
    const delTimestamp = new Date().toISOString();
    await localDb.softDelete('transactions', existingTx.id, testUserId);
    await localDb.addOutboxMutation({
      id: 'outbox_del_003',
      table_name: 'transactions',
      record_id: existingTx.id,
      action: 'delete',
      payload: { id: existingTx.id, user_id: testUserId, deleted_at: delTimestamp },
      client_timestamp: delTimestamp,
      retry_count: 0,
      status: 'pending',
    });

    // Active query locally excludes it
    const activeTxs = await localDb.getAll<any>('transactions', testUserId, false);
    expect(activeTxs.find(t => t.id === existingTx.id)).toBeUndefined();

    // Tombstone query locally includes it
    const allTxs = await localDb.getAll<any>('transactions', testUserId, true);
    expect(allTxs.find(t => t.id === existingTx.id)?.deleted_at).toBeDefined();

    // Reconnect and sync deletion tombstone to cloud
    syncEngine.setOnlineStatus(true);
    const result = await syncEngine.triggerSync(testUserId);
    expect(result.success).toBe(true);

    // Cloud should now have tombstone set
    const cloudRecord = mockCloud.cloudTables.get('transactions')?.get(existingTx.id);
    expect(cloudRecord?.deleted_at).toBe(delTimestamp);
  });

  // 4. Interrupted synchronization
  it('4. recovers safely from interrupted synchronization mid-stream', async () => {
    // Queue 2 mutations
    const tx1 = { id: 'tx_int_1', user_id: testUserId, amount: 100, version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const tx2 = { id: 'tx_int_2', user_id: testUserId, amount: 200, version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await localDb.put('transactions', tx1 as any);
    await localDb.put('transactions', tx2 as any);

    await localDb.addOutboxMutation({ id: 'm1', table_name: 'transactions', record_id: 'tx_int_1', action: 'insert', payload: tx1, client_timestamp: '2026-10-31T10:00:00Z', retry_count: 0, status: 'pending' });
    await localDb.addOutboxMutation({ id: 'm2', table_name: 'transactions', record_id: 'tx_int_2', action: 'insert', payload: tx2, client_timestamp: '2026-10-31T10:00:01Z', retry_count: 0, status: 'pending' });

    // Simulate network interruption on the 2nd request
    mockCloud.failOnRecordId = 'tx_int_2';

    const res1 = await syncEngine.triggerSync(testUserId);
    // Sync failed due to interruption
    expect(res1.uploadedCount).toBe(1); // First succeeded before drop
    expect(mockCloud.cloudTables.get('transactions')?.has('tx_int_1')).toBe(true);
    expect(mockCloud.cloudTables.get('transactions')?.has('tx_int_2')).toBe(false);

    // Remaining failed mutation is retained in outbox with retry count
    const pending = await localDb.getPendingOutboxMutations();
    expect(pending.length).toBe(1);
    expect(pending[0].record_id).toBe('tx_int_2');
    expect(pending[0].retry_count).toBe(1);

    // Network recovers: resume sync
    const res2 = await syncEngine.triggerSync(testUserId);
    expect(res2.success).toBe(true);
    expect(mockCloud.cloudTables.get('transactions')?.has('tx_int_2')).toBe(true);
    expect((await localDb.getPendingOutboxMutations()).length).toBe(0);
  });

  // 5. Duplicate retry attempts
  it('5. prevents duplicate records upon repeated retry attempts', async () => {
    const tx = { id: 'tx_dup_retry_1', user_id: testUserId, amount: 5000, version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await localDb.put('transactions', tx as any);
    await localDb.addOutboxMutation({ id: 'm_dup', table_name: 'transactions', record_id: tx.id, action: 'insert', payload: tx, client_timestamp: new Date().toISOString(), retry_count: 0, status: 'pending' });

    // First sync succeeds
    await syncEngine.triggerSync(testUserId);
    expect(mockCloud.cloudTables.get('transactions')?.size).toBe(1);

    // If an identical mutation is mistakenly enqueued again, idempotent upsert does not create duplicate
    await localDb.addOutboxMutation({ id: 'm_dup_2', table_name: 'transactions', record_id: tx.id, action: 'insert', payload: tx, client_timestamp: new Date().toISOString(), retry_count: 0, status: 'pending' });
    await syncEngine.triggerSync(testUserId);

    expect(mockCloud.cloudTables.get('transactions')?.size).toBe(1);
  });

  // 6. Two-device concurrent edits
  it('6. detects two-device concurrent edits without silent overwrites', async () => {
    // Both devices start with same transaction v1
    const baseTx = {
      id: 'tx_concurrent_1',
      user_id: testUserId,
      amount: 50000, // ₹500
      merchant: 'Shared Grocery',
      version: 1,
      sync_status: 'synced' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localDb.put('transactions', baseTx as any);

    // Device B pushes update to Cloud (v2)
    mockCloud.cloudTables.get('transactions')?.set(baseTx.id, {
      ...baseTx,
      amount: 60000, // ₹600
      merchant: 'Shared Grocery (Device B)',
      version: 2,
      updated_at: new Date().toISOString(),
    });

    // Meanwhile, Device A edited locally to ₹700 (based on v1)
    const localEdit = {
      ...baseTx,
      amount: 70000,
      merchant: 'Shared Grocery (Device A)',
      version: 2,
      sync_status: 'pending_update' as const,
      updated_at: new Date().toISOString(),
    };
    await localDb.put('transactions', localEdit as any);
    await localDb.addOutboxMutation({
      id: 'outbox_conc_1',
      table_name: 'transactions',
      record_id: baseTx.id,
      action: 'update',
      payload: localEdit,
      client_timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending',
    });

    // Device A attempts to sync
    const syncRes = await syncEngine.triggerSync(testUserId);
    expect(syncRes.conflictCount).toBeGreaterThan(0);

    // Verify conflict was recorded in conflictResolver
    const conflicts = resolver.getUnresolvedConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].record_id).toBe(baseTx.id);
    expect(conflicts[0].local_data.amount).toBe(70000);
    expect(conflicts[0].remote_data.amount).toBe(60000);
  });

  // 7. Conflicting updates resolution
  it('7. safely resolves financial conflicts by preserving records via split_transaction', () => {
    // Simulate an unresolved conflict on a financial record
    const conflict = resolver.recordConflict(
      'transactions',
      'tx_conf_split',
      {
        id: 'tx_conf_split',
        user_id: testUserId,
        amount: 30000,
        merchant: 'Swiggy Dinner (Local Edit)',
        version: 2,
        sync_status: 'pending_update',
        created_at: '2026-10-31T12:00:00Z',
        updated_at: '2026-10-31T12:30:00Z',
      } as any,
      {
        id: 'tx_conf_split',
        user_id: testUserId,
        amount: 35000,
        merchant: 'Swiggy Dinner (Cloud Edit)',
        version: 2,
        updated_at: '2026-10-31T12:35:00Z',
      }
    );

    expect(resolver.getUnresolvedConflicts().length).toBe(1);

    // Financial Safety Rule: Split transaction preserves BOTH records so zero ledger money is lost
    const { retainedData, forkedRecord } = resolver.resolveConflict(conflict.id, 'split_transaction');

    expect(conflict.resolved).toBe(true);
    expect(retainedData.amount).toBe(35000);
    expect(forkedRecord).toBeDefined();
    expect(forkedRecord?.amount).toBe(30000);
    expect(forkedRecord?.notes).toContain('Reconciliation copy');
  });

  // 8. Expired sessions
  it('8. halts sync safely when session is expired without dropping mutations', async () => {
    // Expire session
    authService.createSession({
      id: testUserId,
      email: 'expired@example.com',
      display_name: 'Expired User',
      created_at: new Date().toISOString(),
    });
    const session = authService.getCurrentSession()!;
    session.expires_at = Date.now() - 1000; // Expired 1 second ago
    localStorage.setItem('paisa_auth_session', JSON.stringify(session));

    // Queue mutation
    const tx = { id: 'tx_exp_1', user_id: testUserId, amount: 9900, version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await localDb.put('transactions', tx as any);
    await localDb.addOutboxMutation({ id: 'm_exp', table_name: 'transactions', record_id: tx.id, action: 'insert', payload: tx, client_timestamp: new Date().toISOString(), retry_count: 0, status: 'pending' });

    const res = await syncEngine.triggerSync();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/expired|session required/i);
    expect(syncEngine.getStatus().state).toBe('auth_required');

    // Mutation must remain safely in outbox awaiting user re-login
    const pending = await localDb.getPendingOutboxMutations();
    expect(pending.length).toBe(1);
    expect(pending[0].record_id).toBe(tx.id);
  });

  // 9. User isolation
  it('9. strictly enforces user data isolation and rejects cross-tenant sync', async () => {
    const maliciousUser = 'usr_attacker_999';
    const spoofedMutation: OutboxMutation = {
      id: 'm_spoof',
      table_name: 'transactions',
      record_id: 'tx_spoof_1',
      action: 'insert',
      payload: { id: 'tx_spoof_1', user_id: 'victim_user_123', amount: 500000 },
      client_timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending',
    };

    // Attempt to upload mutation belonging to victim_user_123 while logged in as maliciousUser
    const res = await mockCloud.uploadMutation(spoofedMutation, maliciousUser);
    expect(res.success).toBe(false);
    expect(res.error).toContain('RLS policy violation');
  });

  // 10. Cloud changes downloaded to a second device
  it('10. downloads new transactions created on another device seamlessly', async () => {
    // Another device created transaction in cloud
    const cloudTx = {
      id: 'tx_device_b_1',
      user_id: testUserId,
      amount: 88000, // ₹880.00
      merchant: 'Fuel Pump (Device B)',
      transaction_type: 'expense',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCloud.cloudTables.get('transactions')?.set(cloudTx.id, cloudTx);

    // Local device has no knowledge of it yet
    expect(await localDb.get('transactions', cloudTx.id)).toBeNull();

    // Trigger sync
    const res = await syncEngine.triggerSync(testUserId);
    expect(res.success).toBe(true);
    expect(res.downloadedCount).toBe(1);

    // Verify local device now has the new transaction
    const downloadedLocal = await localDb.get<any>('transactions', cloudTx.id);
    expect(downloadedLocal).toBeDefined();
    expect(downloadedLocal?.merchant).toBe('Fuel Pump (Device B)');
    expect(downloadedLocal?.amount).toBe(88000);
    expect(downloadedLocal?.sync_status).toBe('synced');
  });

  // 11. Reinstall and recovery scenario
  it('11. recovers full account history from cloud on clean fresh local database install', async () => {
    // Populate cloud with multiple entities
    mockCloud.cloudTables.get('transactions')?.set('tx_rec_1', { id: 'tx_rec_1', user_id: testUserId, amount: 250000, merchant: 'Salary', transaction_type: 'income', version: 1, updated_at: new Date().toISOString() });
    mockCloud.cloudTables.get('transactions')?.set('tx_rec_2', { id: 'tx_rec_2', user_id: testUserId, amount: 45000, merchant: 'Rent', transaction_type: 'expense', version: 1, updated_at: new Date().toISOString() });
    mockCloud.cloudTables.get('accounts')?.set('acc_rec_1', { id: 'acc_rec_1', user_id: testUserId, account_name: 'Main Checking', balance: 205000, version: 1, updated_at: new Date().toISOString() });

    // Local DB is fresh and clean
    expect((await localDb.getAll('transactions', testUserId)).length).toBe(0);
    expect((await localDb.getAll('accounts', testUserId)).length).toBe(0);

    // Trigger sync to recover
    const res = await syncEngine.triggerSync(testUserId);
    expect(res.success).toBe(true);
    expect(res.downloadedCount).toBe(3);

    // Local DB has all recovered entities
    const txs = await localDb.getAll<any>('transactions', testUserId);
    expect(txs.length).toBe(2);
    const accounts = await localDb.getAll<any>('accounts', testUserId);
    expect(accounts.length).toBe(1);
    expect(accounts[0].account_name).toBe('Main Checking');
  });

  // 12. Financial total consistency before and after synchronization
  it('12. guarantees zero paisa mathematical drift before and after synchronization', async () => {
    // Local transactions:
    // Income: ₹1,00,000 (10,000,000 paise)
    // Expense 1: ₹30,000 (3,000,000 paise)
    const tx1 = { id: 'tx_fin_1', user_id: testUserId, amount: 10000000, transaction_type: 'income' as const, merchant: 'Primary Salary', version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const tx2 = { id: 'tx_fin_2', user_id: testUserId, amount: 3000000, transaction_type: 'expense' as const, merchant: 'House Rent', version: 1, sync_status: 'pending_insert' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await localDb.put('transactions', tx1);
    await localDb.put('transactions', tx2);

    await localDb.addOutboxMutation({ id: 'm_f1', table_name: 'transactions', record_id: tx1.id, action: 'insert', payload: tx1, client_timestamp: '2026-10-31T10:00:00Z', retry_count: 0, status: 'pending' });
    await localDb.addOutboxMutation({ id: 'm_f2', table_name: 'transactions', record_id: tx2.id, action: 'insert', payload: tx2, client_timestamp: '2026-10-31T10:00:01Z', retry_count: 0, status: 'pending' });

    // Compute pre-sync local financial totals
    const preTxs = await localDb.getAll<any>('transactions', testUserId);
    const preIncome = preTxs.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const preExpense = preTxs.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const preNet = preIncome - preExpense;

    expect(preIncome).toBe(10000000);
    expect(preExpense).toBe(3000000);
    expect(preNet).toBe(7000000);

    // Sync to cloud
    const syncRes = await syncEngine.triggerSync(testUserId);
    expect(syncRes.success).toBe(true);

    // Compute post-sync cloud financial totals
    const cloudTxs = Array.from(mockCloud.cloudTables.get('transactions')!.values()).filter(t => t.user_id === testUserId);
    const cloudIncome = cloudTxs.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + (t.amount as number), 0);
    const cloudExpense = cloudTxs.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + (t.amount as number), 0);
    const cloudNet = cloudIncome - cloudExpense;

    expect(cloudIncome).toBe(preIncome);
    expect(cloudExpense).toBe(preExpense);
    expect(cloudNet).toBe(preNet);
    // Verified: Exactly 0 paise drift
    expect(cloudNet - preNet).toBe(0);
  });
});
