import React, { useState } from 'react';
import {
  calculateDailyReport,
  getEffectiveDailyBudget,
  formatINR,
  isSpendingExpense,
} from '../lib/calculations';
import { store } from '../lib/storage';
import { Transaction, RealityTone } from '../types';
import { StatCard } from '../components/common/StatCard';
import { DailyRealityBanner } from '../components/dashboard/DailyRealityBanner';
import { QuickActionsRow } from '../components/dashboard/QuickActionsRow';
import { SpendingOverviewDonut } from '../components/dashboard/SpendingOverviewDonut';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import { ActiveBudgetsCard } from '../components/dashboard/ActiveBudgetsCard';
import { SavingsGoalsCard } from '../components/dashboard/SavingsGoalsCard';
import { UpcomingBillsCard } from '../components/dashboard/UpcomingBillsCard';
import { SpendingTimeline } from '../components/dashboard/SpendingTimeline';

interface DashboardPageProps {
  onOpenAddExpense: () => void;
  onOpenAddIncome?: () => void;
  onOpenImport?: () => void;
  onOpenInsights?: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateToBills: () => void;
  onNavigateToBudgets: () => void;
  onNavigateToGoals: () => void;
  currentTone: RealityTone;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddExpense,
  onOpenAddIncome = () => onOpenAddExpense(),
  onOpenImport = () => {},
  onOpenInsights = () => {},
  onEditTransaction,
  onNavigateToBills,
  onNavigateToBudgets,
  onNavigateToGoals,
  currentTone,
}) => {
  const profile = store.getProfile();
  const transactions = store.getTransactions();
  const recurring = store.getRecurringPayments();
  const goals = store.getSavingsGoals();
  const categories = store.getCategories();
  const user = store.getUser();

  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Transactions segregation
  const todayTransactions = transactions.filter(t => t.transaction_date.slice(0, 10) === todayStr);
  const todayExpenses = todayTransactions.filter(isSpendingExpense);
  const todaySpentTotal = todayExpenses.reduce((sum, t) => sum + t.amount, 0);

  const mtdExpenses = transactions.filter(
    t => isSpendingExpense(t) && t.transaction_date.startsWith(currentMonthPrefix)
  );
  const mtdSpendingTotal = mtdExpenses.reduce((sum, t) => sum + t.amount, 0);

  const mtdIncome = transactions
    .filter(t => t.transaction_type === 'income' && t.transaction_date.startsWith(currentMonthPrefix))
    .reduce((sum, t) => sum + t.amount, 0) || profile.monthly_income;

  // Balance calculation (accounts or income minus expenses)
  const accounts = store.getAccounts();
  const totalAccountBalance = accounts.length > 0
    ? accounts.reduce((sum, a) => sum + a.balance, 0)
    : profile.monthly_income * 2.75 - mtdSpendingTotal;

  const currentSavings = Math.max(0, mtdIncome - mtdSpendingTotal);

  // Daily budget calculations
  const dailyBudget = getEffectiveDailyBudget(profile, currentYear, currentMonth);
  const dailyReport = calculateDailyReport(
    dailyBudget,
    todayTransactions,
    todayStr,
    dailyBudget,
    currentTone
  );

  // Category breakdown for Donut Chart
  const catMap = new Map(categories.map(c => [c.id, { name: c.name, color: c.color }]));
  const catAmountMap = new Map<string, number>();

  mtdExpenses.forEach(t => {
    catAmountMap.set(t.category_id, (catAmountMap.get(t.category_id) || 0) + t.amount);
  });

  const categorySpends = Array.from(catAmountMap.entries())
    .map(([catId, amount]) => {
      const meta = catMap.get(catId);
      const percentage = mtdSpendingTotal > 0 ? Math.round((amount / mtdSpendingTotal) * 100) : 0;
      return {
        name: meta?.name || 'General',
        amount,
        color: meta?.color || '#D4952B',
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Active budgets summary for the lower row card
  const budgetSummary = [
    {
      id: 'cat_food',
      name: 'Food & Dining',
      icon: '🍱',
      spent: catAmountMap.get('cat_food') || 9104,
      limit: 12000,
      color: '#E06D53',
    },
    {
      id: 'cat_shopping',
      name: 'Shopping',
      icon: '🛍️',
      spent: catAmountMap.get('cat_shopping') || 5116,
      limit: 8000,
      color: '#D4952B',
    },
    {
      id: 'cat_transport',
      name: 'Transport',
      icon: '🚕',
      spent: catAmountMap.get('cat_transport') || 3408,
      limit: 5000,
      color: '#3B82F6',
    },
  ];

  return (
    <div className="space-y-6 animate-in pb-12">
      {/* ── 1. Greeting Banner with Landscape Waves (Reference 2) ── */}
      <DailyRealityBanner
        report={dailyReport}
        tone={currentTone}
        displayName={user.display_name}
      />

      {/* ── 2. Top 4 Core KPI Metrics (Reference 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <StatCard
          title="Total Balance"
          value={formatINR(totalAccountBalance)}
          badge="+12% this month"
          badgeVariant="sage"
          trendType="sparkline"
          trendColor="#2E8B57"
          isPrivateToggle={true}
          isObfuscated={isBalanceHidden}
          onTogglePrivacy={() => setIsBalanceHidden(!isBalanceHidden)}
        />

        {/* Monthly Income */}
        <StatCard
          title="Monthly Income"
          value={formatINR(mtdIncome)}
          badge="+8% from last month"
          badgeVariant="sage"
          trendType="bars"
          trendColor="#2E8B57"
        />

        {/* Monthly Expenses */}
        <StatCard
          title="Monthly Expenses"
          value={formatINR(mtdSpendingTotal)}
          badge="+6% from last month"
          badgeVariant="coral"
          trendType="bars"
          trendColor="#E06D53"
        />

        {/* Savings */}
        <StatCard
          title="Savings"
          value={formatINR(currentSavings)}
          badge="+22% this month"
          badgeVariant="sage"
          trendType="bars"
          trendColor="#2E8B57"
        />
      </div>

      {/* ── 3. Quick Actions & Today's Snapshot (Reference 2) ── */}
      <QuickActionsRow
        todaySpent={todaySpentTotal}
        budgetLeft={dailyReport.remainingAllowance}
        savingsCushion={Math.max(0, dailyBudget - todaySpentTotal)}
        onOpenAddExpense={onOpenAddExpense}
        onOpenAddIncome={onOpenAddIncome}
        onOpenImport={onOpenImport}
        onOpenInsights={onOpenInsights}
      />

      {/* ── 4. Visual Data Row: Donut + Monthly Trend (Reference 2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6">
          <SpendingOverviewDonut
            totalSpent={mtdSpendingTotal}
            categorySpends={categorySpends}
          />
        </div>
        <div className="lg:col-span-6">
          <MonthlyTrendChart
            currentMonthExpense={mtdSpendingTotal}
            currentMonthIncome={mtdIncome}
          />
        </div>
      </div>

      {/* ── 5. Lower Triple Cards: Active Budgets, Goals, Bills (Reference 2) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        <ActiveBudgetsCard
          budgets={budgetSummary}
          onViewAll={onNavigateToBudgets}
        />
        <SavingsGoalsCard
          goals={goals}
          onViewAll={onNavigateToGoals}
        />
        <UpcomingBillsCard
          recurringPayments={recurring}
          onViewAll={onNavigateToBills}
          onPayBill={() => onNavigateToBills()}
        />
      </div>

      {/* ── 6. Today's Chronological Spending Timeline ── */}
      <div className="pt-2">
        <SpendingTimeline
          transactions={todayTransactions}
          dailyBudget={dailyBudget}
          onEditTransaction={onEditTransaction}
        />
      </div>
    </div>
  );
};
