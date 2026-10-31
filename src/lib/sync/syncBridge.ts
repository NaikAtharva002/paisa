import { localDB } from '../db/indexedDB';
import { SyncableTableName, SyncedEntity } from '../db/types';

/**
 * Bridges synchronous UI store mutations into IndexedDB and enqueues outbox mutations.
 * Operates asynchronously and non-blockingly so UI response times remain instantaneous (<2ms).
 */
export function recordLocalStoreMutation(
  table: SyncableTableName,
  action: 'insert' | 'update' | 'delete',
  recordId: string,
  userId: string,
  data: Record<string, unknown>
): void {
  // Execute asynchronously in background
  (async () => {
    try {
      const now = new Date().toISOString();
      const existing = await localDB.get<Record<string, unknown>>(table, recordId);
      const nextVersion = existing ? (Number(existing.version) || 1) + 1 : 1;

      if (action === 'delete') {
        await localDB.softDelete(table, recordId, userId);
        await localDB.addOutboxMutation({
          id: `outbox_${table}_del_${recordId}_${Date.now()}`,
          table_name: table,
          record_id: recordId,
          action: 'delete',
          payload: { id: recordId, user_id: userId, deleted_at: now },
          client_timestamp: now,
          retry_count: 0,
          status: 'pending',
        });
      } else {
        const entity: SyncedEntity<Record<string, unknown>> = {
          ...data,
          id: recordId,
          user_id: userId,
          version: nextVersion,
          sync_status: action === 'insert' ? 'pending_insert' : 'pending_update',
          created_at: (data.created_at as string) || now,
          updated_at: now,
          deleted_at: null,
        };
        await localDB.put(table, entity);
        await localDB.addOutboxMutation({
          id: `outbox_${table}_${action}_${recordId}_v${nextVersion}`,
          table_name: table,
          record_id: recordId,
          action,
          payload: entity,
          client_timestamp: now,
          retry_count: 0,
          status: 'pending',
        });
      }
    } catch (err) {
      console.warn(`Could not mirror store mutation to IndexedDB outbox for ${table}:${recordId}:`, err);
    }
  })();
}
