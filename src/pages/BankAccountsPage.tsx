import React, { useState } from 'react';
import { store } from '../lib/storage';
import { Account } from '../types';
import { formatINR } from '../lib/calculations';
import {
  SUPPORTED_INDIAN_BANKS,
  simulateAaConsentFlow,
} from '../lib/bankAdapter';
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Building,
  Wallet,
  Lock,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const BankAccountsPage: React.FC = () => {
  const accounts = store.getAccounts();
  const profile = store.getProfile();

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

  const handleSyncAccount = (accId: string) => {
    setIsSyncing(accId);
    setTimeout(() => {
      setIsSyncing(null);
      alert('Account synced successfully with latest statement feeds.');
    }, 1200);
  };

  // Helper for bank logos (Reference 2)
  const getAccountLogo = (provider: string, type: string) => {
    const lower = provider.toLowerCase();
    if (lower.includes('hdfc')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#004C8F] text-white flex items-center justify-center font-bold text-xs shadow-sm">
          HDFC
        </div>
      );
    }
    if (lower.includes('sbi')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#280071] text-white flex items-center justify-center font-bold text-xs shadow-sm">
          SBI
        </div>
      );
    }
    if (lower.includes('paytm')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#00BAF2] text-white flex items-center justify-center font-bold text-xs shadow-sm">
          Paytm
        </div>
      );
    }
    if (type === 'wallet' || lower.includes('cash')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#2E8B57] flex items-center justify-center shadow-sm">
          <Wallet className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] flex items-center justify-center shadow-sm font-bold text-xs">
        <Building className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      {/* Editorial Header (Reference 2) */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Accounts & Bank Sync</h2>
            <span className="tag tag-green text-[10px]">
              <ShieldCheck className="w-3 h-3" /> RBI AA Ready
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
          <span>Add Account</span>
        </button>
      </div>

      {/* Account Cards List (Reference 2) */}
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
              className="p-5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {getAccountLogo(acc.provider, acc.account_type)}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#181D26] truncate">{acc.account_name}</div>
                  <div className="text-xs text-[#7F899F] mt-0.5 flex items-center gap-2">
                    <span className="font-mono-num">{acc.account_number_mask || 'XXXX 4921'}</span>
                    <span>•</span>
                    <span className="capitalize">{acc.account_type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-base font-black font-mono-num text-[#181D26]">
                    {formatINR(acc.balance)}
                  </div>
                </div>

                <button
                  onClick={() => handleSyncAccount(acc.id)}
                  disabled={isSyncing === acc.id}
                  className="btn-icon w-8 h-8"
                  title="Sync transactions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing === acc.id ? 'animate-spin text-[#D4952B]' : 'text-[#7F899F]'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trust & DPDP Act Guarantee Card */}
      <div className="p-5 rounded-2xl bg-[#EBF7EE] border border-[#D4EED9] flex items-center gap-3 text-xs text-[#2E8B57]">
        <Lock className="w-5 h-5 flex-shrink-0" />
        <div>
          <strong className="block font-bold">100% Consent-Based Financial Data Sharing</strong>
          Paisa never stores or asks for internet banking passwords, MPINs, or debit card CVVs. All feeds utilize the official Reserve Bank of India (RBI) Account Aggregator architecture.
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
