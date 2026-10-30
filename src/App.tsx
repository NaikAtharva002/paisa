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
import { Transaction, RealityTone } from './types';
import { CalendarDays, PieChart, Sparkles, Landmark, Settings as SettingsIcon, X } from 'lucide-react';

export function App() {
  // Listen for changes in the store to re-render reactively
  const [, setTick] = useState(0);
  useEffect(() => {
    return subscribeToStore(() => setTick(t => t + 1));
  }, []);

  const isOnboarded = store.isOnboarded();
  const user = store.getUser();
  const notifs = store.getNotificationPreferences();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showLanding, setShowLanding] = useState(!isOnboarded);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Reality check tone
  const [currentTone, setCurrentTone] = useState<RealityTone>(notifs.preferred_tone || 'friendly');

  const handleChangeTone = (tone: RealityTone) => {
    setCurrentTone(tone);
    store.updateNotificationPreferences({ preferred_tone: tone });
  };

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
      {/* ── 1. Desktop Left Sidebar (Reference 2) ── */}
      <DesktopSidebar
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
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
          currentTone={currentTone}
          onChangeTone={handleChangeTone}
          displayName={user.display_name}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 pb-24 lg:pb-12">
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
              onOpenInsights={() => setCurrentTab('insights')}
              onEditTransaction={tx => {
                setEditingTransaction(tx);
                setIsAddExpenseOpen(true);
              }}
              onNavigateToBills={() => setCurrentTab('recurring')}
              onNavigateToBudgets={() => setCurrentTab('budgets')}
              onNavigateToGoals={() => setCurrentTab('goals')}
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

          {currentTab === 'insights' && <AIInsightsView />}

          {currentTab === 'bank' && <BankAccountsPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* ── 3. Mobile Bottom Bar Navigation (Reference 2) ── */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
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
                  setCurrentTab('recurring');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <CalendarDays className="w-6 h-6 text-[#D4952B]" />
                <span>Bills & Subs</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('analytics');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <PieChart className="w-6 h-6 text-[#2E8B57]" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('insights');
                  setIsMobileMoreOpen(false);
                }}
                className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col items-center gap-2 hover:border-[#DFD7C7]"
              >
                <Sparkles className="w-6 h-6 text-[#8B5CF6]" />
                <span>AI Insights</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('bank');
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
                setCurrentTab('settings');
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
        title="Import Transactions from CSV Statement"
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
    </div>
  );
}

export default App;
