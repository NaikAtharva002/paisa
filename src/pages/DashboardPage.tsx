import React from 'react';
import {
  calculateDailyReport,
  getEffectiveDailyBudget,
  formatINR,
  isSpendingExpense,
} from '../lib/calculations';
import { store } from '../lib/storage';
import { Transaction, RealityTone } from '../types';
import { BudgetProgress } from '../components/common/BudgetProgress';
import { StatCard } from '../components/common/StatCard';
import { DailyRealityBanner } from '../components/dashboard/DailyRealityBanner';
import { SpendingTimeline } from '../components/dashboard/SpendingTimeline';
import { CumulativeSpendingChart } from '../components/dashboard/CumulativeSpendingChart';
import { UpcomingBillsCard } from '../components/dashboard/UpcomingBillsCard';
import {
  Wallet,
  TrendingDown,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  Plus,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenAddExpense: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateToBills: () => void;
  currentTone: RealityTone;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddExpense,
  onEditTransaction,
  onNavigateToBills,
  currentTone,
}) => {
  const profile = store.getProfile();
  const transactions = store.getTransactions();
  const recurring = store.getRecurringPayments();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayStr = now.toISOString().slice(0, 10);

  // Filter today's transactions
  const todayTransactions = transactions.filter(t => t.transaction_date.slice(0, 10) === todayStr);

  // Month-to-date transactions
  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const mtdExpenses = transactions.filter(
    t => isSpendingExpense(t) && t.transaction_date.startsWith(currentMonthPrefix)
  );
  const mtdSpendingTotal = mtdExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Daily budget resolution
  const dailyBudget = getEffectiveDailyBudget(profile, currentYear, currentMonth);

  // Generate complete daily reality report
  const dailyReport = calculateDailyReport(
    dailyBudget,
    todayTransactions,
    todayStr,
    dailyBudget,
    currentTone
  );

  return (
    <div className="space-y-6">
      
      {/* 3 IMMEDIATE CORE NUMBERS (Section 8 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* 1. Today's Spending */}
        <StatCard
          title="1. Today's Spending"
          value={formatINR(dailyReport.actualSpending)}
          subtitle={`${dailyReport.transactionCount} purchase${dailyReport.transactionCount !== 1 ? 's' : ''} logged today`}
          icon={TrendingDown}
          variant={dailyReport.status === 'overspent' ? 'danger' : 'default'}
        />

        {/* 2. Today's Budget */}
        <StatCard
          title="2. Today's Budget"
          value={formatINR(dailyBudget)}
          subtitle={`Mode: ${profile.budgeting_mode.replace('_', ' ')}`}
          icon={Wallet}
          variant="primary"
          badge={profile.budgeting_mode === 'income_equivalent' ? 'Income Equivalent' : 'Spendable'}
        />

        {/* 3. Remaining Allowance or Overspending */}
        <StatCard
          title={dailyReport.remainingAllowance >= 0 ? "3. Remaining Allowance" : "3. Overspending"}
          value={dailyReport.remainingAllowance >= 0 
            ? formatINR(dailyReport.remainingAllowance) 
            : `-${formatINR(Math.abs(dailyReport.remainingAllowance))}`
          }
          subtitle={dailyReport.remainingAllowance >= 0 
            ? `${100 - Math.min(100, dailyReport.percentUsed)}% daily cushion left` 
            : `Exceeded target by ${Math.round((dailyReport.overspending / dailyBudget) * 100)}%`
          }
          icon={dailyReport.remainingAllowance >= 0 ? PiggyBank : AlertCircle}
          variant={dailyReport.remainingAllowance >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Main Dial & Nightly Reality Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Circular Budget Dial */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <BudgetProgress
            percentUsed={dailyReport.percentUsed}
            status={dailyReport.status}
            statusLabel={dailyReport.statusLabel}
            dailyBudget={dailyBudget}
            actualSpending={dailyReport.actualSpending}
            remainingAllowance={dailyReport.remainingAllowance}
          />
        </div>

        {/* Right: Daily Reality Check Banner */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <DailyRealityBanner
            report={dailyReport}
            tone={currentTone}
          />
        </div>

      </div>

      {/* Timeline & Chart Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* Chronological Spending Timeline */}
        <SpendingTimeline
          transactions={todayTransactions}
          dailyBudget={dailyBudget}
          onEditTransaction={onEditTransaction}
        />

        {/* Cumulative Velocity Chart */}
        <CumulativeSpendingChart
          transactions={todayTransactions}
          dailyBudget={dailyBudget}
        />

      </div>

      {/* Month-To-Date & Upcoming Bills Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* MTD Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Month-to-Date Spending
              </span>
              <span className="text-xs font-mono-num text-slate-300">
                {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num mt-1">
              {formatINR(mtdSpendingTotal)}
            </div>
            {profile.monthly_spending_target && (
              <div className="text-xs text-slate-400 mt-1">
                Target: {formatINR(profile.monthly_spending_target)} (
                {formatINR(Math.max(0, profile.monthly_spending_target - mtdSpendingTotal))} remaining)
              </div>
            )}
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${profile.monthly_spending_target ? Math.min(100, (mtdSpendingTotal / profile.monthly_spending_target) * 100) : 50}%`
              }}
            />
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Take-home: {formatINR(profile.monthly_income, false)}</span>
            <span>Savings Target: {formatINR(profile.savings_target, false)}</span>
          </div>
        </div>

        {/* Upcoming Bills */}
        <UpcomingBillsCard
          recurringPayments={recurring}
          onViewAll={onNavigateToBills}
        />

      </div>

    </div>
  );
};
