import React, { useState } from 'react';
import { formatINR } from '../lib/calculations';
import {
  Sparkles,
  Shield,
  ArrowRight,
  CheckCircle2,
  Landmark,
  Clock,
  Zap,
  BarChart3,
  Bell,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
}

const FEATURE_CARDS = [
  {
    icon: Clock,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Live Spending Timeline',
    desc: 'Every UPI spend immediately recalculates your leftover buffer, keeping you grounded in real time.',
  },
  {
    icon: Sparkles,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Nightly Reality Check',
    desc: 'A witty, honest summary of what your wallet survived today, with practical adjustments for tomorrow.',
  },
  {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Safe Indian Bank Integration',
    desc: "Direct consent-based sync using RBI's Account Aggregator ecosystem. Zero banking passwords stored.",
  },
  {
    icon: BarChart3,
    color: 'text-violet-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Monthly Cash Flow Reports',
    desc: 'Deep category and merchant breakdowns, days within vs over budget, and month-over-month shifts.',
  },
  {
    icon: Bell,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Tone-Adjusted Notifications',
    desc: 'Morning allowance briefings, 80% pace warnings, and humorous or straightforward evening reports.',
  },
  {
    icon: Zap,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    title: 'Instant Categorization',
    desc: 'Intelligent pattern matching for Indian favorites: Swiggy, Blinkit, Zepto, Uber, IRCTC, and Netflix.',
  },
];

const DEMO_EXPENSES = [
  { name: 'Coffee ☕', amount: 250 },
  { name: 'Blinkit 🛒', amount: 600 },
  { name: 'Zepto 🥦', amount: 400 },
  { name: 'Swiggy 🍱', amount: 500 },
  { name: 'Shopping 🛍', amount: 750 },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onExploreDemo }) => {
  const [demoMonthly, setDemoMonthly] = useState(100000);
  const dailyBudget = Number((demoMonthly / 30).toFixed(2));
  const totalSpent = DEMO_EXPENSES.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Number((dailyBudget - totalSpent).toFixed(2));
  const pctUsed = Number(((totalSpent / dailyBudget) * 100).toFixed(1));

  return (
    <div className="paisa-entry min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="w-full border-b border-white/[0.06] px-6 py-4 bg-[#06091A]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
              ₹
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">PAISA</span>
              <span className="ml-2 text-xs text-slate-500 hidden sm:inline font-medium">Your Daily Money Reality Check</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Live Demo
            </button>
            <button
              onClick={onGetStarted}
              className="btn-primary text-xs"
            >
              Get Started Free <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-14 sm:py-20 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Your salary has a story. Find out where it goes.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          Your Daily Money <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Reality Check
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          "Sometimes you don't need a higher salary. <br />
          <span className="text-slate-100 font-semibold">You need to understand where your current salary is going.</span>"
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <button
            onClick={onGetStarted}
            className="btn-primary px-8 py-3.5 text-sm"
          >
            <span>Start Your Daily Reality Check</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={onExploreDemo}
            className="btn-secondary px-6 py-3.5 text-sm"
          >
            Explore Interactive Demo
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs text-slate-400">
          {['100% Free & Open', 'Zero Bank Passwords Stored', 'RBI Account Aggregator Ready', 'DPDP Act Compliant'].map(b => (
            <span key={b} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{b}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Interactive Live Formula Calculator from Section 1 */}
      <section className="px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white">Experience the Paisa Formula Live</h3>
            <p className="text-xs text-slate-400">
              Drag or adjust to see how your daily allowance transforms everyday UPI spending:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="section-title text-slate-400">Monthly Take-Home</label>
              <div className="text-2xl font-black text-white font-mono-num mt-1">
                {formatINR(demoMonthly, false)}
              </div>
              <input
                type="range"
                min={30000}
                max={300000}
                step={5000}
                value={demoMonthly}
                onChange={e => setDemoMonthly(Number(e.target.value))}
                className="w-full mt-3 accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>₹30,000</span>
                <span>₹3,00,000</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center sm:text-right">
              <label className="section-title text-slate-400">Daily Income Equivalent</label>
              <div className="text-2xl font-black text-emerald-400 font-mono-num mt-1">
                {formatINR(dailyBudget)}/day
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Divided by 30 days in month</p>
            </div>
          </div>

          {/* Spend Items Preview */}
          <div className="p-4 rounded-2xl bg-[#06091A] border border-white/[0.06] space-y-3">
            <div className="section-title text-slate-400">Typical Indian Daily Purchases:</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DEMO_EXPENSES.map((exp, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#0D1426] border border-white/[0.06] text-center">
                  <div className="text-xs text-slate-400">{exp.name}</div>
                  <div className="text-sm font-bold font-mono-num text-slate-200 mt-0.5">₹{exp.amount}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400">Total Spent Today: </span>
                <strong className="text-slate-100 font-mono-num font-bold">{formatINR(totalSpent)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Remaining Allowance: </span>
                <strong className={`font-mono-num font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatINR(remaining)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Budget Used: </span>
                <strong className="text-slate-100 font-mono-num font-bold">{pctUsed}%</strong>
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Within budget
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Full Financial Toolkit</h2>
          <p className="text-xs text-slate-400 mt-1">Engineered for Indian salary cycles and UPI habits</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_CARDS.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={`p-5 rounded-2xl border ${f.bg} space-y-2.5 hover:scale-[1.02] transition-transform duration-200`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05]">
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-sm text-white">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>PAISA — Personal Finance Management for India. Built with original code.</div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-400" /> DPDP Act Compliant</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Landmark className="w-3 h-3 text-blue-400" /> RBI AA Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
