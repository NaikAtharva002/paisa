import React, { useState } from 'react';
import { store } from '../lib/storage';
import { BudgetingMode, RealityTone } from '../types';
import { formatINR } from '../lib/calculations';
import {
  Settings as SettingsIcon,
  Shield,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  HelpCircle,
  FileText,
  Lock,
  Mail,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { PublicPageModal } from '../components/public/PublicPageModal';
import { PublicPageId } from '../components/public/PublicPagesContent';
import { showToast } from '../components/common/Toast';

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
  const [activePublicPage, setActivePublicPage] = useState<PublicPageId | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('paisa_theme') as 'light' | 'dark' | 'system') || 'system';
  });

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('paisa_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    showToast(`Theme switched to ${newTheme}`, 'info');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = store.importFullDataBackup(content);
      if (success) {
        showToast('Backup restored successfully!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast('Invalid backup file. Could not restore.', 'error');
      }
    };
    reader.readAsText(file);
  };

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

    showToast('Settings saved successfully!', 'success');
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
    <div className="space-y-6 max-w-4xl mx-auto animate-in">
      {/* Editorial Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Settings & Financial Calibration</h2>
          <p className="text-xs text-[#7F899F] mt-0.5">
            Configure income cycles, daily allowance formulas, notifications, and tone
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] text-[#2E8B57] text-xs font-bold animate-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile & Income Cycle */}
        <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
          <div className="section-title text-[#7F899F]">Personal Profile & Salary Cycle</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="section-title text-[#7F899F]">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field mt-1 text-xs"
              />
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Monthly Take-Home Income (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(Number(e.target.value))}
                className="input-field mt-1 text-xs font-mono-num font-bold"
              />
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Salary Credit Day of Month (1 - 31)</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={salaryCreditDay}
                onChange={e => setSalaryCreditDay(Number(e.target.value))}
                className="input-field mt-1 text-xs font-mono-num"
              />
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Monthly Savings Target (₹)</label>
              <input
                type="number"
                min="0"
                value={savingsTarget}
                onChange={e => setSavingsTarget(Number(e.target.value))}
                className="input-field mt-1 text-xs font-mono-num"
              />
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Daily Spend Target Override (₹/day)</label>
              <input
                type="number"
                min="0"
                value={dailyBudgetOverride || ''}
                placeholder="Auto-calculated (0)"
                onChange={e => setDailyBudgetOverride(Number(e.target.value))}
                className="input-field mt-1 text-xs font-mono-num"
              />
              <p className="text-[10px] text-[#7F899F] mt-1">
                Optional override to fix a strict daily allowance cap
              </p>
            </div>
          </div>
        </div>

        {/* Budgeting Formula Choice */}
        <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
          <div className="section-title text-[#7F899F]">Daily Allowance Calculation Mode</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                budgetingMode === 'income_equivalent'
                  ? 'border-[#D4952B] bg-[#FFF6E6] shadow-sm'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
              }`}
            >
              <input
                type="radio"
                name="budgetMode"
                value="income_equivalent"
                checked={budgetingMode === 'income_equivalent'}
                onChange={() => setBudgetingMode('income_equivalent')}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[#181D26]">Income Equivalent</div>
              <p className="text-[11px] text-[#5E687D] mt-1 leading-snug">
                Take-home income divided equally by days in the month.
              </p>
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                budgetingMode === 'spendable_income'
                  ? 'border-[#D4952B] bg-[#FFF6E6] shadow-sm'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
              }`}
            >
              <input
                type="radio"
                name="budgetMode"
                value="spendable_income"
                checked={budgetingMode === 'spendable_income'}
                onChange={() => setBudgetingMode('spendable_income')}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[#181D26]">Spendable Income</div>
              <p className="text-[11px] text-[#5E687D] mt-1 leading-snug">
                Income minus savings and fixed commitments, divided by days.
              </p>
            </label>

            <label
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                budgetingMode === 'custom_limit'
                  ? 'border-[#D4952B] bg-[#FFF6E6] shadow-sm'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
              }`}
            >
              <input
                type="radio"
                name="budgetMode"
                value="custom_limit"
                checked={budgetingMode === 'custom_limit'}
                onChange={() => setBudgetingMode('custom_limit')}
                className="sr-only"
              />
              <div className="font-bold text-xs text-[#181D26]">Custom Daily Limit</div>
              <p className="text-[11px] text-[#5E687D] mt-1 leading-snug">
                A hard daily allowance set manually by you.
              </p>
            </label>
          </div>
        </div>

        {/* Reality Check Tone & Notification Preferences */}
        <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
          <div className="section-title text-[#7F899F]">Tone & Notification Preferences</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="section-title text-[#7F899F]">Evening Reality Check Tone</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value as RealityTone)}
                className="input-field mt-1 text-xs"
              >
                <option value="friendly">😊 Friendly</option>
                <option value="sarcastic">😏 Sarcastic & Witty</option>
                <option value="straightforward">📊 Straightforward</option>
                <option value="encouraging">🚀 Encouraging</option>
              </select>
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Budget Pace Warning Threshold (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={warningThreshold}
                onChange={e => setWarningThreshold(Number(e.target.value))}
                className="input-field mt-1 text-xs font-mono-num"
              />
            </div>
          </div>
        </div>

        {/* Appearance & Theme Mode */}
        <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
          <div className="section-title text-[#7F899F]">Appearance & Theme</div>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                theme === 'light'
                  ? 'border-[#D4952B] bg-[#FFF6E6] text-[#D4952B] font-bold shadow-xs'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] text-[#5E687D] hover:border-[#DFD7C7]'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">Light</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                theme === 'dark'
                  ? 'border-[#D4952B] bg-[#FFF6E6] text-[#D4952B] font-bold shadow-xs'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] text-[#5E687D] hover:border-[#DFD7C7]'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                theme === 'system'
                  ? 'border-[#D4952B] bg-[#FFF6E6] text-[#D4952B] font-bold shadow-xs'
                  : 'border-[#EDE8E0] bg-[#FAF8F5] text-[#5E687D] hover:border-[#DFD7C7]'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs">System</span>
            </button>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" className="btn-primary text-xs px-6 py-2.5">
            Save Settings & Preferences
          </button>
        </div>
      </form>

      {/* Data Backup & Danger Zone */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
        <div className="section-title text-[#7F899F]">Data Portability & Reset</div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <div className="text-xs font-bold text-[#181D26]">Export Full Financial Backup</div>
            <p className="text-[11px] text-[#7F899F]">Download all transactions, categories, and account states as JSON</p>
          </div>
          <button
            onClick={handleExportData}
            className="btn-secondary text-xs px-4 py-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
        </div>

        <div className="pt-4 border-t border-[#EDE8E0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#181D26]">Import Financial Backup</div>
            <p className="text-[11px] text-[#7F899F]">Restore previously exported JSON backup data</p>
          </div>
          <div>
            <input
              type="file"
              id="backup-file-input"
              accept=".json"
              onChange={handleImportBackup}
              className="sr-only"
            />
            <label
              htmlFor="backup-file-input"
              className="btn-secondary text-xs px-4 py-2 cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Backup</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EDE8E0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#E06D53]">Reset All Financial Data</div>
            <p className="text-[11px] text-[#7F899F]">Permanently erase local records and restart onboarding</p>
          </div>
          <button
            onClick={handleDeleteAllData}
            className="px-4 py-2 rounded-full bg-[#FDF1EE] text-[#E06D53] border border-[#FBDCD5] hover:bg-[#FBE4DF] text-xs font-bold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
            <span>Reset Paisa</span>
          </button>
        </div>
      </div>

      {/* Help, Support & Legal Transparency */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
        <div className="section-title text-[#7F899F]">Help, Privacy & Legal Information</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActivePublicPage('help')}
            className="p-3.5 rounded-xl border border-[#EDE8E0] hover:bg-[#FAF8F5] text-left transition-colors flex flex-col gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-[#D4952B]" />
            <span className="text-xs font-bold text-[#181D26]">Help Centre</span>
            <span className="text-[10px] text-[#7F899F]">Guides & FAQs</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePublicPage('security')}
            className="p-3.5 rounded-xl border border-[#EDE8E0] hover:bg-[#FAF8F5] text-left transition-colors flex flex-col gap-1.5"
          >
            <Lock className="w-4 h-4 text-[#2E8B57]" />
            <span className="text-xs font-bold text-[#181D26]">Security & Trust</span>
            <span className="text-[10px] text-[#7F899F]">Zero passwords</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePublicPage('privacy')}
            className="p-3.5 rounded-xl border border-[#EDE8E0] hover:bg-[#FAF8F5] text-left transition-colors flex flex-col gap-1.5"
          >
            <Shield className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#181D26]">Privacy Policy</span>
            <span className="text-[10px] text-[#7F899F]">DPDP 2023 Notice</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePublicPage('contact')}
            className="p-3.5 rounded-xl border border-[#EDE8E0] hover:bg-[#FAF8F5] text-left transition-colors flex flex-col gap-1.5"
          >
            <Mail className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-xs font-bold text-[#181D26]">Contact Support</span>
            <span className="text-[10px] text-[#7F899F]">Bug report & ideas</span>
          </button>
        </div>

        <div className="pt-2 text-center text-[11px] text-[#7F899F]">
          PAISA v1.0.0 • Non-custodial personal finance for India • Licensed under MIT
        </div>
      </div>

      {/* Public Page Modal Dialog */}
      {activePublicPage && (
        <PublicPageModal
          isOpen={true}
          initialPage={activePublicPage}
          onClose={() => setActivePublicPage(null)}
        />
      )}
    </div>
  );
};
