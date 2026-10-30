import React, { useState } from 'react';
import {
  X,
  Shield,
  FileText,
  HelpCircle,
  Mail,
  Sparkles,
  Lock,
  ArrowLeft,
  Search,
} from 'lucide-react';
import {
  PublicPageId,
  PUBLIC_PAGES_META,
  FeaturesView,
  PricingView,
  AboutView,
  SecurityView,
  FaqView,
  HelpCentreView,
  ContactView,
  ChangelogView,
  MarkdownArticleView,
} from './PublicPagesContent';

interface PublicPageModalProps {
  initialPage?: PublicPageId;
  isOpen: boolean;
  onClose: () => void;
  onGetStarted?: () => void;
}

const LEGAL_TEXTS: Record<string, { title: string; content: string }> = {
  privacy: {
    title: 'Privacy Policy (Draft)',
    content: `PAISA is a privacy-first, client-side, non-custodial personal finance tracking application.

1. ZERO BANKING PASSWORDS
We NEVER ask for, transmit, or store your NetBanking passwords, UPI PINs, ATM PINs, OTP codes, or debit/credit card CVVs.

2. LOCAL DEVICE STORAGE
By default, all your transactions, budgets, recurring bills, and savings goals reside in your device's browser localStorage and IndexedDB.

3. DATA PROTECTION (DPDP ACT 2023)
You possess the statutory right to view, export (JSON/CSV), and delete ("Erase Everything") all your financial records at any time.

4. NO DATA SELLING
We do not sell, broker, or monetize your personal or financial information with third-party advertising networks.

Full statutory documentation is available in docs/legal/PRIVACY_POLICY_DRAFT.md.`,
  },
  terms: {
    title: 'Terms of Service (Draft)',
    content: `Terms and Conditions of Use for PAISA:

1. NON-CUSTODIAL TOOL
PAISA is an automated, self-directed financial calculation and record-keeping tool. PAISA is not a bank, not an NBFC, and does not hold user funds.

2. NOT SEBI INVESTMENT ADVICE
PAISA is not registered as a SEBI Investment Adviser. Nothing in this software constitutes financial, investment, legal, or tax advice.

3. USER RESPONSIBILITY
You are solely responsible for maintaining the confidentiality of your device and keeping local backup export archives safe.

4. RECONCILIATION
Calculations, daily allowances, and spending forecasts are algorithmic estimations based on user-entered data. Official balances must always be verified directly against official banking statements.

Full terms are available in docs/legal/TERMS_AND_CONDITIONS_DRAFT.md.`,
  },
  cookies: {
    title: 'Cookie & LocalStorage Policy (Draft)',
    content: `PAISA uses HTML5 LocalStorage strictly for core functionality and offline operation:

- paisa_vault_v1: Encrypted local storage key for your financial records.
- paisa_auth_state: Temporary session state.
- paisa_theme_prefs: Visual preference settings.

ZERO ADVERTISING COOKIES:
PAISA does not use marketing or cross-site tracking cookies. You may clear local storage at any time via Settings -> Erase Everything or through your browser settings.`,
  },
  disclaimer: {
    title: 'Financial Disclaimer (Draft)',
    content: `PAISA is an informational software tool designed for personal cash flow tracking.

- Not SEBI Registered: We do not offer registered investment advice, portfolio management, or tax counseling.
- No Guarantees: Using PAISA does not guarantee savings or financial improvement.
- Autonomous Operation: All spending forecasts and run-rate projections are deterministic mathematical extrapolations based on historical user records.`,
  },
  'data-deletion': {
    title: 'Data Deletion & Account Erasure',
    content: `You have the complete right to erase all your personal financial data at any time:

INSTANT SELF-SERVE ERASURE:
1. Open PAISA and navigate to Settings.
2. Scroll to the "Danger Zone" section.
3. Click "Erase Everything & Reset Vault".
4. Confirm the prompt.

All local storage keys, cached records, and active sessions will be destroyed immediately and permanently. For cloud sync accounts, cloud records are purged within 72 hours.`,
  },
  'data-retention': {
    title: 'Data Retention Schedules',
    content: `PAISA strictly observes the principle of storage limitation under India's DPDP Act:

- Offline Local Records: Retained on your device until you clear browser data or click "Erase Everything".
- Cloud Synchronized Records: Retained as long as your account remains active.
- Security Audit Records: Retained for up to 90 days for cybersecurity compliance under CERT-In guidelines.`,
  },
};

export const PublicPageModal: React.FC<PublicPageModalProps> = ({
  initialPage = 'features',
  isOpen,
  onClose,
  onGetStarted,
}) => {
  const [currentPage, setCurrentPage] = useState<PublicPageId>(initialPage);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentMeta = PUBLIC_PAGES_META.find(p => p.id === currentPage) || PUBLIC_PAGES_META[0];

  const filteredPages = PUBLIC_PAGES_META.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'features':
        return <FeaturesView />;
      case 'pricing':
        return <PricingView />;
      case 'about':
        return <AboutView />;
      case 'security':
        return <SecurityView />;
      case 'faq':
        return <FaqView />;
      case 'help':
        return <HelpCentreView />;
      case 'contact':
        return <ContactView />;
      case 'changelog':
        return <ChangelogView />;
      case 'privacy':
      case 'terms':
      case 'cookies':
      case 'disclaimer':
      case 'data-deletion':
      case 'data-retention':
        const doc = LEGAL_TEXTS[currentPage];
        return <MarkdownArticleView title={doc.title} content={doc.content} />;
      default:
        return <FeaturesView />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#181D26]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#EDE8E0] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#EDE8E0] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4952B] to-[#E5AB4B] flex items-center justify-center text-white shrink-0 shadow-xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#181D26] truncate">{currentMeta.title}</h2>
              <p className="text-[11px] text-[#7F899F] truncate">{currentMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onGetStarted && (
              <button
                onClick={() => {
                  onClose();
                  onGetStarted();
                }}
                className="btn-primary text-xs px-3.5 py-1.5 hidden sm:inline-flex"
              >
                Get Started Free
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-xl text-[#7F899F] hover:text-[#181D26] hover:bg-[#FAF8F5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Sidebar Navigation */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#FAF8F5]">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#EDE8E0] bg-white/70 p-3 flex flex-col gap-2 shrink-0 overflow-y-auto">
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 text-[#7F899F] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] focus:border-[#D4952B] outline-none"
              />
            </div>

            <div className="text-[10px] font-bold text-[#7F899F] uppercase tracking-wider px-2 pt-2">
              Browse Topics
            </div>

            <div className="space-y-0.5">
              {filteredPages.map(page => {
                const isActive = currentPage === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPage(page.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-[#181D26] text-white shadow-xs'
                        : 'text-[#3D4658] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="truncate">{page.title}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D4952B]"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Content Viewer */}
          <div className="flex-1 p-5 sm:p-8 overflow-y-auto bg-[#FAF8F5]">
            <div className="max-w-2xl mx-auto pb-10">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 border-t border-[#EDE8E0] bg-white flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7F899F] px-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#2E8B57]" /> DPDP Act 2023 Compliant
            </span>
            <span>•</span>
            <span>Zero Banking Passwords</span>
          </div>
          <div>PAISA — Personal Finance for India</div>
        </div>
      </div>
    </div>
  );
};
