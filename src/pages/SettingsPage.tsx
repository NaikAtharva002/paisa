import React, { useState } from 'react';
import { store } from '../lib/storage';
import { FinancialProfile, BudgetingMode, RealityTone } from '../types';
import { formatINR, calculateDailyIncomeEquivalent } from '../lib/calculations';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Download,
  Trash2,
  Bell,
  Sparkles,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const profile = store.getProfile();
  const user = store.getUser();
  const notifs = store.getNotificationPreferences();

  const [displayName, setDisplayName] = useState(user.display_name);
  const [monthlyIncome, setMonthlyIncome] = useState(profile.monthly_income);
  const [salaryCreditDay, setSalaryCreditDay] = useState(profile.salary_credit_day);
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>(profile.budgeting_mode);
  const [savingsTarget, setSavingsTarget] = useState(profile.savings_target);
  const [fixedCommitments, setFixedCommitments] = useState(profile.fixed_commitments);
  const [dailyBudgetOverride, setDailyBudgetOverride] = useState(profile.daily_budget_override);

  // Notifications
  const [morningTime, setMorningTime] = useState(notifs.morning_reminder_time);
  const [eveningTime, setEveningTime] = useState(notifs.evening_summary_time);
  const [warningThreshold, setWarningThreshold] = useState(notifs.warning_threshold);
  const [tone, setTone] = useState<RealityTone>(notifs.preferred_tone);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateUser({ display_name: displayName.trim() });
    store.updateProfile({
      monthly_income: monthlyIncome,
      salary_credit_day: salaryCreditDay,
      budgeting_mode: budgetingMode,
      savings_target: savingsTarget,
      fixed_commitments: fixedCommitments,
      daily_budget_override: dailyBudgetOverride,
      monthly_spending_target: monthlyIncome - savingsTarget,
    });
    store.updateNotificationPreferences({
      morning_reminder_time: morningTime,
      evening_summary_time: eveningTime,
      warning_threshold: warningThreshold,
      preferred_tone: tone,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportData = () => {
    const json = store.exportFullDataBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paisa_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleDeleteAllData = () => {
    if (confirm('CAUTION: Are you sure you want to permanently delete all your financial records and reset Paisa?')) {
      store.clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-400" />
            <span>Settings & Preferences</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize financial calculations, daily reality tones, and data controls
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl animate-in fade-in">
            ✓ Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* User Profile Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Profile Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Currency & Timezone</label>
              <input
                type="text"
                value="INR (₹) • Asia/Kolkata (IST)"
                disabled
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Financial Rules Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Daily Budget Calculation Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'income_equivalent' as BudgetingMode, label: 'Income Equivalent', desc: 'Income / calendar days' },
              { id: 'spendable_income' as BudgetingMode, label: 'Spendable Income', desc: '(Income - bills - savings) / days' },
              { id: 'custom_limit' as BudgetingMode, label: 'Custom Hard Cap', desc: 'User-specified fixed daily limit' },
            ].map(m => (
              <div
                key={m.id}
                onClick={() => setBudgetingMode(m.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                  budgetingMode === m.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400'
                }`}
              >
                <div className="text-xs">{m.label}</div>
                <div className="text-[11px] text-slate-500 mt-1">{m.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-400">Monthly Take-Home Salary (₹)</label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(Number(e.target.value))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono-num font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Salary Credit Day</label>
              <select
                value={salaryCreditDay}
                onChange={e => setSalaryCreditDay(Number(e.target.value))}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}st of month</option>
                ))}
              </select>
            </div>

            {budgetingMode === 'spendable_income' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Monthly Savings Target (₹)</label>
                  <input
                    type="number"
                    value={savingsTarget}
                    onChange={e => setSavingsTarget(Number(e.target.value))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Fixed Commitments / Rent (₹)</label>
                  <input
                    type="number"
                    value={fixedCommitments}
                    onChange={e => setFixedCommitments(Number(e.target.value))}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                  />
                </div>
              </>
            )}

            {budgetingMode === 'custom_limit' && (
              <div>
                <label className="text-xs font-semibold text-slate-400">Custom Daily Spending Cap (₹)</label>
                <input
                  type="number"
                  value={dailyBudgetOverride}
                  onChange={e => setDailyBudgetOverride(Number(e.target.value))}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                />
              </div>
            )}
          </div>
        </div>

        {/* Notifications & Tone Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Reality Check Tone & Alerts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['friendly', 'sarcastic', 'straightforward', 'encouraging'] as RealityTone[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`p-3 rounded-xl border text-xs capitalize text-center ${
                  tone === t
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-400">Morning Allowance Reminder</label>
              <input
                type="time"
                value={morningTime}
                onChange={e => setMorningTime(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Nightly Reality Check Summary</label>
              <input
                type="time"
                value={eveningTime}
                onChange={e => setEveningTime(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Warning Alert Threshold</span>
              <strong className="text-emerald-400 font-mono-num">{warningThreshold}% of daily budget</strong>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={warningThreshold}
              onChange={e => setWarningThreshold(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            Save All Preferences
          </button>
        </div>

      </form>

      {/* Privacy, DPDP Act & Data Export Card */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Privacy & Data Sovereignty (DPDP Act India)</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          You own 100% of your financial data. Paisa stores your financial transactions locally with end-to-end user isolation. You can export a full copy of your data anytime or purge it permanently.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Complete Data (JSON)</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Reset to initial sample data?')) {
                store.resetToDemoData();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={handleDeleteAllData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/80 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Records Permanently</span>
          </button>
        </div>
      </div>

    </div>
  );
};
