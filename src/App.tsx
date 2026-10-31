import React, { useState, useEffect } from 'react';
import { store, subscribeToStore } from './lib/storage';
import { NavTab, BottomNav } from './components/common/BottomNav';
import { DesktopSidebar } from './components/common/DesktopSidebar';
import { Header } from './components/common/Header';
import { Modal } from './components/common/Modal';
import { TransactionForm } from './components/transactions/TransactionForm';
import { CsvImportModal } from './components/transactions/CsvImportModal';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionList } from './components/transactions/TransactionList';
import { BudgetManager } from './components/budgets/BudgetManager';
import { SavingsGoalsList } from './components/budgets/SavingsGoalsList';
import { MonthlyReportView } from './components/analytics/MonthlyReportView';
import { AIInsightsView } from './components/analytics/AIInsightsView';
import { RecurringPage } from './pages/RecurringPage';
import { BankAccountsPage } from './pages/BankAccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/common/Toast';
import { CommandPalette } from './components/common/CommandPalette';
import { ShortcutsHelpModal } from './components/common/ShortcutsHelpModal';
import { Transaction, RealityTone } from './types';
import { CalendarDays, PieChart, Sparkles, Landmark, Settings as SettingsIcon, X } from 'lucide-react';

const VALID_TABS: NavTab[] = [
  'dashboard',
  'transactions',
  'budgets',
  'goals',
  'recurring',
  'analytics',
  'insights',
  'bank',
  'settings',
];

function getTabFromUrl(): NavTab {
  if (typeof window === 'undefined') return 'dashboard';
  const cleanPath = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  if (VALID_TABS.includes(cleanPath as NavTab)) {
    return cleanPath as NavTab;
  }
  return 'dashboard';
}

export function App() {
  // Listen for changes in the store to re-render reactively
  const [, setTick] = useState(0);
  useEffect(() => {
    return subscribeToStore(() => setTick(t => t + 1));
  }, []);

  const isOnboarded = store.isOnboarded();
  const user = store.getUser();
  const notifs = store.getNotificationPreferences();

  // Navigation state (URL synced)
  const [currentTab, setCurrentTab] = useState<NavTab>(() => getTabFromUrl());
  const [showLanding, setShowLanding] = useState(!isOnboarded);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Reality check tone
  const [currentTone, setCurrentTone] = useState<RealityTone>(notifs.preferred_tone || 'friendly');

  const handleChangeTone = (tone: RealityTone) => {
    setCurrentTone(tone);
    store.updateNotificationPreferences({ preferred_tone: tone });
  };

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'dashboard' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  // Sync URL popstate (Back/Forward browser buttons)
  useEffect(() => {
    const onPopState = () => {
      setCurrentTab(getTabFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
        return;
      }

      if (
        isCommandPaletteOpen ||
        isShortcutsHelpOpen ||
        isAddExpenseOpen ||
        isCsvImportOpen ||
        isNotificationsOpen
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setEditingTransaction(null);
        setIsAddExpenseOpen(true);
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('budgets');
      } else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('goals');
      } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('transactions');
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('recurring');
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('bank');
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    isShortcutsHelpOpen,
    isAddExpenseOpen,
    isCsvImportOpen,
    isNotificationsOpen,
  ]);

  // If user clicks "Get Started" from landing page
  if (showLanding && !showOnboarding) {
    return (
      <LandingPage
        onGetStarted={() => setShowOnboarding(true)}
        onExploreDemo={() => {
          setShowLanding(false);
          setShowOnboarding(false);
        }}
      />
    );
  }

  // If onboarding wizard is active
  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          setShowLanding(false);
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181D26] flex flex-row selection:bg-[#F0D49C] selection:text-[#181D26]">
      {/* Skip to Main Content (Accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-[#181D26] text-white font-bold rounded-xl shadow-lg border border-[#EDE8E0] transition-transform"
      >
        Skip to main content
      </a>

      {/* ── 1. Desktop Left Sidebar (Reference 2) ── */}
      <DesktopSidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* ── 2. Main Content Viewport ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#FAF8F5]">
        {/* Top Header */}
        <Header
          onOpenAddExpense={() => {
            setEditingTransaction(null);
            setIsAddExpenseOpen(true);
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
          currentTone={currentTone}
          onChangeTone={handleChangeTone}
          displayName={user.display_name}
        />

        {/* Scrollable Page Body */}
        <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 pb-24 lg:pb-12 focus:outline-hidden">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onOpenAddExpense={() => {
                setEditingTransaction(null);
                setIsAddExpenseOpen(true);
              }}
              onOpenAddIncome={() => {
                setEditingTransaction(null);
                setIsAddExpenseOpen(true);
              }}
              onOpenImport={() => setIsCsvImportOpen(true)}
              onOpenInsights={() => handleSelectTab('insights')}
              onEditTransaction={tx => {
                setEditingTransaction(tx);
                setIsAddExpenseOpen(true);
              }}
              onNavigateToBills={() => handleSelectTab('recurring')}
              onNavigateToBudgets={() => handleSelectTab('budgets')}
              onNavigateToGoals={() => handleSelectTab('goals')}
              currentTone={currentTone}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionList
              onAddTransaction={() => {
                setEditingTransaction(null);
                setIsAddExpenseOpen(true);
              }}
              onEditTransaction={tx => {
                setEditingTransaction(tx);
                setIsAddExpenseOpen(true);
              }}
              onOpenCsvImport={() => setIsCsvImportOpen(true)}
            />
          )}

          {currentTab === 'budgets' && <BudgetManager />}

          {currentTab === 'goals' && <SavingsGoalsList />}

          {currentTab === 'recurring' && <RecurringPage />}

          {currentTab === 'analytics' && <MonthlyReportView />}

          {currentTab === 'insights' && (
            <AIInsightsView
              onNavigateToBudgets={() => handleSelectTab('budgets')}
              onNavigateToGoals={() => handleSelectTab('goals')}
              onNavigateToBills={() => handleSelectTab('recurring')}
              onNavigateToSettings={() => handleSelectTab('settings')}
            />
          )}

          {currentTab === 'bank' && <BankAccountsPage />}

          {currentTab === 'settings' && <SettingsPage />}

          {!['dashboard', 'transactions', 'budgets', 'goals', 'recurring', 'analytics', 'insights', 'bank', 'settings'].includes(currentTab) && (
            <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 bg-white rounded-3xl border border-[#EDE8E0] shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-[#FCF8EE] border border-[#EBD7AF] flex items-center justify-center text-[#D4952B] mx-auto text-xl font-black">
                404
              </div>
              <h3 className="text-lg font-bold text-[#181D26]">Screen Not Found</h3>
              <p className="text-xs text-[#7F899F]">The section you are trying to view does not exist or has been relocated.</p>
              <button
                onClick={() => handleSelectTab('dashboard')}
                className="btn-primary text-xs px-5 py-2.5"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── 3. Mobile Bottom Bar Navigation (Reference 2) ── */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenMobileMenu={() => setIsMobileMoreOpen(true)}
      />

      {/* ── 4. Mobile "More" Drawer ── */}
      {isMobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex flex-col justify-end"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto animate-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-3">
              <span className="font-extrabold text-base text-[#181D26]">More Features</span>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-[#181D26]">
              <button
                onClick={() => {
                  handleSelectTab('recurring');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <CalendarDays className="w-6 h-6 text-[#D4952B]" />
                <span>Bills & Subs</span>
              </button>

              <button
                onClick={() => {
                  handleSelectTab('analytics');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <PieChart className="w-6 h-6 text-[#2E8B57]" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => {
                  handleSelectTab('insights');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <Sparkles className="w-6 h-6 text-[#8B5CF6]" />
                <span>AI Insights</span>
              </button>

              <button
                onClick={() => {
                  handleSelectTab('bank');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <Landmark className="w-6 h-6 text-[#3B82F6]" />
                <span>Accounts Sync</span>
              </button>
            </div>

            <button
              onClick={() => {
                handleSelectTab('settings');
                setIsMobileMoreOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] flex items-center justify-center gap-2"
            >
              <SettingsIcon className="w-4 h-4 text-[#7F899F]" />
              <span>Settings & Calibration</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Global Modals ── */}
      {/* Add / Edit Transaction */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Record Expense / Income'}
      >
        <TransactionForm
          initialData={editingTransaction}
          onSuccess={() => {
            setIsAddExpenseOpen(false);
            setEditingTransaction(null);
          }}
          onCancel={() => {
            setIsAddExpenseOpen(false);
            setEditingTransaction(null);
          }}
        />
      </Modal>

      {/* CSV Import */}
      <Modal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        title="Import Bank Statement (Excel, PDF, CSV)"
        maxWidth="max-w-xl"
      >
        <CsvImportModal
          onSuccess={count => {
            setIsCsvImportOpen(false);
            alert(`Successfully imported ${count} transactions!`);
          }}
          onClose={() => setIsCsvImportOpen(false)}
        />
      </Modal>

      {/* Notification Center */}
      <Modal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Notifications & Reality Alerts"
      >
        <NotificationCenter onClose={() => setIsNotificationsOpen(false)} />
      </Modal>

      {/* ── 6. Global Command Palette & Shortcuts Help ── */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={tab => {
          handleSelectTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onOpenAddExpense={() => {
          setIsCommandPaletteOpen(false);
          setEditingTransaction(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenCsvImport={() => {
          setIsCommandPaletteOpen(false);
          setIsCsvImportOpen(true);
        }}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      {/* ── 7. Global Toast Notification System ── */}
      <ToastContainer />
    </div>
  );
}

export default App;
