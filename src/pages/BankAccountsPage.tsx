import React, { useState } from 'react';
import { store } from '../lib/storage';
import { Account, BankConsent } from '../types';
import { formatINR } from '../lib/calculations';
import {
  SUPPORTED_INDIAN_BANKS,
  ACCOUNT_AGGREGATORS,
  simulateAaConsentFlow,
  generateSimulatedBankFeed,
} from '../lib/bankAdapter';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Unlink,
  ExternalLink,
  Lock,
  AlertTriangle,
  Info,
  Building,
} from 'lucide-react';

export const BankAccountsPage: React.FC = () => {
  const accounts = store.getAccounts();
  const consents = store.getBankConsents();
  const profile = store.getProfile();

  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['HDFC', 'ICICI']);
  const [selectedProvider, setSelectedProvider] = useState<'Setu AA' | 'Finvu' | 'OneMoney' | 'Anumati'>('Setu AA');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Disconnect modal state
  const [disconnectingAccount, setDisconnectingAccount] = useState<Account | null>(null);

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
          is_demo: true,
        });
      });

      setIsConsentModalOpen(false);
      alert(`Successfully linked bank accounts via ${selectedProvider}! (Sandbox Mode)`);
    } catch (e) {
      alert('Error initiating consent flow.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAccount = async (acc: Account) => {
    setIsSyncing(acc.id);
    await new Promise(r => setTimeout(r, 600));

    // Fetch simulated fresh transactions
    const newTxs = generateSimulatedBankFeed(acc, 2);
    store.addTransactionsBulk(newTxs);
    store.updateAccount(acc.id, { last_synced_at: new Date().toISOString() });

    setIsSyncing(null);
    alert(`Fetched 2 fresh transactions from ${acc.account_name}!`);
  };

  const handleConfirmDisconnect = (deleteTxs: boolean) => {
    if (!disconnectingAccount) return;

    if (deleteTxs) {
      const all = store.getTransactions().filter(t => t.account_id !== disconnectingAccount.id);
      localStorage.setItem('paisa_transactions', JSON.stringify(all));
    }

    store.disconnectAccount(disconnectingAccount.id);
    setDisconnectingAccount(null);
    alert(`Disconnected ${disconnectingAccount.account_name}. Syncing halted.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner explaining RBI Account Aggregator */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Bank Accounts & UPI Sync</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  RBI AA Framework
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paisa connects directly via RBI-regulated Account Aggregators (Setu, Finvu, OneMoney).
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConsentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Connect Bank via AA</span>
          </button>
        </div>

        {/* Security pledge guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Never asks for UPI PIN:</strong> No banking passwords, credentials, or OTPs are handled.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Zero Screen Scraping:</strong> Direct consent-based cryptographic data pipes.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <Unlink className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Revoke Anytime:</strong> Disconnect any bank or delete sync history in one click.</span>
          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Linked Financial Accounts</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(acc => {
            const isConnected = acc.connection_status === 'connected';

            return (
              <div
                key={acc.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-lg">
                      {acc.provider.includes('HDFC') ? '🏦' : acc.provider.includes('ICICI') ? '🏛️' : '💳'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-100">{acc.account_name}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {acc.account_type.replace('_', ' ')} • {acc.provider}
                        {acc.is_demo && (
                          <span className="ml-1.5 text-[10px] px-1 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                            Demo Sandbox
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isConnected
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isConnected ? 'Active Sync' : 'Disconnected'}
                  </span>
                </div>

                {/* Balance & Last Synced */}
                <div className="flex items-end justify-between pt-2 border-t border-slate-800/60">
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Available Balance</div>
                    <div className="text-lg font-extrabold text-slate-100 font-mono-num">
                      {formatINR(acc.balance)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">
                      Last synced: {acc.last_synced_at ? new Date(acc.last_synced_at).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => handleSyncAccount(acc)}
                        disabled={isSyncing === acc.id}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing === acc.id ? 'animate-spin' : ''}`} />
                        <span>{isSyncing === acc.id ? 'Syncing...' : 'Fetch Spends Now'}</span>
                      </button>

                      <button
                        onClick={() => setDisconnectingAccount(acc)}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => store.updateAccount(acc.id, { connection_status: 'connected' })}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Reconnect account
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Aggregator Consent Simulator Modal */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Link Bank Accounts (RBI Account Aggregator)</span>
                </h3>
                <span className="text-[11px] text-amber-400 font-semibold">
                  Sandbox Simulation Mode
                </span>
              </div>
              <button
                onClick={() => setIsConsentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Provider Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Choose RBI-Licensed Account Aggregator
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_AGGREGATORS.map(aa => (
                  <button
                    key={aa.id}
                    type="button"
                    onClick={() => setSelectedProvider(aa.id as any)}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                      selectedProvider === aa.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    <div>{aa.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Lic: {aa.rbiLicense}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Select Your Banks (FIPs)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUPPORTED_INDIAN_BANKS.map(bank => {
                  const isChecked = selectedBanks.includes(bank.id);
                  return (
                    <div
                      key={bank.id}
                      onClick={() => handleToggleBank(bank.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer text-center text-xs transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-lg mb-1">{bank.logo}</div>
                      <div className="truncate">{bank.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consent Terms Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Consent Summary:</div>
              <div>• <strong>Purpose:</strong> Personal Financial Management (Daily Reality Check)</div>
              <div>• <strong>Data Fetch:</strong> Read-only transaction amounts and merchants</div>
              <div>• <strong>Duration:</strong> 1 Year (Can be revoked at any second)</div>
              <div>• <strong>Privacy:</strong> Data never sold or shared with third-party advertisers</div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartConsent}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting AA Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize Consent</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Disconnect Warning Modal (Section 4 & Acceptance Test G) */}
      {disconnectingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Disconnect {disconnectingAccount.account_name}?</span>
            </div>
            <p className="text-xs text-slate-300">
              Future background synchronization will stop immediately. What should happen to your previously recorded transactions from this bank?
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleConfirmDisconnect(false)}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-left text-xs text-slate-200 border border-slate-700"
              >
                <div className="font-bold">Keep Existing Transactions</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Retains historical spending in your dashboard as manual entries.
                </div>
              </button>

              <button
                onClick={() => handleConfirmDisconnect(true)}
                className="w-full p-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-left text-xs text-red-300 border border-red-500/30"
              >
                <div className="font-bold">Delete All Transactions From This Bank</div>
                <div className="text-[11px] text-red-400/80 mt-0.5">
                  Purges all synced rows from your local database permanently.
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDisconnectingAccount(null)}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
