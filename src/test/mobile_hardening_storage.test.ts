import { describe, it, expect, beforeEach } from 'vitest';
import { CapacitorHardenedDatabase, requestPersistentStorage } from '../lib/db/capacitorSqlite';
import { SyncedEntity } from '../lib/db/types';
import { Transaction } from '../types';

describe('PAISA Stage Five — Mobile Hardening & Native Storage Persistence Suite', () => {
  let db: CapacitorHardenedDatabase;
  const testUserId = 'usr_mobile_test_1';

  beforeEach(async () => {
    db = new CapacitorHardenedDatabase();
    await db.init();
    await db.clearAllStores(false);
  });

  it('1. requests persistent storage quota gracefully across all platform environments', async () => {
    const res = await requestPersistentStorage();
    expect(res).toBeDefined();
    expect(typeof res.persisted).toBe('boolean');
  });

  it('2. performs atomic offline CRUD on hardened local storage layer', async () => {
    const now = new Date().toISOString();
    const tx: SyncedEntity<Transaction> = {
      id: 'tx_mobile_001',
      user_id: testUserId,
      amount: 150000, // ₹1,500.00
      transaction_type: 'expense',
      merchant: 'Petrol Bunk',
      transaction_date: '2026-10-31',
      category_id: 'cat_transport',
      payment_method: 'Debit card',
      version: 1,
      sync_status: 'pending_insert',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    // Insert
    await db.put('transactions', tx);
    const retrieved = await db.get<Transaction>('transactions', tx.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.merchant).toBe('Petrol Bunk');
    expect(retrieved?.amount).toBe(150000);

    // Update
    const updated = {
      ...retrieved!,
      amount: 160000,
      version: 2,
      sync_status: 'pending_update' as const,
      updated_at: new Date().toISOString(),
    };
    await db.put('transactions', updated);
    const postUpdate = await db.get<Transaction>('transactions', tx.id);
    expect(postUpdate?.amount).toBe(160000);
    expect(postUpdate?.version).toBe(2);

    // Soft delete
    const delSuccess = await db.softDelete('transactions', tx.id, testUserId);
    expect(delSuccess).toBe(true);

    const activeList = await db.getAll<Transaction>('transactions', testUserId, false);
    expect(activeList.find(t => t.id === tx.id)).toBeUndefined();

    const tombstoneList = await db.getAll<Transaction>('transactions', testUserId, true);
    expect(tombstoneList.find(t => t.id === tx.id)?.deleted_at).toBeDefined();
  });

  it('3. captures and queues durable mobile outbox mutations during airplane mode', async () => {
    const now = new Date().toISOString();
    await db.addOutboxMutation({
      id: 'm_airplane_1',
      table_name: 'transactions',
      record_id: 'tx_airplane_1',
      action: 'insert',
      payload: { id: 'tx_airplane_1', amount: 5000 },
      client_timestamp: now,
      retry_count: 0,
      status: 'pending',
    });

    const pending = await db.getPendingOutboxMutations();
    expect(pending.length).toBe(1);
    expect(pending[0].record_id).toBe('tx_airplane_1');

    await db.updateOutboxMutation('m_airplane_1', { status: 'failed', error_message: 'Airplane mode active' });
    const updatedPending = await db.getPendingOutboxMutations();
    expect(updatedPending[0].status).toBe('failed');
    expect(updatedPending[0].error_message).toBe('Airplane mode active');

    await db.removeOutboxMutation('m_airplane_1');
    expect((await db.getPendingOutboxMutations()).length).toBe(0);
  });
});
