import React, { useState, useEffect, useRef } from 'react';
import { formatINR } from '../lib/calculations';
import {
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
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { PublicPageModal } from '../components/public/PublicPageModal';
import { PublicPageId } from '../components/public/PublicPagesContent';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
  onExploreDemo?: () => void;
}

// Typical Indian daily expenses for the interactive calculator
const DEMO_EXPENSES = [
  { name: 'Coffee', amount: 250 },
  { name: 'Blinkit groceries', amount: 600 },
  { name: 'Work snacks', amount: 400 },
  { name: 'Dinner delivery', amount: 500 },
  { name: 'Metro transit', amount: 150 },
];

const BENEFIT_PILLARS = [
  {
    icon: Clock,
    title: 'Live daily leftover buffer',
    desc: 'Every UPI transaction instantly updates what you have left to spend today, ending end-of-month balance anxiety.',
    badge: 'Real-time',
  },
  {
    icon: Shield,
    title: 'Zero imaginary financial data',
    desc: 'You start from a completely clean state. No fake transactions, no sample budgets, and no invented people.',
    badge: 'Clean slate',
  },
  {
    icon: Landmark,
    title: 'Non-custodial local privacy',
    desc: 'All financial intelligence runs directly on your device. Zero banking passwords, OTPs, or card PINs are ever requested.',
    badge: '100% private',
  },
  {
    icon: Zap,
    title: 'Instant Indian merchant parsing',
    desc: 'Parses complex UPI narrations and bank SMS for Swiggy, Zepto, Blinkit, Uber, and IRCTC with integer paise precision.',
    badge: 'Accurate',
  },
  {
    icon: BarChart3,
    title: 'Daily reality check briefings',
    desc: 'Morning allowance briefings, proactive 80% pace warnings, and calm evening reviews in your preferred conversational tone.',
    badge: 'Intelligent',
  },
  {
    icon: Bell,
    title: 'Native Excel and PDF imports',
    desc: 'Import HDFC, ICICI, SBI, Axis, and Kotak statements directly without third-party cloud data extraction.',
    badge: 'Offline-ready',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Does PAISA require my netbanking password or UPI PIN?',
    a: 'Never. PAISA does not ask for, store, or transmit your banking passwords, login credentials, or UPI PINs. It parses bank statements (Excel, PDF, CSV) and phone payment notifications locally on your device.',
  },
  {
    q: 'How is my daily spending allowance calculated?',
    a: 'PAISA divides your monthly discretionary income across the exact number of days in the current calendar month. Each expense updates your remaining buffer in real time, and surplus rolls over to keep your monthly savings target intact.',
  },
  {
    q: 'What makes PAISA different from traditional expense trackers?',
    a: 'Traditional trackers show you backward-looking charts of money already spent. PAISA operates as a proactive daily reality check, giving you a tangible safe-to-spend number before you make your next UPI payment.',
  },
  {
    q: 'How does PAISA handle internal transfers and refunds?',
    a: 'Internal transfers between your own linked accounts are automatically excluded from income and expenses to avoid duplicate counting. Refunds and reversals reduce your category spend rather than artificially inflating your income.',
  },
  {
    q: 'Is my financial data stored on your servers?',
    a: 'By default, PAISA is completely non-custodial and stores your financial records encrypted in your browser or phone local storage. Cloud sync is entirely optional and under your direct account control.',
  },
  {
    q: 'Is PAISA free to use?',
    a: 'Yes. PAISA is completely free and open-source under the MIT license with zero locked tiers, zero ads, and zero monetization of user financial records.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onExploreDemo }) => {
  // Calculator state
  const [demoMonthly, setDemoMonthly] = useState(100000);
  const dailyBudget = Number((demoMonthly / 30).toFixed(2));
  const totalSpent = DEMO_EXPENSES.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Number((dailyBudget - totalSpent).toFixed(2));
  const pctUsed = Number(((totalSpent / dailyBudget) * 100).toFixed(1));

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Tagline reveal scroll state
  const taglineRef = useRef<HTMLDivElement>(null);
  const [wordsVisible, setWordsVisible] = useState<number>(0);

  // Public Page Modal state
  const [activePublicPage, setActivePublicPage] = useState<PublicPageId | null>(null);

  const openPublicPage = (page: PublicPageId) => {
    setActivePublicPage(page);
  };

  const taglineText =
    'You do not always need a higher salary. You need to understand where your current money is actually going.';
  const words = taglineText.split(' ');

  useEffect(() => {
    const handleScroll = () => {
      if (!taglineRef.current) return;
      const rect = taglineRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.top < windowHeight * 0.8 && rect.bottom > 0) {
        const progress = Math.min(1, Math.max(0, (windowHeight * 0.8 - rect.top) / (windowHeight * 0.4)));
        const visibleCount = Math.floor(progress * words.length);
        setWordsVisible(visibleCount);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [words.length]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F141C] flex flex-col justify-between selection:bg-[#D4952B]/20 selection:text-[#8C5D17]">
      {/* ── 1. Top Navbar (Floating resting bar with translucent surface blur) ── */}
      <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3">
        <nav className="max-w-6xl mx-auto rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-[#0F141C] rounded-lg"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F141C] flex items-center justify-center text-white">
                <span className="font-bold text-sm tracking-tight">₹</span>
              </div>
              <span className="font-bold text-base tracking-tight text-[#0F141C]">PAISA</span>
            </button>

            {/* Public Links */}
            <div className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
              <button
                onClick={() => openPublicPage('features')}
                className="hover:text-[#0F141C] transition-colors focus-visible:ring-2 rounded"
              >
                Features
              </button>
              <button
                onClick={() => openPublicPage('pricing')}
                className="hover:text-[#0F141C] transition-colors focus-visible:ring-2 rounded"
              >
                Pricing
              </button>
              <button
                onClick={() => openPublicPage('about')}
                className="hover:text-[#0F141C] transition-colors focus-visible:ring-2 rounded"
              >
                About
              </button>
              <button
                onClick={() => openPublicPage('faq')}
                className="hover:text-[#0F141C] transition-colors focus-visible:ring-2 rounded"
              >
                FAQ
              </button>
              <button
                onClick={() => openPublicPage('security')}
                className="hover:text-[#0F141C] transition-colors focus-visible:ring-2 rounded"
              >
                Security
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onSignIn || onGetStarted}
              className="btn-secondary text-xs px-3.5 py-1.5"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="btn-primary text-xs px-4 py-1.5"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* ── 2. Hero Section (One Offer, One Primary Action, Max 680px Text) ── */}
      <section className="px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-4xl mx-auto text-center space-y-6">
        {/* Editorial Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#D4952B]" />
          <span>Real financial reality check for India</span>
        </div>

        {/* Hero Heading with Deliberate Line Breaks and Left-to-Right Text Gradient */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-[680px] mx-auto leading-[1.08] bg-gradient-to-r from-[#0F141C] via-[#1E293B] to-[#475569] bg-clip-text text-transparent">
          Your daily money
          <br />
          reality check
        </h1>

        {/* Subheading Capped at 680px */}
        <p className="text-base sm:text-lg text-slate-600 max-w-[640px] mx-auto leading-relaxed">
          Track actual spending from UPI and bank statements with zero guesswork, zero fake numbers, and 100% privacy.
        </p>

        {/* Single Primary Action Above the Fold (No Competing CTA) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="btn-primary text-sm px-7 py-3 shadow-sm hover:shadow active:scale-[0.98]"
          >
            <span>Start your reality check</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          {onExploreDemo && (
            <button
              onClick={onExploreDemo}
              className="btn-secondary text-sm px-5 py-3 active:scale-[0.98]"
            >
              Explore demo
            </button>
          )}
        </div>

        {/* Proof Signal Strip Directly Below Hero */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Zero bank passwords required</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Non-custodial local storage</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Integer paise precision</span>
          </span>
        </div>
      </section>

      {/* ── 3. Mandatory Tagline Reveal Section (B11) ── */}
      <section
        ref={taglineRef}
        className="px-6 py-16 sm:py-24 max-w-4xl mx-auto w-full text-center"
      >
        <p className="text-2xl sm:text-4xl font-bold tracking-tight max-w-[680px] mx-auto leading-snug">
          {words.map((word, index) => {
            const isVisible = index < wordsVisible;
            return (
              <span
                key={index}
                className={`transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isVisible ? 'text-[#0F141C]' : 'text-slate-300'
                }`}
              >
                {word}{' '}
              </span>
            );
          })}
        </p>
      </section>

      {/* ── 4. Interactive Live Paisa Formula Calculator (How It Works) ── */}
      <section className="px-6 py-12 max-w-4xl mx-auto w-full">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F141C] tracking-tight">
              Experience the Paisa formula live
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              See how dividing your salary across calendar days converts everyday spending into immediate clarity:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Input Slider */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Monthly take-home pay
              </span>
              <div className="text-3xl font-bold text-[#0F141C] font-mono">
                {formatINR(demoMonthly, false)}
              </div>
              <input
                type="range"
                min={30000}
                max={300000}
                step={5000}
                value={demoMonthly}
                onChange={e => setDemoMonthly(Number(e.target.value))}
                className="w-full accent-[#0F141C] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>₹30,000</span>
                <span>₹3,00,000</span>
              </div>
            </div>

            {/* Computed Daily Allowance */}
            <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1 sm:text-right">
              <span className="text-xs font-semibold text-[#065F46] uppercase tracking-wider">
                Safe daily allowance
              </span>
              <div className="text-3xl font-bold text-[#059669] font-mono">
                {formatINR(dailyBudget)}/day
              </div>
              <p className="text-xs text-[#047857]">
                Recalculated every calendar morning
              </p>
            </div>
          </div>

          {/* Typical Spends Simulation */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <span className="text-xs font-semibold text-slate-500">
              Typical daily UPI purchases:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DEMO_EXPENSES.map((exp, i) => (
                <div key={i} className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">{exp.name}</div>
                  <div className="text-sm font-bold font-mono text-[#0F141C] mt-0.5">₹{exp.amount}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500">Spent today: </span>
                <strong className="text-[#0F141C] font-mono font-bold">{formatINR(totalSpent)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Remaining buffer: </span>
                <strong className={`font-mono font-bold ${remaining >= 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`}>
                  {formatINR(remaining)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Allowance used: </span>
                <strong className="text-[#0F141C] font-mono font-bold">{pctUsed}%</strong>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                  Within budget
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Benefits Bento Grid (Outcomes-Driven Copy) ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F141C] tracking-tight">
            Engineered for actual money, not imaginary numbers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Built specifically for Indian salary cycles, bank statements, and UPI habits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFIT_PILLARS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F141C]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {b.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#0F141C] tracking-tight">{b.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. Objection Handling FAQ Section ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto w-full space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F141C] tracking-tight">
            Frequently asked questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Everything you need to know about security, UPI tracking, and privacy.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 focus-visible:ring-2 focus-visible:ring-[#0F141C]"
                >
                  <span className="text-sm font-semibold text-[#0F141C]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. Final High-Contrast Call to Action ── */}
      <section className="px-6 py-16 max-w-4xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#0F141C] text-white space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight max-w-[540px] mx-auto leading-tight">
            Start understanding your money today
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-[480px] mx-auto leading-relaxed">
            Free forever, privacy-first, zero bank passwords. Experience what your salary actually allows.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="px-8 py-3 rounded-full bg-white text-[#0F141C] text-sm font-bold hover:bg-slate-100 active:scale-[0.98] transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <span>Start your reality check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 8. Semantic Multi-Column Footer ── */}
      <footer className="border-t border-slate-200 bg-white text-xs text-slate-500 pt-12 pb-8 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F141C] flex items-center justify-center text-white">
                  <span className="font-bold text-xs">₹</span>
                </div>
                <span className="font-bold text-base text-[#0F141C]">PAISA</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Daily money reality check designed for Indian salary earners. Your salary has a story; find out where it goes.
              </p>
              <div>
                <a
                  href="https://github.com/NaikAtharva002/paisa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#0F141C] hover:underline"
                >
                  GitHub Repository ↗
                </a>
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#0F141C] text-xs uppercase tracking-wider">Product</h4>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => openPublicPage('features')} className="hover:text-[#0F141C] transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={onExploreDemo} className="hover:text-[#0F141C] transition-colors">
                    Interactive Demo
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('pricing')} className="hover:text-[#0F141C] transition-colors">
                    Pricing & Plans
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('changelog')} className="hover:text-[#0F141C] transition-colors">
                    Changelog
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#0F141C] text-xs uppercase tracking-wider">Help & Security</h4>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => openPublicPage('help')} className="hover:text-[#0F141C] transition-colors">
                    Help Centre
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('faq')} className="hover:text-[#0F141C] transition-colors">
                    Frequently Asked Questions
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('security')} className="hover:text-[#0F141C] transition-colors">
                    Security Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('contact')} className="hover:text-[#0F141C] transition-colors">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#0F141C] text-xs uppercase tracking-wider">Legal & Compliance</h4>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => openPublicPage('privacy')} className="hover:text-[#0F141C] transition-colors">
                    Privacy Policy (DPDP 2023)
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('terms')} className="hover:text-[#0F141C] transition-colors">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('cookies')} className="hover:text-[#0F141C] transition-colors">
                    Storage Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => openPublicPage('disclaimer')} className="hover:text-[#0F141C] transition-colors">
                    Financial Disclaimer
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>© 2026 PAISA. Designed for India with calm precision.</div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Shield className="w-3.5 h-3.5 text-[#059669]" /> DPDP Act 2023 Compliant
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Landmark className="w-3.5 h-3.5 text-[#2563EB]" /> RBI AA Ready
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
