import React, { useState, useEffect } from 'react';
import { store, subscribeToStore } from './lib/storage';
import { NavTab, BottomNav } from './components/common/BottomNav';
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
import { RecurringPage } from './pages/RecurringPage';
import { BankAccountsPage } from './pages/BankAccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Transaction, RealityTone } from './types';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top App Header */}
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

      {/* Desktop Subnav & Mobile Bottom Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onOpenAddExpense={() => {
              setEditingTransaction(null);
              setIsAddExpenseOpen(true);
            }}
            onEditTransaction={tx => {
              setEditingTransaction(tx);
              setIsAddExpenseOpen(true);
            }}
            onNavigateToBills={() => setCurrentTab('recurring')}
            currentTone={currentTone}
          />
        )}

        {currentTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">All Transactions</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filter, search, import CSV bank statements, or export clean spreadsheets
                </p>
              </div>
            </div>
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
          </div>
        )}

        {currentTab === 'budgets' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Budgets & Savings Goals</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set category spending limits and grow your emergency cushion
              </p>
            </div>
            <BudgetManager />
            <SavingsGoalsList />
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Monthly Analytics & Insights</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Understand category breakdowns, cash flow, top merchants, and spending velocity
              </p>
            </div>
            <MonthlyReportView />
          </div>
        )}

        {currentTab === 'recurring' && <RecurringPage />}

        {currentTab === 'bank' && <BankAccountsPage />}

        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* MODAL: Add / Edit Transaction */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Quick Add Expense'}
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

      {/* MODAL: CSV Import with Duplicate Detection */}
      <Modal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        title="Import Transactions from CSV"
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

      {/* MODAL: Notification Center */}
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
