import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Landmark,
  Sparkles,
  HelpCircle,
  FileText,
  Mail,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Database,
  Coins,
  Cpu,
  ArrowRight,
  ExternalLink,
  Send,
  Zap,
} from 'lucide-react';

export type PublicPageId =
  | 'features'
  | 'about'
  | 'pricing'
  | 'faq'
  | 'help'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'disclaimer'
  | 'data-deletion'
  | 'data-retention'
  | 'security'
  | 'changelog';

export interface PublicPageMeta {
  id: PublicPageId;
  title: string;
  subtitle: string;
  category: 'product' | 'support' | 'legal' | 'trust';
}

export const PUBLIC_PAGES_META: PublicPageMeta[] = [
  { id: 'features', title: 'Product Features', subtitle: 'Calm, integer-exact money management designed for India', category: 'product' },
  { id: 'pricing', title: 'Pricing & Plans', subtitle: '100% Free Core with privacy-first transparency', category: 'product' },
  { id: 'about', title: 'About PAISA', subtitle: 'Our mission to bring reality and calm to salary earners', category: 'product' },
  { id: 'faq', title: 'Frequently Asked Questions', subtitle: 'Instant answers to your common questions', category: 'support' },
  { id: 'help', title: 'Help Centre & Guides', subtitle: 'Step-by-step instructions for getting the most from PAISA', category: 'support' },
  { id: 'contact', title: 'Contact & Feedback', subtitle: 'Reach out to the team or report an issue', category: 'support' },
  { id: 'security', title: 'Security & Privacy', subtitle: 'How we protect your financial data and why zero passwords are kept', category: 'trust' },
  { id: 'privacy', title: 'Privacy Policy', subtitle: 'DPDP Act 2023 compliant privacy declaration (Draft)', category: 'legal' },
  { id: 'terms', title: 'Terms of Service', subtitle: 'User agreement, limitations, and operational terms (Draft)', category: 'legal' },
  { id: 'cookies', title: 'Cookie & Storage Policy', subtitle: 'How we utilize HTML5 LocalStorage without ad tracking', category: 'legal' },
  { id: 'disclaimer', title: 'Financial Disclaimer', subtitle: 'Informational software notice and non-advisory declaration', category: 'legal' },
  { id: 'data-deletion', title: 'Data Deletion Guide', subtitle: 'How to self-serve erase your data immediately', category: 'legal' },
  { id: 'data-retention', title: 'Data Retention Info', subtitle: 'Storage duration and automated deletion timelines', category: 'legal' },
  { id: 'changelog', title: 'Changelog & Updates', subtitle: 'Latest features, improvements, and fixes', category: 'product' },
];

export const FeaturesView: React.FC = () => (
  <div className="space-y-8">
    <div className="prose prose-slate max-w-none">
      <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Financial Clarity in Every Micro-Transaction</h2>
      <p className="text-sm text-[#3D4658] leading-relaxed">
        PAISA translates your monthly salary into a clear, tangible daily spending allowance. As you spend throughout the day on groceries, dining, or bills, PAISA calculates your real-time leftover buffer so you never face month-end surprise deficits.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 rounded-2xl bg-white border border-[#EDE8E0] space-y-2">
        <div className="w-10 h-10 rounded-xl bg-[#FCF8EE] border border-[#EBD7AF] flex items-center justify-center text-[#D4952B]">
          <Zap className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-[#181D26] text-base">Real-Time Daily Allowance</h3>
        <p className="text-xs text-[#3D4658] leading-relaxed">
          Instead of nebulous monthly budgets, your disposable salary is distributed across days. Spent ₹400 on lunch? Your daily allowance updates instantaneously.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-[#EDE8E0] space-y-2">
        <div className="w-10 h-10 rounded-xl bg-[#F0F7F3] border border-[#CDE5D7] flex items-center justify-center text-[#2E8B57]">
          <Coins className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-[#181D26] text-base">Exact Integer Paise Arithmetic</h3>
        <p className="text-xs text-[#3D4658] leading-relaxed">
          Financial numbers are never stored in floating-point math. All amounts are calculated in exact integer paise (1 Rupee = 100 Paise), preventing 0.1 + 0.2 rounding discrepancies.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-[#EDE8E0] space-y-2">
        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#3B82F6]">
          <Landmark className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-[#181D26] text-base">Bank Statement Import (CSV & JSON)</h3>
        <p className="text-xs text-[#3D4658] leading-relaxed">
          Import statements from SBI, HDFC, ICICI, Axis, Kotak, and more. Parsing happens directly in your browser with duplicate prevention and atomic rollback.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-[#EDE8E0] space-y-2">
        <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#8B5CF6]">
          <Cpu className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-[#181D26] text-base">Intelligent Merchant Tagging</h3>
        <p className="text-xs text-[#3D4658] leading-relaxed">
          Automatic categorization for top Indian merchants including Swiggy, Zomato, Blinkit, Zepto, Uber, Ola, IRCTC, and Netflix.
        </p>
      </div>
    </div>
  </div>
);

export const PricingView: React.FC = () => (
  <div className="space-y-8">
    <div className="text-center max-w-xl mx-auto space-y-2">
      <h2 className="text-2xl font-black text-[#181D26]">Simple, Transparent, Free Core</h2>
      <p className="text-xs text-[#7F899F]">
        PAISA's essential personal finance management is 100% free with no credit card required.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <div className="p-6 rounded-2xl bg-white border-2 border-[#D4952B] space-y-4 shadow-sm relative">
        <div className="inline-block px-3 py-1 rounded-full bg-[#FCF8EE] border border-[#EBD7AF] text-[#8C5D17] text-[10px] font-bold">
          CURRENT PRODUCT
        </div>
        <div>
          <h3 className="text-xl font-black text-[#181D26]">PAISA Community</h3>
          <div className="text-3xl font-black text-[#181D26] font-mono-num mt-2">
            ₹0 <span className="text-xs text-[#7F899F] font-normal">/ lifetime</span>
          </div>
        </div>
        <p className="text-xs text-[#3D4658]">Full personal finance mastery with client-side privacy.</p>
        <ul className="space-y-2.5 text-xs text-[#3D4658] pt-2">
          {['Unlimited manual transactions', 'Daily reality check calculation', 'Monthly & annual budget limits', 'Savings goals with confetti tracking', 'Bank statement CSV/JSON imports', 'Full JSON & CSV data backups', 'Zero banking password requirements'].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E8B57] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-4 opacity-90">
        <div className="inline-block px-3 py-1 rounded-full bg-white border border-[#EDE8E0] text-[#7F899F] text-[10px] font-bold">
          ROADMAP / FUTURE
        </div>
        <div>
          <h3 className="text-xl font-black text-[#181D26]">PAISA Pro</h3>
          <div className="text-3xl font-black text-[#181D26] font-mono-num mt-2">
            ₹99 <span className="text-xs text-[#7F899F] font-normal">/ month (Planned)</span>
          </div>
        </div>
        <p className="text-xs text-[#3D4658]">Optional convenience features for power users and families.</p>
        <ul className="space-y-2.5 text-xs text-[#7F899F] pt-2">
          {['Multi-device encrypted cloud sync', 'Multi-user household budgeting', 'Automated recurring bank feeds', 'Custom CSV export mapping', 'Priority customer support'].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4952B] shrink-0"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export const AboutView: React.FC = () => (
  <div className="space-y-6 text-sm text-[#3D4658] leading-relaxed">
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] space-y-3">
      <h2 className="text-xl font-bold text-[#181D26]">Why We Built PAISA</h2>
      <p>
        In modern India, the frictionless tap of a smartphone screen makes it easier than ever to spend money without realizing the cumulative drain on our earnings. Traditional budgeting tools ask users to categorize 50 different micro-expenses into complex spreadsheets at the end of the month — by which time, the damage is already done.
      </p>
      <p>
        PAISA was conceived with a different premise: <strong>Translate abstract monthly earnings into an intuitive daily reality.</strong> If you know you have ₹1,200 available for today, buying a ₹400 dessert is a conscious choice, not an invisible accident.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0]">
        <div className="text-2xl font-black text-[#D4952B]">100%</div>
        <div className="text-xs font-semibold text-[#181D26] mt-1">Non-Custodial</div>
        <div className="text-[11px] text-[#7F899F]">We never touch your money</div>
      </div>
      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0]">
        <div className="text-2xl font-black text-[#2E8B57]">0</div>
        <div className="text-xs font-semibold text-[#181D26] mt-1">Bank Passwords</div>
        <div className="text-[11px] text-[#7F899F]">Zero credentials collected</div>
      </div>
      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0]">
        <div className="text-2xl font-black text-[#3B82F6]">100 Paise</div>
        <div className="text-xs font-semibold text-[#181D26] mt-1">Exact Arithmetic</div>
        <div className="text-[11px] text-[#7F899F]">Zero rounding discrepancies</div>
      </div>
    </div>
  </div>
);

export const SecurityView: React.FC = () => (
  <div className="space-y-6 text-sm text-[#3D4658] leading-relaxed">
    <div className="p-5 rounded-2xl bg-[#F0F7F3] border border-[#CDE5D7] flex items-start gap-4">
      <Shield className="w-8 h-8 text-[#2E8B57] shrink-0 mt-0.5" />
      <div>
        <h3 className="font-bold text-[#1E5C39] text-base">Privacy-First Architecture</h3>
        <p className="text-xs text-[#2E8B57] mt-1">
          PAISA is built around client-side cryptography. By default, your financial data never leaves your device unless you explicitly connect cloud sync.
        </p>
      </div>
    </div>

    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-1.5">
        <h4 className="font-bold text-xs text-[#181D26] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#D4952B]" /> Zero Banking Credential Collection
        </h4>
        <p className="text-xs text-[#7F899F]">
          We strictly never request, store, or transmit NetBanking passwords, UPI PINs, ATM PINs, OTP codes, or card CVVs.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-1.5">
        <h4 className="font-bold text-xs text-[#181D26] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#3B82F6]" /> Client-Side Web Crypto Hashing
        </h4>
        <p className="text-xs text-[#7F899F]">
          Account passwords are salted and hashed using standard SHA-256 via the browser's native Web Crypto API. Plaintext passwords never exist on our servers.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-1.5">
        <h4 className="font-bold text-xs text-[#181D26] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E06D53]" /> Brute-Force Rate Limiting
        </h4>
        <p className="text-xs text-[#7F899F]">
          Authentication locks after 5 consecutive failed login attempts for 5 minutes to prevent automated dictionary attacks.
        </p>
      </div>
    </div>
  </div>
);

export const FaqView: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Does PAISA connect to my bank account?',
      a: 'PAISA supports local bank statement imports (CSV and JSON) from major Indian banks (SBI, HDFC, ICICI, Axis, Kotak). Parsing happens entirely inside your browser. We also support simulated RBI Account Aggregator (AA) consent flows without ever asking for your NetBanking password.',
    },
    {
      q: 'Is PAISA free to use?',
      a: 'Yes! The entire core personal finance application — daily allowances, manual tracking, budget caps, savings goals, and statement imports — is 100% free with no credit card required.',
    },
    {
      q: 'What happens if I clear my browser history or switch phones?',
      a: 'Because PAISA is privacy-first and stores records on your device by default, clearing browser storage will delete offline records. We strongly encourage users to regularly export a full JSON backup via Settings -> Export Full Financial Backup, or connect optional Supabase cloud sync.',
    },
    {
      q: 'How does PAISA calculate my daily budget?',
      a: 'PAISA takes your monthly disposable income (Income minus Fixed Recurring Bills), subtracts what you have already spent this month, and divides the remaining amount by the number of days left in the current calendar month.',
    },
    {
      q: 'Does PAISA share my data with advertisers or loan apps?',
      a: 'Absolutely not. PAISA does not run advertising banners, tracking pixels, or data broker integrations. Your financial records are strictly private.',
    },
  ];

  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <div key={i} className="border border-[#EDE8E0] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full text-left px-5 py-4 flex items-center justify-between text-xs sm:text-sm font-bold text-[#181D26] hover:bg-[#FAF8F5]"
          >
            <span>{f.q}</span>
            <span className="text-[#D4952B] text-lg font-mono-num">{openIdx === i ? '−' : '+'}</span>
          </button>
          {openIdx === i && (
            <div className="px-5 pb-4 text-xs text-[#3D4658] leading-relaxed border-t border-[#EDE8E0] pt-3">
              {f.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const HelpCentreView: React.FC = () => (
  <div className="space-y-6 text-xs text-[#3D4658] leading-relaxed">
    <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-2">
      <h3 className="font-bold text-[#181D26] text-sm flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#D4952B]" /> 1. Getting Started (3-Minute Setup)
      </h3>
      <p>
        Upon launching PAISA, the onboarding wizard prompts for your name, monthly salary, and salary credit day (e.g. 1st or last day of the month). This configures your baseline daily spending allowance immediately.
      </p>
    </div>

    <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-2">
      <h3 className="font-bold text-[#181D26] text-sm flex items-center gap-2">
        <Coins className="w-4 h-4 text-[#2E8B57]" /> 2. Logging Everyday Transactions
      </h3>
      <p>
        Click "+ Add Expense" from anywhere in the app. Enter the amount, select the category (e.g., Food & Dining, Shopping, Utilities), and optionally note the merchant (e.g., Swiggy, Blinkit). The daily allowance recalculates on save.
      </p>
    </div>

    <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-2">
      <h3 className="font-bold text-[#181D26] text-sm flex items-center gap-2">
        <Landmark className="w-4 h-4 text-[#3B82F6]" /> 3. Importing Bank Statements
      </h3>
      <p>
        Export your account statement from your bank's portal as a CSV or JSON file. Click "Import Statement" in the Transactions tab. PAISA previews entries, detects duplicate transactions, and allows instant atomic rollback if needed.
      </p>
    </div>

    <div className="p-4 rounded-xl bg-white border border-[#EDE8E0] space-y-2">
      <h3 className="font-bold text-[#181D26] text-sm flex items-center gap-2">
        <Database className="w-4 h-4 text-[#8B5CF6]" /> 4. Backups and Device Migration
      </h3>
      <p>
        Go to <strong>Settings $\to$ Export Full Financial Backup</strong> to download a complete JSON archive of all transactions, budgets, goals, and recurring payments. To restore onto a new device, click "Restore From Backup".
      </p>
    </div>
  </div>
);

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<'feedback' | 'bug' | 'support' | 'privacy'>('feedback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    // Client-side recorded confirmation
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-[#EDE8E0] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#F0F7F3] border border-[#CDE5D7] text-[#2E8B57] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-[#181D26]">Feedback Received!</h3>
        <p className="text-xs text-[#7F899F] max-w-sm mx-auto">
          Thank you for reaching out. Your feedback has been recorded locally. For urgent inquiries, email us at <span className="text-[#181D26] font-semibold">support@paisa.money</span>.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setMessage('');
          }}
          className="btn-secondary text-xs px-4 py-2 mt-2"
        >
          Send Another Note
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-[#7F899F]">
        Have a feature suggestion, caught a bug, or have a question about how PAISA works? Let us know below:
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="section-title text-[#7F899F]">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Atharva"
              className="w-full text-xs p-3 rounded-xl bg-white border border-[#EDE8E0] focus:border-[#D4952B] outline-none"
            />
          </div>
          <div>
            <label className="section-title text-[#7F899F]">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full text-xs p-3 rounded-xl bg-white border border-[#EDE8E0] focus:border-[#D4952B] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="section-title text-[#7F899F]">Topic</label>
          <select
            value={topic}
            onChange={e => setTopic(e.target.value as any)}
            className="w-full text-xs p-3 rounded-xl bg-white border border-[#EDE8E0] focus:border-[#D4952B] outline-none"
          >
            <option value="feedback">Suggest a Feature / Feedback</option>
            <option value="bug">Report a Bug / Calculation Glitch</option>
            <option value="support">Customer Support Inquiry</option>
            <option value="privacy">Privacy / Data Inquiry (DPDP)</option>
          </select>
        </div>

        <div>
          <label className="section-title text-[#7F899F]">Your Message *</label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what you experienced or would love to see..."
            className="w-full text-xs p-3 rounded-xl bg-white border border-[#EDE8E0] focus:border-[#D4952B] outline-none"
          />
        </div>

        <button type="submit" className="btn-primary w-full text-xs py-3 flex items-center justify-center gap-2">
          <Send className="w-3.5 h-3.5" /> Submit Feedback
        </button>
      </form>
    </div>
  );
};

export const ChangelogView: React.FC = () => (
  <div className="space-y-6 text-xs text-[#3D4658]">
    <div className="border-l-2 border-[#D4952B] pl-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#181D26] text-sm">Version 1.0.0 Production Release</span>
        <span className="px-2 py-0.5 rounded-full bg-[#FCF8EE] text-[#8C5D17] text-[10px] font-bold">Latest</span>
      </div>
      <div className="text-[11px] text-[#7F899F]">October 31, 2026</div>
      <ul className="list-disc list-inside space-y-1 pt-1">
        <li>Completed 8-level production hardening with 134 passing automated tests.</li>
        <li>Implemented leap-year month-end clamping logic in recurring payment schedules.</li>
        <li>Introduced exact integer paise monetary calculations throughout all calculation engines.</li>
        <li>Added bank statement imports with CSV & JSON parsing and duplicate detection.</li>
        <li>Designed complete DPDP Act 2023 compliant legal and privacy documentation suite.</li>
      </ul>
    </div>
  </div>
);

export const MarkdownArticleView: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-[#181D26] border-b border-[#EDE8E0] pb-2">{title}</h2>
    <div className="text-xs text-[#3D4658] leading-relaxed whitespace-pre-wrap font-sans">
      {content}
    </div>
  </div>
);
