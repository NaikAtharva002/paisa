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
  const [, setTick] = useState(0);
  useEffect(() => subscribeToStore(() => setTick(t => t + 1)), []);

  const isOnboarded = store.isOnboarded();
  const user = store.getUser();
  const notifs = store.getNotificationPreferences();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showLanding, setShowLanding] = useState(!isOnboarded);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentTone, setCurrentTone] = useState<RealityTone>(notifs.preferred_tone || 'friendly');

  const handleChangeTone = (tone: RealityTone) => {
    setCurrentTone(tone);
    store.updateNotificationPreferences({ preferred_tone: tone });
  };
  const openAddExpense = () => { setEditingTransaction(null); setIsAddExpenseOpen(true); };
  const editTransaction = (tx: Transaction) => { setEditingTransaction(tx); setIsAddExpenseOpen(true); };

  if (showLanding && !showOnboarding) {
    return <LandingPage onGetStarted={() => setShowOnboarding(true)} onExploreDemo={() => { setShowLanding(false); setShowOnboarding(false); }} />;
  }
  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => { setShowOnboarding(false); setShowLanding(false); setCurrentTab('dashboard'); }} />;
  }

  const pageCopy: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Your money, at a glance', subtitle: 'A little clarity goes a long way.' },
    transactions: { title: 'Transactions', subtitle: 'The details behind every rupee.' },
    budgets: { title: 'Budgets & goals', subtitle: 'Give your money a direction.' },
    analytics: { title: 'Your spending patterns', subtitle: 'See the story behind the numbers.' },
    recurring: { title: 'Bills & subscriptions', subtitle: 'Know what is coming before it arrives.' },
    bank: { title: 'Connected accounts', subtitle: 'Manage your account connections and consent.' },
    settings: { title: 'Your preferences', subtitle: 'Make PAISA work the way you think about money.' },
  };

  return (
    <div className="app-shell selection:bg-emerald-100 selection:text-emerald-900">
      <div className="app-frame">
        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        <div className="app-main">
          <Header onOpenAddExpense={openAddExpense} onOpenNotifications={() => setIsNotificationsOpen(true)}
            currentTone={currentTone} onChangeTone={handleChangeTone} displayName={user.display_name} />
          <main className="app-content">
            {currentTab !== 'dashboard' && (
              <div className="mb-7">
                <div className="app-page-heading">{pageCopy[currentTab].title}</div>
                <p className="app-page-subheading">{pageCopy[currentTab].subtitle}</p>
              </div>
            )}
            {currentTab === 'dashboard' && <DashboardPage onOpenAddExpense={openAddExpense} onEditTransaction={editTransaction} onNavigateToBills={() => setCurrentTab('recurring')} currentTone={currentTone} />}
            {currentTab === 'transactions' && <TransactionList onAddTransaction={openAddExpense} onEditTransaction={editTransaction} onOpenCsvImport={() => setIsCsvImportOpen(true)} />}
            {currentTab === 'budgets' && <div className="space-y-7"><BudgetManager /><SavingsGoalsList /></div>}
            {currentTab === 'analytics' && <MonthlyReportView />}
            {currentTab === 'recurring' && <RecurringPage />}
            {currentTab === 'bank' && <BankAccountsPage />}
            {currentTab === 'settings' && <SettingsPage />}
          </main>
        </div>
      </div>

      <Modal isOpen={isAddExpenseOpen} onClose={() => { setIsAddExpenseOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? 'Edit Transaction' : 'Quick Add Expense'}>
        <TransactionForm initialData={editingTransaction} onSuccess={() => { setIsAddExpenseOpen(false); setEditingTransaction(null); }}
          onCancel={() => { setIsAddExpenseOpen(false); setEditingTransaction(null); }} />
      </Modal>
      <Modal isOpen={isCsvImportOpen} onClose={() => setIsCsvImportOpen(false)} title="Import Transactions from CSV" maxWidth="max-w-xl">
        <CsvImportModal onSuccess={count => { setIsCsvImportOpen(false); alert(`Successfully imported ${count} transactions!`); }}
          onClose={() => setIsCsvImportOpen(false)} />
      </Modal>
      <Modal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} title="Notifications & Reality Alerts">
        <NotificationCenter onClose={() => setIsNotificationsOpen(false)} />
      </Modal>
    </div>
  );
}
export default App;
