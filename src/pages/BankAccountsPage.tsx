import React, { useState } from 'react';
import { store } from '../lib/storage';
import { Account, BankConsent } from '../types';
import { formatINR } from '../lib/calculations';
import {
  SUPPORTED_INDIAN_BANKS,
  simulateAaConsentFlow,
  syncAccountFeed,
  disconnectAccountIntegration,
  ACCOUNT_AGGREGATORS,
} from '../lib/bankAdapter';
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Building,
  Wallet,
  Lock,
  PowerOff,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const BankAccountsPage: React.FC = () => {
  const accounts = store.getAccounts();
  const profile = store.getProfile();
  const consents = store.getBankConsents();

  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['HDFC', 'ICICI']);
  const [selectedProvider, setSelectedProvider] = useState<'Setu AA' | 'Finvu' | 'OneMoney' | 'Anumati'>('Setu AA');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleToggleBank = (bankId: string) => {
    setSelectedBanks(prev =>
      prev.includes(bankId) ? prev.filter(b => b !== bankId) : [...prev, bankId]
    );
  };

  const handleStartConsent = async () => {
    setIsConnecting(true);
    try {
      const result = await simulateAaConsentFlow({
        userId: profile.user_id,
        provider: selectedProvider,
        dataRangeMonths: 6,
        consentDurationYears: 1,
        selectedFips: selectedBanks,
      });

      // Save consent record
      store.addBankConsent({
        id: `consent_${Date.now()}`,
        user_id: profile.user_id,
        provider: selectedProvider,
        consent_reference: result.consentId,
        status: 'ACTIVE',
        data_range_from: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
        data_range_to: new Date().toISOString().slice(0, 10),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        accounts_linked: result.accountsDiscovered.map(a => a.fipName),
        created_at: new Date().toISOString(),
      });

      // Add discovered accounts
      result.accountsDiscovered.forEach(acc => {
        store.addAccount({
          id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          user_id: profile.user_id,
          account_name: `${acc.fipName} (${acc.maskedAccNumber})`,
          account_type: acc.accountType,
          provider: acc.fipName,
          account_number_mask: acc.maskedAccNumber,
          balance: acc.balance,
          connection_status: 'connected',
          last_synced_at: new Date().toISOString(),
          is_demo: false,
        });
      });

      setIsConsentModalOpen(false);
      alert(`Connected ${result.accountsDiscovered.length} accounts via RBI Account Aggregator!`);
    } catch (e) {
      alert('Error during bank consent flow.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAccount = async (accId: string) => {
    setIsSyncing(accId);
    try {
      const res = await syncAccountFeed(accId);
      if (res.success) {
        alert(`Synced ${res.newTransactionsCount} new transactions (${res.duplicatesSkippedCount} duplicates skipped).`);
      } else {
        alert(res.error || 'Failed to sync account.');
      }
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDisconnectAccount = (accId: string, accName: string) => {
    if (
      confirm(
        `Disconnect ${accName}? Automated sync will pause. All existing transactions remain securely preserved in your local ledger.`
      )
    ) {
      disconnectAccountIntegration(accId);
    }
  };

  const handleRevokeConsent = (consentId: string, provider: string) => {
    if (
      confirm(
        `Revoke consent for ${provider}? Linked bank accounts will be disconnected from automatic synchronization.`
      )
    ) {
      store.revokeBankConsent(consentId);
    }
  };

  // Helper for bank logos
  const getAccountLogo = (provider: string, type: string) => {
    const lower = provider.toLowerCase();
    if (lower.includes('hdfc')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#004C8F] text-white flex items-center justify-center font-bold text-xs shadow-xs">
          HDFC
        </div>
      );
    }
    if (lower.includes('sbi')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#280071] text-white flex items-center justify-center font-bold text-xs shadow-xs">
          SBI
        </div>
      );
    }
    if (lower.includes('icici')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#9C1C24] text-white flex items-center justify-center font-bold text-xs shadow-xs">
          ICICI
        </div>
      );
    }
    if (lower.includes('paytm')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#00BAF2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
          Paytm
        </div>
      );
    }
    if (type === 'wallet' || lower.includes('cash')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#2E8B57] flex items-center justify-center shadow-xs">
          <Wallet className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] flex items-center justify-center shadow-xs font-bold text-xs">
        <Building className="w-5 h-5" />
      </div>
    );
  };

  const getStatusBadge = (status: Account['connection_status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF7EE] text-[#2E8B57] border border-[#D4EED9]">
            <CheckCircle2 className="w-3 h-3" /> Live Sync Active
          </span>
        );
      case 'consent_pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF8EA] text-[#D4952B] border border-[#FCEECB]">
            <AlertTriangle className="w-3 h-3" /> Consent Expired
          </span>
        );
      case 'sync_error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF1EE] text-[#E06D53] border border-[#FBDCD5]">
            <AlertTriangle className="w-3 h-3" /> Sync Failed
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            <PowerOff className="w-3 h-3" /> Disconnected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto pb-12">
      {/* Editorial Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Accounts & Bank Sync</h2>
            <span className="tag tag-green text-[10px]">
              <ShieldCheck className="w-3 h-3" /> RBI AA Framework
            </span>
          </div>
          <p className="text-xs text-[#7F899F]">
            Total Balance across connected accounts:{' '}
            <strong className="text-[#181D26] font-mono-num">{formatINR(totalBalance)}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsConsentModalOpen(true)}
          className="btn-primary text-xs px-4 py-2"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Connect Bank</span>
        </button>
      </div>

      {/* Account Cards List */}
      <div className="rounded-3xl bg-white border border-[#EDE8E0] shadow-card divide-y divide-[#EDE8E0] overflow-hidden">
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-[#7F899F] space-y-2">
            <Building className="w-8 h-8 mx-auto text-[#A4ADC0]" />
            <div className="text-sm font-bold text-[#181D26]">No bank accounts linked</div>
            <p className="text-xs">Connect your HDFC, SBI, or ICICI accounts safely via RBI Account Aggregator.</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div
              key={acc.id}
              className="p-5 hover:bg-[#FAF8F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {getAccountLogo(acc.provider, acc.account_type)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#181D26] truncate">{acc.account_name}</span>
                    {getStatusBadge(acc.connection_status)}
                  </div>
                  <div className="text-xs text-[#7F899F] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono-num">{acc.account_number_mask || 'XXXX 4921'}</span>
                    <span>•</span>
                    <span className="capitalize">{acc.account_type.replace('_', ' ')}</span>
                    {acc.last_synced_at && (
                      <>
                        <span>•</span>
                        <span className="text-[11px] text-slate-500">
                          Synced {new Date(acc.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#EDE8E0]">
                <div className="text-left sm:text-right">
                  <div className="text-base font-black font-mono-num text-[#181D26]">
                    {formatINR(acc.balance)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSyncAccount(acc.id)}
                    disabled={isSyncing === acc.id || acc.connection_status === 'disconnected'}
                    className="btn-icon w-8 h-8 disabled:opacity-40"
                    title="Fetch latest statement feeds"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing === acc.id ? 'animate-spin text-[#D4952B]' : 'text-[#7F899F]'}`} />
                  </button>

                  {acc.connection_status === 'connected' && (
                    <button
                      onClick={() => handleDisconnectAccount(acc.id, acc.account_name)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-[#E06D53] hover:bg-slate-100 transition-colors"
                      title="Disconnect integration (preserves past transactions)"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Active RBI AA Consent Artifacts Section */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2E8B57]" />
            <span>Active Consent Artifacts (RBI NBFC-AA)</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            {consents.filter(c => c.status === 'ACTIVE').length} Active Consents
          </span>
        </div>

        {consents.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            No active Account Aggregator consent records found.
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map(consent => (
              <div
                key={consent.id}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-[#181D26]">{consent.provider}</strong>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        consent.status === 'ACTIVE'
                          ? 'bg-[#EBF7EE] text-[#2E8B57]'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {consent.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    Ref: {consent.consent_reference}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Valid until: {consent.expiry_date} • Linked FIPs: {consent.accounts_linked.join(', ')}
                  </div>
                </div>

                {consent.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRevokeConsent(consent.id, consent.provider)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-[#EDE8E0] hover:border-[#E06D53] hover:text-[#E06D53] text-[11px] font-bold text-slate-600 transition-colors"
                  >
                    Revoke Consent
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust & DPDP Act Guarantee Card */}
      <div className="p-5 rounded-2xl bg-[#EBF7EE] border border-[#D4EED9] flex items-start gap-3 text-xs text-[#2E8B57]">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <strong className="block font-bold">100% Consent-Based RBI Account Aggregator Standard</strong>
          <p>
            PAISA complies with the Digital Personal Data Protection (DPDP) Act 2023. We never ask for or store netbanking passwords, UPI PINs, OTPs, or debit card CVVs. All feeds are read-only, digitally signed, and fully revocable by you at any time.
          </p>
        </div>
      </div>

      {/* Account Aggregator Consent Modal */}
      <Modal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        title="Connect Bank via RBI Account Aggregator"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5E687D]">
            Select your Indian banking institutions to grant secure, read-only transaction statement consent:
          </p>

          <div className="space-y-2">
            <label className="section-title text-[#7F899F]">Account Aggregator Provider</label>
            <select
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26]"
            >
              {ACCOUNT_AGGREGATORS.map(aa => (
                <option key={aa.id} value={aa.id}>
                  {aa.name} ({aa.rbiLicense}) — {aa.status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="section-title text-[#7F899F]">Select Banks (FIPs)</label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_INDIAN_BANKS.slice(0, 6).map(bank => (
                <label
                  key={bank.id}
                  className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                    selectedBanks.includes(bank.id)
                      ? 'border-[#D4952B] bg-[#FFF6E6] text-[#181D26]'
                      : 'border-[#EDE8E0] bg-[#FAF8F5] text-[#5E687D]'
                  }`}
                >
                  <span>{bank.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedBanks.includes(bank.id)}
                    onChange={() => handleToggleBank(bank.id)}
                    className="rounded accent-[#D4952B]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#EDE8E0] flex justify-end gap-2">
            <button
              onClick={() => setIsConsentModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleStartConsent}
              disabled={isConnecting || selectedBanks.length === 0}
              className="btn-primary text-xs"
            >
              {isConnecting ? 'Authorizing Consent...' : 'Authorize Bank Consent'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
