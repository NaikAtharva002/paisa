import React, { useState } from 'react';
import {
  calculateDailyReport,
  getEffectiveDailyBudget,
  formatINR,
  isSpendingExpense,
  compareMonthlySpending,
} from '../lib/calculations';
import { calculateMonthEndForecast } from '../lib/forecasting';
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
import { Upload, Plus, Sparkles, Landmark } from 'lucide-react';

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
    : mtdIncome - mtdSpendingTotal;

  const currentSavings = Math.max(0, mtdIncome - mtdSpendingTotal);

  // Month-over-Month & Forecasting Intelligence
  const categoryBudgets = store.getCategoryBudgets();
  const mom = compareMonthlySpending(transactions, currentMonthPrefix);
  const forecast = calculateMonthEndForecast({
    transactions,
    recurringPayments: recurring,
    profile,
    categoryBudgets,
    currentDate: now,
  });

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

  // Active budgets summary for the lower row card (computed strictly from user budgets)
  const budgetSummary = Object.entries(categoryBudgets)
    .filter(([_, limit]) => typeof limit === 'number' && limit > 0)
    .map(([catId, limit]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: cat?.name || catId,
        icon: '🏷️',
        spent: catAmountMap.get(catId) || 0,
        limit,
        color: cat?.color || '#E06D53',
      };
    });

  const isCleanSlate = transactions.length === 0 && accounts.length === 0;

  return (
    <div className="space-y-6 animate-in pb-12">
      {/* ── 1. Greeting Banner with Landscape Waves (Reference 2) ── */}
      <DailyRealityBanner
        report={dailyReport}
        tone={currentTone}
        displayName={user.display_name}
      />

      {/* ── Clean Slate Guidance Card for New Users ── */}
      {isCleanSlate && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF8F5] border-2 border-[#D4952B]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#181D26]">Zero Imaginary Data • Real Money Only</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF7EE] text-[#2E8B57] border border-[#CDE5D7]">
                Clean Slate Ready
              </span>
            </div>
            <p className="text-xs text-[#5E687D] max-w-xl leading-relaxed">
              PAISA is initialized with ₹0 balances and zero fabricated transactions. Import your bank statement (Excel, PDF, CSV) or log your first expense to activate your real-time daily spending intelligence.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenImport}
              className="px-4 py-2 rounded-xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#262D3B] transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#D4952B]" />
              <span>Import Statement</span>
            </button>
            <button
              onClick={onOpenAddExpense}
              className="px-4 py-2 rounded-xl bg-white border border-[#EDE8E0] text-[#181D26] text-xs font-bold hover:border-[#D4952B] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#2E8B57]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Top 4 Core KPI Metrics (Reference 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <StatCard
          title="Total Balance"
          value={formatINR(totalAccountBalance)}
          badge={
            accounts.length > 0
              ? `${accounts.length} linked account${accounts.length > 1 ? 's' : ''}`
              : transactions.length > 0
              ? 'Computed from transactions'
              : 'Clean state'
          }
          badgeVariant={totalAccountBalance > 0 ? 'sage' : 'neutral'}
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
          badge={
            mtdIncome > 0
              ? 'Verified Income'
              : 'No income recorded'
          }
          badgeVariant={mtdIncome > 0 ? 'sage' : 'neutral'}
          trendType="bars"
          trendColor="#2E8B57"
        />

        {/* Monthly Expenses */}
        <StatCard
          title="Monthly Expenses"
          value={formatINR(mtdSpendingTotal)}
          badge={
            mom.hasPreviousData
              ? `${mom.percentageChange > 0 ? `+${mom.percentageChange}%` : `${mom.percentageChange}%`} vs last mo`
              : `${mtdExpenses.length} purchases`
          }
          badgeVariant={mom.hasPreviousData && mom.percentageChange > 0 ? 'coral' : 'sage'}
          trendType="bars"
          trendColor={mom.hasPreviousData && mom.percentageChange > 0 ? '#E06D53' : '#2E8B57'}
        />

        {/* Savings */}
        <StatCard
          title="Savings"
          value={formatINR(currentSavings)}
          badge={
            forecast.status === 'sufficient_data'
              ? `Proj. ${formatINR(forecast.projectedSavings)}`
              : mtdIncome > 0
              ? `${Math.round((currentSavings / (mtdIncome || 1)) * 100)}% rate`
              : '0% rate'
          }
          badgeVariant={currentSavings > 0 ? 'sage' : 'neutral'}
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
