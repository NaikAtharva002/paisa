import { SyncableTableName, SyncedEntity } from '../db/types';
import { SyncConflict, ConflictResolutionChoice } from './types';

export class ConflictResolver {
  private conflicts: Map<string, SyncConflict> = new Map();
  private listeners: Set<(conflicts: SyncConflict[]) => void> = new Set();

  subscribe(listener: (conflicts: SyncConflict[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getAllConflicts();
    this.listeners.forEach(fn => fn(list));
  }

  getAllConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  getUnresolvedConflicts(): SyncConflict[] {
    return this.getAllConflicts().filter(c => !c.resolved);
  }

  getConflictById(id: string): SyncConflict | undefined {
    return this.conflicts.get(id);
  }

  /**
   * Evaluates if a local entity and remote payload conflict.
   * A conflict exists if:
   * 1. Remote version is different from the version the client originally based its change on.
   * 2. Key financial fields (amount, merchant, category, type, date) differ.
   */
  hasConflict(
    localEntity: SyncedEntity<Record<string, unknown>>,
    remoteRecord: Record<string, unknown>
  ): boolean {
    const remoteVersion = Number(remoteRecord.version) || 1;
    const localVersion = Number(localEntity.version) || 1;

    // If versions match and data matches, no conflict
    if (remoteVersion === localVersion) {
      return false;
    }

    // Check if meaningful fields differ (to avoid false conflicts from whitespace or timestamps)
    const significantKeys = ['amount', 'merchant', 'description', 'category_id', 'transaction_type', 'name', 'balance', 'allocated_amount', 'target_amount'];
    let hasFieldDivergence = false;

    for (const key of significantKeys) {
      if (key in localEntity && key in remoteRecord) {
        if (localEntity[key] !== remoteRecord[key]) {
          hasFieldDivergence = true;
          break;
        }
      }
    }

    // Also check if remote was deleted while local was updated
    const remoteDeleted = Boolean(remoteRecord.deleted_at);
    const localDeleted = Boolean(localEntity.deleted_at);
    if (remoteDeleted !== localDeleted) {
      return true;
    }

    return hasFieldDivergence;
  }

  /**
   * Registers a newly detected conflict and stores both versions safely.
   */
  recordConflict(
    tableName: SyncableTableName,
    recordId: string,
    localData: SyncedEntity<Record<string, unknown>>,
    remoteData: Record<string, unknown>
  ): SyncConflict {
    const conflictId = `conflict_${tableName}_${recordId}_${Date.now()}`;
    const conflict: SyncConflict = {
      id: conflictId,
      table_name: tableName,
      record_id: recordId,
      local_version: Number(localData.version) || 1,
      remote_version: Number(remoteData.version) || 1,
      local_data: { ...localData },
      remote_data: { ...remoteData },
      detected_at: new Date().toISOString(),
      resolved: false,
    };

    this.conflicts.set(conflictId, conflict);
    this.notify();
    return conflict;
  }

  /**
   * Resolves a conflict using the user's explicit choice.
   * Financial Safety Rule: Never silently drop records.
   */
  resolveConflict(
    conflictId: string,
    choice: ConflictResolutionChoice,
    resolutionNotes?: string
  ): {
    conflict: SyncConflict;
    retainedData: Record<string, unknown>;
    forkedRecord?: Record<string, unknown>;
  } {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found.`);
    }

    const now = new Date().toISOString();
    let retainedData: Record<string, unknown>;
    let forkedRecord: Record<string, unknown> | undefined;

    switch (choice) {
      case 'keep_local':
        // Retain local draft, increment version beyond remote to win in cloud
        retainedData = {
          ...conflict.local_data,
          version: Math.max(conflict.local_version, conflict.remote_version) + 1,
          updated_at: now,
          sync_status: 'pending_update',
        };
        break;

      case 'accept_remote':
        // Overwrite local with remote data
        retainedData = {
          ...conflict.remote_data,
          sync_status: 'synced',
          last_synced_at: now,
        };
        break;

      case 'split_transaction':
        // Fork transaction: Keep remote transaction in ledger, and create a new local transaction
        // for the local edits so no expense or income record is lost.
        retainedData = {
          ...conflict.remote_data,
          sync_status: 'synced',
        };
        forkedRecord = {
          ...conflict.local_data,
          id: `tx_reconciled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          notes: `Reconciliation copy preserved from conflict on ${conflict.record_id}: ${conflict.local_data.notes || ''}`.trim(),
          version: 1,
          sync_status: 'pending_insert',
          created_at: now,
          updated_at: now,
        };
        break;

      default:
        throw new Error(`Unknown resolution choice: ${choice}`);
    }

    conflict.resolved = true;
    conflict.resolution_strategy = choice;
    conflict.resolution_notes = resolutionNotes || `Resolved via ${choice}`;
    conflict.resolved_at = now;

    this.notify();
    return { conflict, retainedData, forkedRecord };
  }

  clearResolved(): void {
    for (const [id, c] of this.conflicts.entries()) {
      if (c.resolved) {
        this.conflicts.delete(id);
      }
    }
    this.notify();
  }

  reset(): void {
    this.conflicts.clear();
    this.notify();
  }
}

export const conflictResolver = new ConflictResolver();
