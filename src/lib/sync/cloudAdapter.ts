import { ICloudSyncAdapter } from './types';
import { OutboxMutation, SyncableTableName } from '../db/types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseCloudSyncAdapter implements ICloudSyncAdapter {
  private customClient: SupabaseClient | null = null;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.customClient = client;
    }
  }

  private getClient(): SupabaseClient | null {
    return this.customClient || supabase;
  }

  isConfigured(): boolean {
    if (this.customClient) return true;
    return isSupabaseConfigured && Boolean(supabase);
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
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not configured or in offline mode.' };
    }

    const { table_name, record_id, action, payload } = mutation;

    // Security check: ensure mutation belongs to active user
    const mutationUserId = (payload.user_id as string) || activeUserId;
    if (mutationUserId !== activeUserId) {
      return {
        success: false,
        error: `Security violation: Mutation user_id (${mutationUserId}) does not match active user (${activeUserId}).`,
      };
    }

    try {
      if (action === 'insert') {
        // Idempotent upsert by primary key id
        const { data, error } = await client
          .from(table_name)
          .upsert({ ...payload, user_id: activeUserId })
          .select()
          .maybeSingle();

        if (error) {
          // If conflict/unique violation or version mismatch
          if (error.code === '23505' || error.message.includes('conflict')) {
            return { success: false, conflict: true, error: error.message };
          }
          return { success: false, error: error.message };
        }

        return { success: true, remoteVersion: (data as any)?.version || (payload.version as number) || 1 };
      }

      if (action === 'update') {
        // Check current remote record for version conflict
        const { data: remoteRecord, error: fetchErr } = await client
          .from(table_name)
          .select('*')
          .eq('id', record_id)
          .eq('user_id', activeUserId)
          .maybeSingle();

        if (fetchErr) {
          return { success: false, error: fetchErr.message };
        }

        if (remoteRecord) {
          const remoteVer = Number(remoteRecord.version) || 1;
          const localBaseVer = (Number(payload.version) || 2) - 1;

          // If remote version has progressed past what local was modifying, detect conflict
          if (remoteVer > localBaseVer) {
            return {
              success: false,
              conflict: true,
              remoteVersion: remoteVer,
              remoteData: remoteRecord as Record<string, unknown>,
              error: `Version conflict: Cloud version is v${remoteVer}, but local was based on v${localBaseVer}.`,
            };
          }
        }

        const { data, error } = await client
          .from(table_name)
          .update({ ...payload, user_id: activeUserId })
          .eq('id', record_id)
          .eq('user_id', activeUserId)
          .select()
          .maybeSingle();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, remoteVersion: (data as any)?.version || (payload.version as number) };
      }

      if (action === 'delete') {
        // Soft delete using tombstone
        const now = (payload.deleted_at as string) || new Date().toISOString();
        const { data, error } = await client
          .from(table_name)
          .update({ deleted_at: now, updated_at: now })
          .eq('id', record_id)
          .eq('user_id', activeUserId)
          .select()
          .maybeSingle();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, remoteVersion: (data as any)?.version };
      }

      return { success: false, error: `Unsupported mutation action: ${action}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure during upload.';
      return { success: false, error: msg };
    }
  }

  async fetchDeltas(
    tableName: SyncableTableName,
    activeUserId: string,
    since?: string
  ): Promise<{
    records: Record<string, unknown>[];
    error?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { records: [], error: 'Supabase client is not configured.' };
    }

    try {
      let query = client
        .from(tableName)
        .select('*')
        .eq('user_id', activeUserId)
        .order('updated_at', { ascending: true });

      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data, error } = await query;
      if (error) {
        return { records: [], error: error.message };
      }

      return { records: (data as Record<string, unknown>[]) || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch cloud deltas.';
      return { records: [], error: msg };
    }
  }
}

export const defaultCloudAdapter = new SupabaseCloudSyncAdapter();
