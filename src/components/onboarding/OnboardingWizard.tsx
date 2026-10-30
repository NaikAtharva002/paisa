import React, { useState } from 'react';
import { BudgetingMode, RealityTone } from '../../types';
import { store } from '../../lib/storage';
import { formatINR, calculateDailyIncomeEquivalent } from '../../lib/calculations';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [budgetingMode, setBudgetingMode] = useState<BudgetingMode>('spendable_income');
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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4 sm:p-6 text-[#181D26]">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#D4952B] to-[#E5AB4B] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-[#D4952B]/20 mb-3">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#181D26]">
          Welcome to PAISA
        </h1>
        <p className="text-xs sm:text-sm text-[#7F899F] mt-1 font-medium">
          "Small steps today, bigger freedom tomorrow."
        </p>
      </div>

      {/* Wizard Card */}
      <div className="w-full max-w-xl bg-white border border-[#EDE8E0] rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#EDE8E0]">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-[#181D26] text-white ring-4 ring-[#181D26]/10'
                    : step > s
                    ? 'bg-[#2E8B57]/15 text-[#2E8B57]'
                    : 'bg-[#FAF8F5] text-[#7F899F] border border-[#EDE8E0]'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4 text-[#2E8B57]" /> : s}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s ? 'text-[#181D26]' : 'text-[#7F899F]'}`}>
                {s === 1 ? 'Your Profile' : s === 2 ? 'Income & Budget' : 'Daily Reality'}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Basic Profile */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-[#181D26]">What should we call you?</h2>
              <p className="text-xs text-[#7F899F] mt-0.5">We'll use this to greet you during your daily money check-ins.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7F899F] uppercase tracking-wider mb-2">
                Preferred Name / Nickname
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Atharva"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#181D26] placeholder-[#9AA4B2] text-sm focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7F899F] uppercase tracking-wider mb-2">
                Monthly Take-Home Salary / Income (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-[#7F899F] font-bold">₹</span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#181D26] font-mono-num font-bold text-base focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#7F899F] mt-1.5 font-medium">
                Formatted: <strong className="text-[#2E8B57] font-mono-num font-bold">{formatINR(monthlyIncome, false)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7F899F] uppercase tracking-wider mb-2">
                Salary Credit Day of the Month
              </label>
              <select
                value={salaryCreditDay}
                onChange={e => setSalaryCreditDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#181D26] text-sm focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
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
                className="btn-primary text-xs px-6 py-3"
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
              <h2 className="text-lg font-bold text-[#181D26]">Choose Your Daily Budget Calculation</h2>
              <p className="text-xs text-[#7F899F] mt-0.5">
                How would you like Paisa to calculate your daily spending target?
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 2: Spendable Income (Recommended) */}
              <div
                onClick={() => setBudgetingMode('spendable_income')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'spendable_income'
                    ? 'border-[#D4952B] bg-[#FCF8EE] shadow-xs'
                    : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[#181D26]">1. Spendable Income (Recommended)</div>
                  <div className="text-sm font-extrabold text-[#2E8B57] font-mono-num">
                    {formatINR(previewSpendableDaily)}/day
                  </div>
                </div>
                <p className="text-xs text-[#7F899F] mt-1">
                  Income minus your savings target and fixed commitments (Rent, EMIs, Bills) divided by days.
                </p>

                {budgetingMode === 'spendable_income' && (
                  <div className="mt-3 pt-3 border-t border-[#EDE8E0] grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#7F899F]">Monthly Savings Target</label>
                      <input
                        type="number"
                        value={savingsTarget}
                        onChange={e => setSavingsTarget(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#EDE8E0] text-xs font-mono-num text-[#181D26]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#7F899F]">Fixed Bills & Rent</label>
                      <input
                        type="number"
                        value={fixedCommitments}
                        onChange={e => setFixedCommitments(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#EDE8E0] text-xs font-mono-num text-[#181D26]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Option 1: Income Equivalent */}
              <div
                onClick={() => setBudgetingMode('income_equivalent')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'income_equivalent'
                    ? 'border-[#D4952B] bg-[#FCF8EE] shadow-xs'
                    : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[#181D26]">2. Income Equivalent</div>
                  <div className="text-sm font-extrabold text-[#181D26] font-mono-num">
                    {formatINR(previewDailyIncomeEquivalent)}/day
                  </div>
                </div>
                <p className="text-xs text-[#7F899F] mt-1">
                  Monthly income divided by total calendar days ({daysInCurMonth} days this month).
                </p>
                <div className="mt-2 text-[11px] text-[#8C5D17] flex items-center gap-1.5 bg-[#FDECC8]/50 px-2.5 py-1 rounded-lg border border-[#F3C465]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>A benchmark metric — doesn't reserve cash for fixed rent/EMIs.</span>
                </div>
              </div>

              {/* Option 3: Custom Daily Budget */}
              <div
                onClick={() => setBudgetingMode('custom_limit')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  budgetingMode === 'custom_limit'
                    ? 'border-[#D4952B] bg-[#FCF8EE] shadow-xs'
                    : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[#181D26]">3. Custom Daily Limit</div>
                  <div className="text-sm font-extrabold text-[#181D26] font-mono-num">
                    {formatINR(dailyBudgetOverride)}/day
                  </div>
                </div>
                <p className="text-xs text-[#7F899F] mt-1">
                  A personal hard daily spending ceiling you set for yourself.
                </p>

                {budgetingMode === 'custom_limit' && (
                  <div className="mt-3 pt-3 border-t border-[#EDE8E0]">
                    <label className="text-[11px] font-bold text-[#7F899F]">Your Daily Cap (₹)</label>
                    <input
                      type="number"
                      value={dailyBudgetOverride}
                      onChange={e => setDailyBudgetOverride(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white border border-[#EDE8E0] text-xs font-mono-num text-[#181D26]"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary text-xs px-6 py-2.5"
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
              <h2 className="text-lg font-bold text-[#181D26]">Nightly Reality Check Tone</h2>
              <p className="text-xs text-[#7F899F] mt-0.5">
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
                      ? 'border-[#D4952B] bg-[#FCF8EE] shadow-xs'
                      : 'border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#DFD7C7]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#181D26]">{item.title}</div>
                  <div className="text-[11px] text-[#7F899F] mt-1 leading-snug">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-2">
              <div className="text-xs font-bold text-[#181D26] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D4952B]" />
                <span>Your Daily Setup Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#3D4658]">
                <div>Monthly Take-home: <strong className="text-[#181D26] font-mono-num">{formatINR(monthlyIncome, false)}</strong></div>
                <div>Calculation: <strong className="text-[#2E8B57] capitalize">{budgetingMode.replace('_', ' ')}</strong></div>
                <div>Tone: <strong className="text-[#181D26] capitalize">{preferredTone}</strong></div>
                <div>Salary Credit: <strong className="text-[#181D26]">{salaryCreditDay}st of month</strong></div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleFinish}
                className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
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
