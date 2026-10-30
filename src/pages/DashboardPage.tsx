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
  PiggyBank,
  AlertCircle,
  CalendarDays,
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
  const todayStr = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const todayTxs = transactions.filter(t => t.transaction_date.slice(0, 10) === todayStr);
  const mtdExpenses = transactions.filter(
    t => isSpendingExpense(t) && t.transaction_date.startsWith(monthPrefix)
  );
  const mtdTotal = mtdExpenses.reduce((s, t) => s + t.amount, 0);

  const dailyBudget = getEffectiveDailyBudget(profile, currentYear, currentMonth);
  const report = calculateDailyReport(dailyBudget, todayTxs, todayStr, dailyBudget, currentTone);

  const mtdPct = profile.monthly_spending_target
    ? Math.min(100, (mtdTotal / profile.monthly_spending_target) * 100)
    : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 3 IMMEDIATE CORE NUMBERS (Section 8 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="1. Today's Spending"
          value={formatINR(report.actualSpending)}
          subtitle={`${report.transactionCount} transaction${report.transactionCount !== 1 ? 's' : ''} logged today`}
          icon={TrendingDown}
          variant={report.status === 'overspent' ? 'danger' : report.status === 'getting_close' ? 'warning' : 'default'}
        />
        <StatCard
          title="2. Today's Budget"
          value={formatINR(dailyBudget)}
          subtitle={`Mode: ${profile.budgeting_mode.replace('_', ' ')}`}
          icon={Wallet}
          variant="primary"
          badge={profile.budgeting_mode === 'income_equivalent' ? 'Income Equivalent' : 'Spendable'}
        />
        <StatCard
          title={report.remainingAllowance >= 0 ? "3. Remaining Allowance" : "3. Overspending"}
          value={report.remainingAllowance >= 0
            ? formatINR(report.remainingAllowance)
            : `-${formatINR(Math.abs(report.remainingAllowance))}`
          }
          subtitle={report.remainingAllowance >= 0
            ? `${Math.round(100 - Math.min(100, report.percentUsed))}% daily cushion left`
            : `Exceeded by ${Math.round((report.overspending / dailyBudget) * 100)}%`
          }
          icon={report.remainingAllowance >= 0 ? PiggyBank : AlertCircle}
          variant={report.remainingAllowance >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Main Dial & Nightly Reality Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-center">
          <BudgetProgress
            percentUsed={report.percentUsed}
            status={report.status}
            statusLabel={report.statusLabel}
            dailyBudget={dailyBudget}
            actualSpending={report.actualSpending}
            remainingAllowance={report.remainingAllowance}
          />
        </div>
        <div className="lg:col-span-7 flex flex-col justify-center">
          <DailyRealityBanner report={report} tone={currentTone} />
        </div>
      </div>

      {/* Timeline & Velocity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <SpendingTimeline
          transactions={todayTxs}
          dailyBudget={dailyBudget}
          onEditTransaction={onEditTransaction}
        />
        <CumulativeSpendingChart
          transactions={todayTxs}
          dailyBudget={dailyBudget}
        />
      </div>

      {/* MTD Card + Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Month-to-Date */}
        <div className="p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="section-title text-slate-400">Month-to-Date Spending</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="text-3xl font-black font-mono-num text-slate-100 mt-2">
              {formatINR(mtdTotal)}
            </div>
            {profile.monthly_spending_target && (
              <div className="text-xs text-slate-400 mt-1">
                Target: {formatINR(profile.monthly_spending_target)} (
                <span className={mtdTotal > profile.monthly_spending_target ? 'text-red-400' : 'text-emerald-400 font-semibold'}>
                  {formatINR(Math.max(0, profile.monthly_spending_target - mtdTotal))} remaining
                </span>)
              </div>
            )}
          </div>

          {/* Progress bar */}
          {mtdPct !== null && (
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-[#06091A] rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    mtdPct > 100 ? 'bg-red-500' : mtdPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, mtdPct)}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Take-home: {formatINR(profile.monthly_income, false)}</span>
            <span>Savings Target: {formatINR(profile.savings_target ?? 0, false)}</span>
          </div>
        </div>

        {/* Upcoming Bills */}
        <UpcomingBillsCard recurringPayments={recurring} onViewAll={onNavigateToBills} />
      </div>
    </div>
  );
};
