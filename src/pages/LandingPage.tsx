import React, { useState } from 'react';
import { formatINR } from '../lib/calculations';
import { Sparkles, Shield, ArrowRight, CheckCircle2, TrendingDown, Landmark, Clock, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onExploreDemo }) => {
  const [demoMonthly, setDemoMonthly] = useState(100000);
  const [demoExpenses, setDemoExpenses] = useState([
    { name: 'Coffee', amount: 250 },
    { name: 'Blinkit', amount: 600 },
    { name: 'Zepto', amount: 400 },
    { name: 'Swiggy', amount: 500 },
    { name: 'Shopping', amount: 750 },
  ]);

  const dailyBudget = Number((demoMonthly / 30).toFixed(2));
  const totalSpent = demoExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Number((dailyBudget - totalSpent).toFixed(2));
  const pctUsed = Number(((totalSpent / dailyBudget) * 100).toFixed(1));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top Navbar */}
      <nav className="w-full border-b border-slate-800/80 px-6 py-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-emerald-500/20">
              ₹
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">PAISA</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Live Demo
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-12 sm:py-20 max-w-5xl mx-auto text-center space-y-6">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Your salary has a story. Find out where it goes.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Your Daily Money <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Reality Check
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          "Sometimes you don't need a higher salary. <br />
          You need to understand where your current salary is going."
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95"
          >
            <span>Start Your Daily Reality Check</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={onExploreDemo}
            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition-colors"
          >
            Explore Interactive Demo
          </button>
        </div>

      </section>

      {/* Interactive Live Formula Calculator from Section 1 */}
      <section className="px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white">Experience the Paisa Formula Live</h3>
            <p className="text-xs text-slate-400">
              Drag or adjust to see how your daily allowance transforms everyday UPI spending:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Monthly Take-Home</label>
              <div className="text-xl font-extrabold text-white font-mono-num mt-1">
                {formatINR(demoMonthly, false)}
              </div>
              <input
                type="range"
                min={30000}
                max={300000}
                step={5000}
                value={demoMonthly}
                onChange={e => setDemoMonthly(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="text-left sm:text-right">
              <label className="text-xs font-semibold text-slate-400 uppercase">Daily Income Equivalent</label>
              <div className="text-xl font-extrabold text-emerald-400 font-mono-num mt-1">
                {formatINR(dailyBudget)}/day
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Divided by 30 days in month</p>
            </div>
          </div>

          {/* Spend Items Preview */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">Typical Indian Daily Purchases:</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {demoExpenses.map((exp, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{exp.name}</div>
                  <div className="text-sm font-bold font-mono-num text-slate-200 mt-0.5">₹{exp.amount}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
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

      {/* Feature Pillars */}
      <section className="px-6 py-12 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <Clock className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold text-sm text-white">Running Allowance Timeline</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every UPI spend instantly recalculates your leftover buffer, preventing end-of-month shock.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-amber-400" />
          <h4 className="font-bold text-sm text-white">Nightly Reality Check</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            A witty, honest summary of what your wallet survived today, with practical suggestions for tomorrow.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <h4 className="font-bold text-sm text-white">Safe Indian Bank Integration</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Direct consent-based sync using RBI's Account Aggregator ecosystem. No banking passwords ever stored.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>PAISA — Personal Finance Management for India. Built with original code.</div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>DPDP Act Compliant</span>
            <span>•</span>
            <span>RBI AA Architecture</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
