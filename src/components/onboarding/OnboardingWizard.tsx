import React, { useState } from 'react';
import { BudgetingMode, RealityTone } from '../../types';
import { store } from '../../lib/storage';
import { formatINR, calculateDailyIncomeEquivalent } from '../../lib/calculations';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(100000);
  const [salaryCreditDay, setSalaryCreditDay] = useState(1);
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('income_equivalent');
  const [savingsTarget, setSavingsTarget] = useState(20000);
  const [fixedCommitments, setFixedCommitments] = useState(25000);
  const [dailyBudgetOverride, setDailyBudgetOverride] = useState(2500);
  const [preferredTone, setPreferredTone] = useState<RealityTone>('friendly');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const daysInCurMonth = new Date(currentYear, currentMonth, 0).getDate();

  const previewDailyIncomeEquivalent = calculateDailyIncomeEquivalent(monthlyIncome, currentYear, currentMonth);
  const previewSpendableDaily = Number(
    (Math.max(0, monthlyIncome - savingsTarget - fixedCommitments) / daysInCurMonth).toFixed(2)
  );

  const handleFinish = () => {
    store.updateUser({ display_name: displayName.trim() || 'Friend' });
    store.updateProfile({
      monthly_income: monthlyIncome,
      salary_credit_day: salaryCreditDay,
      budgeting_mode: budgetingMode,
      savings_target: savingsTarget,
      fixed_commitments: fixedCommitments,
      daily_budget_override: dailyBudgetOverride,
      monthly_spending_target: monthlyIncome - savingsTarget,
    });
    store.updateNotificationPreferences({ preferred_tone: preferredTone });
    store.setOnboarded(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Confetti fallback
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/25 mb-3">
          ₹
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Welcome to PAISA
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          "Your salary has a story. Find out where it goes."
        </p>
      </div>

      {/* Wizard Card */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s ? 'text-slate-200' : 'text-slate-500'}`}>
                {s === 1 ? 'Your Profile' : s === 2 ? 'Income & Budget' : 'Daily Reality'}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Basic Profile */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">What should we call you?</h2>
              <p className="text-xs text-slate-400 mt-0.5">We'll use this to greet you during your daily money check-ins.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Preferred Name / Nickname
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Atharva"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Monthly Take-Home Salary / Income (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono-num font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Formatted: <strong className="text-emerald-400 font-mono-num">{formatINR(monthlyIncome, false)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Salary Credit Day of the Month
              </label>
              <select
                value={salaryCreditDay}
                onChange={e => setSalaryCreditDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Budgeting Method Selection */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Choose Your Daily Budget Calculation</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                How would you like Paisa to calculate your daily spending target?
              </p>
            </div>

            <div className="space-y-3">
              
              {/* Option 1: Income Equivalent */}
              <div
                onClick={() => setBudgetingMode('income_equivalent')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'income_equivalent'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-100">1. Income Equivalent</div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono-num">
                    {formatINR(previewDailyIncomeEquivalent)}/day
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Monthly income divided by total calendar days ({daysInCurMonth} days this month).
                </p>
                <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Income equivalent is a benchmark, not all of it is disposable cash after bills.</span>
                </div>
              </div>

              {/* Option 2: Spendable Income */}
              <div
                onClick={() => setBudgetingMode('spendable_income')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'spendable_income'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-100">2. Spendable Income (Recommended)</div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono-num">
                    {formatINR(previewSpendableDaily)}/day
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Income minus your savings goal and fixed bills (Rent, EMIs, Utilities) divided by days.
                </p>

                {budgetingMode === 'spendable_income' && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">Monthly Savings Target</label>
                      <input
                        type="number"
                        value={savingsTarget}
                        onChange={e => setSavingsTarget(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono-num text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">Fixed Bills & Rent</label>
                      <input
                        type="number"
                        value={fixedCommitments}
                        onChange={e => setFixedCommitments(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono-num text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Custom Daily Budget */}
              <div
                onClick={() => setBudgetingMode('custom_limit')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'custom_limit'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-100">3. Custom Daily Limit</div>
                  <div className="text-sm font-extrabold text-emerald-400 font-mono-num">
                    {formatINR(dailyBudgetOverride)}/day
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  A personal hard spending cap you set for yourself each day.
                </p>

                {budgetingMode === 'custom_limit' && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60">
                    <label className="text-[11px] font-semibold text-slate-300">Your Custom Daily Target (₹)</label>
                    <input
                      type="number"
                      value={dailyBudgetOverride}
                      onChange={e => setDailyBudgetOverride(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono-num text-white"
                    />
                  </div>
                )}
              </div>

            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Tone & Confirmation */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Nightly Reality Check Tone</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every evening, Paisa summarizes your spending. How should it talk to you?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'friendly' as RealityTone, title: 'Friendly 😊', desc: 'Supportive, thoughtful, and encouraging.' },
                { id: 'sarcastic' as RealityTone, title: 'Sarcastic & Witty 😏', desc: 'Playfully roasts your Swiggy and Blinkit habits.' },
                { id: 'straightforward' as RealityTone, title: 'Straightforward 📊', desc: 'Clean, objective data and cold facts.' },
                { id: 'encouraging' as RealityTone, title: 'Encouraging 🚀', desc: 'Focuses on building small positive habits.' },
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setPreferredTone(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    preferredTone === item.id
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-100">{item.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Your Daily Setup Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>Monthly Take-home: <strong className="text-white font-mono-num">{formatINR(monthlyIncome, false)}</strong></div>
                <div>Calculation: <strong className="text-emerald-400 capitalize">{budgetingMode.replace('_', ' ')}</strong></div>
                <div>Tone: <strong className="text-white capitalize">{preferredTone}</strong></div>
                <div>Salary Credit: <strong className="text-white">{salaryCreditDay}st of month</strong></div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95"
              >
                <span>Start Daily Reality Check</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
