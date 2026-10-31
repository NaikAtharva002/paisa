import { SyncableTableName, OutboxMutation, SyncedEntity } from '../db/types';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'auth_required' | 'conflict';

export interface SyncEngineStatus {
  state: SyncState;
  isOnline: boolean;
  isAuthenticated: boolean;
  pendingOutboxCount: number;
  unresolvedConflictCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface SyncConflict {
  id: string; // UUID
  table_name: SyncableTableName;
  record_id: string;
  local_version: number;
  remote_version: number;
  local_data: Record<string, unknown>;
  remote_data: Record<string, unknown>;
  detected_at: string;
  resolved: boolean;
  resolution_strategy?: 'keep_local' | 'accept_remote' | 'manual_merge' | 'split_transaction';
  resolution_notes?: string;
  resolved_at?: string;
}

export type ConflictResolutionChoice = 'keep_local' | 'accept_remote' | 'split_transaction';

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  conflictCount: number;
  error?: string;
  timestamp: string;
}

export interface ICloudSyncAdapter {
  isConfigured(): boolean;
  uploadMutation(
    mutation: OutboxMutation,
    activeUserId: string
  ): Promise<{
    success: boolean;
    remoteVersion?: number;
    conflict?: boolean;
    remoteData?: Record<string, unknown>;
    error?: string;
  }>;
  fetchDeltas(
    tableName: SyncableTableName,
    activeUserId: string,
    since?: string
  ): Promise<{
    records: Record<string, unknown>[];
    error?: string;
  }>;
}
