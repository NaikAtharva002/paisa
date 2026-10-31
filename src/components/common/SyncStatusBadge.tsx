import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { syncEngine } from '../../lib/sync/syncEngine';
import { SyncEngineStatus } from '../../lib/sync/types';

export const SyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(updated => {
      setStatus(updated);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing || status.state === 'syncing' || !status.isOnline) return;
    setIsManualSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSpinning = status.state === 'syncing' || isManualSyncing;

  // Determine badge style and content
  if (!status.isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F2EB] border border-[#E3DDD1] text-[11px] font-medium text-[#7F899F] shadow-2xs select-none"
        title="Offline: Changes saved to encrypted local storage and will sync automatically upon reconnection."
      >
        <CloudOff className="w-3.5 h-3.5 text-[#A4ADC0]" />
        <span className="hidden sm:inline">Offline (Saved locally)</span>
        <span className="sm:hidden">Offline</span>
      </div>
    );
  }

  if (status.unresolvedConflictCount > 0) {
    return (
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[11px] font-bold text-[#92400E] shadow-2xs hover:bg-[#FDE68A] transition-all cursor-pointer"
        title={`${status.unresolvedConflictCount} conflicting edit(s) detected. Click to reconcile.`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
        <span>Conflict ({status.unresolvedConflictCount})</span>
      </button>
    );
  }

  if (isSpinning) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-medium text-[#1D4ED8] shadow-2xs select-none"
        title="Synchronizing financial records with Supabase cloud..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (status.state === 'auth_required') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-[11px] font-medium text-[#7F899F] shadow-2xs select-none"
        title="Local-only mode. Sign in to Supabase to enable multi-device cloud sync."
      >
        <Lock className="w-3.5 h-3.5 text-[#A4ADC0]" />
        <span className="hidden sm:inline">Local Vault</span>
      </div>
    );
  }

  // Default: Synced / Ready
  return (
    <button
      onClick={handleManualSync}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#EDE8E0] hover:border-[#DFD7C7] text-[11px] font-medium text-[#3D4658] shadow-2xs transition-all cursor-pointer"
      title="Cloud synchronized. Click to force check for updates."
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />
      <span className="hidden sm:inline">Synced</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57] sm:hidden" />
    </button>
  );
};
