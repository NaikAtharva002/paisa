import React from 'react';
import { calculateDailyReport, getEffectiveDailyBudget, formatINR, isSpendingExpense } from '../lib/calculations';
import { store } from '../lib/storage';
import { Transaction, RealityTone } from '../types';
import { BudgetProgress } from '../components/common/BudgetProgress';
import { DailyRealityBanner } from '../components/dashboard/DailyRealityBanner';
import { SpendingTimeline } from '../components/dashboard/SpendingTimeline';
import { CumulativeSpendingChart } from '../components/dashboard/CumulativeSpendingChart';
import { UpcomingBillsCard } from '../components/dashboard/UpcomingBillsCard';
import { ArrowUpRight, CalendarDays, Plus } from 'lucide-react';

interface DashboardPageProps {
  onOpenAddExpense: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateToBills: () => void;
  currentTone: RealityTone;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenAddExpense, onEditTransaction, onNavigateToBills, currentTone }) => {
  const profile = store.getProfile();
  const transactions = store.getTransactions();
  const recurring = store.getRecurringPayments();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const todayTxs = transactions.filter(t => t.transaction_date.slice(0, 10) === todayStr);
  const mtdExpenses = transactions.filter(t => isSpendingExpense(t) && t.transaction_date.startsWith(monthPrefix));
  const mtdTotal = mtdExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const dailyBudget = getEffectiveDailyBudget(profile, currentYear, currentMonth);
  const report = calculateDailyReport(dailyBudget, todayTxs, todayStr, dailyBudget, currentTone);
  const mtdPct = profile.monthly_spending_target ? Math.min(100, (mtdTotal / profile.monthly_spending_target) * 100) : null;
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const allowanceLabel = report.remainingAllowance >= 0 ? 'Still yours to spend' : 'Over today’s allowance';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="paisa-dashboard-intro">
        <div>
          <div className="paisa-dashboard-kicker">Your daily money note · {dateLabel}</div>
          <h1 className="paisa-dashboard-title">A clearer picture<br className="hidden sm:block" /> starts here.</h1>
          <p className="paisa-dashboard-description">Small decisions add up. Here’s where today stands.</p>
        </div>
        <button type="button" onClick={onOpenAddExpense} className="btn-primary text-xs">
          <Plus className="w-4 h-4" /> Log a transaction
        </button>
      </div>

      <section className="paisa-dashboard-grid" aria-label="Today's spending overview">
        <div className="paisa-hero">
          <div>
            <div className="paisa-hero-label">{allowanceLabel}</div>
            <div className="paisa-hero-amount">{report.remainingAllowance < 0 ? '−' : ''}{formatINR(Math.abs(report.remainingAllowance), false)}</div>
          </div>
          <div>
            <div className="paisa-hero-rule" />
            <div className="paisa-hero-foot">
              <div className="paisa-hero-meta">
                <div>Spent <strong>{formatINR(report.actualSpending, false)}</strong> of <strong>{formatINR(dailyBudget, false)}</strong></div>
                <div>{report.transactionCount} transaction{report.transactionCount === 1 ? '' : 's'} recorded today</div>
              </div>
              <button type="button" onClick={onOpenAddExpense} className="btn-primary text-[11px]">
                <Plus className="w-3.5 h-3.5" /> Add expense
              </button>
            </div>
          </div>
        </div>
        <BudgetProgress percentUsed={report.percentUsed} status={report.status} statusLabel={report.statusLabel}
          dailyBudget={dailyBudget} actualSpending={report.actualSpending} remainingAllowance={report.remainingAllowance} />
      </section>

      <section className="paisa-dashboard-secondary" aria-label="Monthly money summary">
        <div className="paisa-mini-stat">
          <div className="paisa-mini-stat-label">Spent this month</div>
          <div className="paisa-mini-stat-value">{formatINR(mtdTotal, false)}</div>
          <div className="paisa-mini-stat-note">{now.toLocaleDateString('en-IN', { month: 'long' })} to date</div>
        </div>
        <div className="paisa-mini-stat">
          <div className="paisa-mini-stat-label">Monthly target</div>
          <div className="paisa-mini-stat-value">{profile.monthly_spending_target ? formatINR(profile.monthly_spending_target, false) : 'Not set'}</div>
          <div className="paisa-mini-stat-note">{profile.monthly_spending_target ? (mtdPct !== null ? `${Math.round(mtdPct)}% of target used` : 'Your spending plan') : 'Add a target in settings'}</div>
        </div>
        <div className="paisa-mini-stat">
          <div className="paisa-mini-stat-label">Monthly income</div>
          <div className="paisa-mini-stat-value">{formatINR(profile.monthly_income, false)}</div>
          <div className="paisa-mini-stat-note">Your take-home amount</div>
        </div>
      </section>

      <DailyRealityBanner report={report} tone={currentTone} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <SpendingTimeline transactions={todayTxs} dailyBudget={dailyBudget} onEditTransaction={onEditTransaction} />
        <CumulativeSpendingChart transactions={todayTxs} dailyBudget={dailyBudget} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="section-title">Monthly spending pace</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="w-3.5 h-3.5" /><span>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span></div>
            </div>
            <div className="text-3xl font-black font-mono-num text-slate-100 mt-3">{formatINR(mtdTotal)}</div>
            {profile.monthly_spending_target && <div className="text-xs text-slate-400 mt-1">Target: {formatINR(profile.monthly_spending_target)} · <span className={mtdTotal > profile.monthly_spending_target ? 'text-red-400' : 'text-emerald-400 font-semibold'}>{formatINR(Math.max(0, profile.monthly_spending_target - mtdTotal))} remaining</span></div>}
          </div>
          {mtdPct !== null && <div className="space-y-1.5"><div className="w-full h-2 bg-[#06091A] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${mtdPct > 100 ? 'bg-red-500' : mtdPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, mtdPct)}%` }} /></div></div>}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400"><span>Take-home: {formatINR(profile.monthly_income, false)}</span><span>Savings target: {formatINR(profile.savings_target ?? 0, false)}</span></div>
        </div>
        <UpcomingBillsCard recurringPayments={recurring} onViewAll={onNavigateToBills} />
      </div>
    </div>
  );
};
