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
  HelpCircle,
  Lock,
  FileText,
  Mail,
} from 'lucide-react';
import { PublicPageModal } from '../components/public/PublicPageModal';
import { PublicPageId } from '../components/public/PublicPagesContent';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
}

const FEATURE_CARDS = [
  {
    icon: Clock,
    color: 'text-[#2E8B57]',
    bg: 'bg-[#F0F7F3] border-[#CDE5D7]',
    title: 'Live Spending Timeline',
    desc: 'Every UPI spend immediately recalculates your daily leftover buffer, keeping you grounded in real time.',
  },
  {
    icon: Sparkles,
    color: 'text-[#D4952B]',
    bg: 'bg-[#FCF8EE] border-[#EBD7AF]',
    title: 'Nightly Reality Check',
    desc: 'A witty, honest summary of what your wallet survived today, with practical adjustments for tomorrow.',
  },
  {
    icon: Shield,
    color: 'text-[#3B82F6]',
    bg: 'bg-[#EFF6FF] border-[#BFDBFE]',
    title: 'Safe Indian Bank Sync',
    desc: "Direct consent-based sync using RBI's Account Aggregator ecosystem. Zero banking passwords stored.",
  },
  {
    icon: BarChart3,
    color: 'text-[#8B5CF6]',
    bg: 'bg-[#F5F3FF] border-[#DDD6FE]',
    title: 'Monthly Cash Flow Reports',
    desc: 'Deep category and merchant breakdowns, days within vs over budget, and month-over-month shifts.',
  },
  {
    icon: Bell,
    color: 'text-[#E06D53]',
    bg: 'bg-[#FDF2F0] border-[#F5C7BE]',
    title: 'Tone-Adjusted Notifications',
    desc: 'Morning allowance briefings, 80% pace warnings, and humorous or straightforward evening reports.',
  },
  {
    icon: Zap,
    color: 'text-[#0D9488]',
    bg: 'bg-[#F0FDFA] border-[#CCFBF1]',
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

  // Public Page Modal state
  const [activePublicPage, setActivePublicPage] = useState<PublicPageId | null>(null);

  const openPublicPage = (page: PublicPageId) => {
    setActivePublicPage(page);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181D26] flex flex-col justify-between selection:bg-[#D4952B]/20 selection:text-[#8C5D17]">
      {/* Top Navbar */}
      <nav className="w-full border-b border-[#EDE8E0] px-6 py-4 bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4952B] to-[#E5AB4B] flex items-center justify-center text-white shadow-md shadow-[#D4952B]/20">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                </svg>
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-[#181D26]">PAISA</span>
                <span className="ml-2 text-xs text-[#7F899F] hidden sm:inline font-semibold">
                  Daily Money Reality Check
                </span>
              </div>
            </div>

            {/* Navigation Links for Public Pages */}
            <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#3D4658]">
              <button onClick={() => openPublicPage('features')} className="hover:text-[#D4952B] transition-colors">
                Features
              </button>
              <button onClick={() => openPublicPage('pricing')} className="hover:text-[#D4952B] transition-colors">
                Pricing
              </button>
              <button onClick={() => openPublicPage('about')} className="hover:text-[#D4952B] transition-colors">
                About
              </button>
              <button onClick={() => openPublicPage('faq')} className="hover:text-[#D4952B] transition-colors">
                FAQ
              </button>
              <button onClick={() => openPublicPage('security')} className="hover:text-[#D4952B] transition-colors">
                Security
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="btn-secondary text-xs"
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

      {/* Hero Section with Dunes Backdrop */}
      <section className="relative px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 max-w-5xl mx-auto text-center space-y-6">
        {/* Subtle Decorative Landscape Waves in Background */}
        <div className="absolute inset-0 -top-8 flex items-center justify-center opacity-30 pointer-events-none -z-10 overflow-hidden">
          <svg
            className="w-full max-w-4xl h-auto"
            viewBox="0 0 800 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 160 Q 200 80 400 130 T 800 110 L 800 240 L 0 240 Z"
              fill="url(#hero-grad-1)"
              opacity="0.4"
            />
            <path
              d="M0 185 Q 260 120 520 160 T 800 145 L 800 240 L 0 240 Z"
              fill="url(#hero-grad-2)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="hero-grad-1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#87A99E" />
                <stop offset="100%" stopColor="#DFD7C7" />
              </linearGradient>
              <linearGradient id="hero-grad-2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#D4952B" />
                <stop offset="100%" stopColor="#E06D53" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FCF8EE] border border-[#EBD7AF] text-[#8C5D17] text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D4952B]" />
          <span>Small steps today, bigger freedom tomorrow.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-[#181D26] tracking-tight leading-tight">
          Your Daily Money <br className="hidden sm:inline" />
          <span className="text-[#D4952B]">
            Reality Check
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#3D4658] max-w-2xl mx-auto leading-relaxed font-normal">
          "Sometimes you don't need a higher salary. <br />
          <span className="text-[#181D26] font-semibold">You need to understand where your current salary is going.</span>"
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <button
            onClick={onGetStarted}
            className="btn-primary px-8 py-3.5 text-sm shadow-md"
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
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs text-[#7F899F]">
          {['100% Free & Open', 'Zero Bank Passwords Stored', 'RBI Account Aggregator Ready', 'DPDP Act Compliant'].map(b => (
            <span key={b} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EDE8E0] shadow-xs font-medium text-[#3D4658]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />
              <span>{b}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Interactive Live Formula Calculator */}
      <section className="px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="editorial-card p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-[#181D26]">Experience the Paisa Formula Live</h3>
            <p className="text-xs text-[#7F899F]">
              Adjust the slider to see how your daily allowance transforms everyday UPI spending:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <div>
              <label className="section-title text-[#7F899F]">Monthly Take-Home</label>
              <div className="text-3xl font-black text-[#181D26] font-mono-num mt-1">
                {formatINR(demoMonthly, false)}
              </div>
              <input
                type="range"
                min={30000}
                max={300000}
                step={5000}
                value={demoMonthly}
                onChange={e => setDemoMonthly(Number(e.target.value))}
                className="w-full mt-3 accent-[#D4952B] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#7F899F] font-semibold mt-1">
                <span>₹30,000</span>
                <span>₹3,00,000</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F0F7F3] border border-[#CDE5D7] text-center sm:text-right">
              <label className="section-title text-[#1E5C39]">Daily Income Equivalent</label>
              <div className="text-3xl font-black text-[#2E8B57] font-mono-num mt-1">
                {formatINR(dailyBudget)}/day
              </div>
              <p className="text-[11px] text-[#2E8B57] mt-1 font-medium">Divided across calendar days</p>
            </div>
          </div>

          {/* Spend Items Preview */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-3">
            <div className="section-title text-[#7F899F]">Typical Indian Daily Purchases:</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DEMO_EXPENSES.map((exp, i) => (
                <div key={i} className="p-3 rounded-xl bg-white border border-[#EDE8E0] text-center shadow-xs">
                  <div className="text-xs text-[#7F899F] font-medium">{exp.name}</div>
                  <div className="text-sm font-bold font-mono-num text-[#181D26] mt-0.5">₹{exp.amount}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#EDE8E0] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[#7F899F]">Total Spent Today: </span>
                <strong className="text-[#181D26] font-mono-num font-bold">{formatINR(totalSpent)}</strong>
              </div>
              <div>
                <span className="text-[#7F899F]">Remaining Allowance: </span>
                <strong className={`font-mono-num font-bold ${remaining >= 0 ? 'text-[#2E8B57]' : 'text-[#E06D53]'}`}>
                  {formatINR(remaining)}
                </strong>
              </div>
              <div>
                <span className="text-[#7F899F]">Budget Used: </span>
                <strong className="text-[#181D26] font-mono-num font-bold">{pctUsed}%</strong>
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F7F3] text-[#2E8B57] border border-[#CDE5D7]">
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
          <h2 className="text-2xl sm:text-3xl font-black text-[#181D26]">Full Financial Toolkit</h2>
          <p className="text-xs text-[#7F899F] font-medium mt-1">Engineered for Indian salary cycles and UPI habits</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_CARDS.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={`p-5 rounded-2xl border ${f.bg} space-y-2.5 hover:shadow-md transition-all duration-200`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-xs">
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-sm text-[#181D26]">{f.title}</h3>
                <p className="text-xs text-[#3D4658] leading-relaxed font-normal">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Multi-Column Comprehensive Public Footer */}
      <footer className="border-t border-[#EDE8E0] bg-white text-xs text-[#3D4658] pt-12 pb-8 px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand & Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4952B] to-[#E5AB4B] flex items-center justify-center text-white">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                  </svg>
                </div>
                <span className="font-black text-base text-[#181D26]">PAISA</span>
              </div>
              <p className="text-xs text-[#7F899F] leading-relaxed">
                Calm, privacy-first personal finance designed for Indian salary earners. Your salary has a story; find out where it goes.
              </p>
              <div className="pt-1">
                <a
                  href="https://github.com/NaikAtharva002/paisa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#181D26] hover:text-[#D4952B] transition-colors"
                >
                  GitHub Repository ↗
                </a>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-[#181D26] uppercase tracking-wider text-[11px]">Product</h4>
              <ul className="space-y-2 text-xs text-[#7F899F]">
                <li>
                  <button onClick={() => openPublicPage('features')} className="hover:text-[#181D26] transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={onExploreDemo} className="hover:text-[#181D26] transition-colors">
                    Interactive Demo
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('pricing')} className="hover:text-[#181D26] transition-colors">
                    Pricing & Plans
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('changelog')} className="hover:text-[#181D26] transition-colors">
                    Changelog (v1.0.0)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Support & Resources */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-[#181D26] uppercase tracking-wider text-[11px]">Resources & Help</h4>
              <ul className="space-y-2 text-xs text-[#7F899F]">
                <li>
                  <button onClick={() => openPublicPage('help')} className="hover:text-[#181D26] transition-colors">
                    Help Centre & Guides
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('faq')} className="hover:text-[#181D26] transition-colors">
                    Frequently Asked Questions
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('security')} className="hover:text-[#181D26] transition-colors">
                    Security & Privacy Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('contact')} className="hover:text-[#181D26] transition-colors">
                    Contact & Report a Bug
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal & Compliance */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-[#181D26] uppercase tracking-wider text-[11px]">Legal & Compliance</h4>
              <ul className="space-y-2 text-xs text-[#7F899F]">
                <li>
                  <button onClick={() => openPublicPage('privacy')} className="hover:text-[#181D26] transition-colors">
                    Privacy Policy (DPDP 2023)
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('terms')} className="hover:text-[#181D26] transition-colors">
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('cookies')} className="hover:text-[#181D26] transition-colors">
                    Cookie & Storage Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('disclaimer')} className="hover:text-[#181D26] transition-colors">
                    Financial Disclaimer
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('data-deletion')} className="hover:text-[#181D26] transition-colors">
                    Data Deletion & Retention
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Regulatory Badges */}
          <div className="border-t border-[#EDE8E0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7F899F]">
            <div>© 2026 PAISA. Designed for India with calm precision.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#2E8B57]" /> DPDP Act 2023 Compliant
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-[#3B82F6]" /> RBI AA Ready
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Public Page Modal Dialog */}
      {activePublicPage && (
        <PublicPageModal
          isOpen={true}
          initialPage={activePublicPage}
          onClose={() => setActivePublicPage(null)}
          onGetStarted={onGetStarted}
        />
      )}
    </div>
  );
};
