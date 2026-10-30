import React from 'react';
import { Transaction } from '../../types';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { Clock } from 'lucide-react';

interface SpendingTimelineProps {
  transactions: Transaction[];
  dailyBudget: number;
  onEditTransaction: (tx: Transaction) => void;
}

export const SpendingTimeline: React.FC<SpendingTimelineProps> = ({
  transactions,
  dailyBudget,
  onEditTransaction,
}) => {
  const categories = store.getCategories();
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // Sort ascending by time for the chronological timeline
  const todayExpenses = transactions
    .filter(isSpendingExpense)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  if (todayExpenses.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] text-center shadow-card">
        <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
        <div className="text-sm font-semibold text-slate-200">No Spends Logged Today</div>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Your full daily allowance of {formatINR(dailyBudget)} is currently untouched. Tap "Add Expense" as you spend throughout the day!
        </p>
      </div>
    );
  }

  // Calculate cumulative running remaining budget
  let currentSpent = 0;
  const itemsWithRunning = todayExpenses.map(tx => {
    currentSpent += tx.amount;
    const remainingAfter = Number((dailyBudget - currentSpent).toFixed(2));
    const timeFormatted = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(tx.transaction_date));

    return {
      tx,
      timeFormatted,
      cumulativeSpent: currentSpent,
      remainingAfter,
    };
  });

  return (
    <div className="p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Today's Spending Timeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Running allowance balance updated after each purchase
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {todayExpenses.length} purchase{todayExpenses.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {itemsWithRunning.map((item) => {
          const isOverNow = item.remainingAfter < 0;
          const categoryName = catMap.get(item.tx.category_id) || 'General';

          return (
            <div
              key={item.tx.id}
              onClick={() => onEditTransaction(item.tx)}
              className="relative group cursor-pointer"
            >
              {/* Timeline circle node */}
              <div
                className={`absolute -left-[1.85rem] top-2 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                  isOverNow
                    ? 'bg-red-500 border-[#06091A] ring-2 ring-red-500/30'
                    : 'bg-emerald-500 border-[#06091A] ring-2 ring-emerald-500/30'
                }`}
              />

              <div className="p-3.5 rounded-xl bg-[#06091A] border border-white/[0.06] group-hover:border-white/[0.14] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Left details */}
                <div className="flex items-start gap-3">
                  <div className="text-[11px] font-bold text-slate-400 font-mono-num w-16 pt-0.5 flex-shrink-0">
                    {item.timeFormatted}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <span>{item.tx.merchant}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {categoryName}
                      </span>
                      {item.tx.payment_method && (
                        <span className="text-[10px] font-mono-num text-slate-500">
                          {item.tx.payment_method}
                        </span>
                      )}
                    </div>
                    {item.tx.description && item.tx.description !== item.tx.merchant && (
                      <div className="text-xs text-slate-400 mt-0.5">{item.tx.description}</div>
                    )}
                  </div>
                </div>

                {/* Right amounts */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0">
                  <div className="text-sm font-bold text-white font-mono-num">
                    -{formatINR(item.tx.amount)}
                  </div>
                  <div
                    className={`text-[11px] font-mono-num font-semibold ${
                      isOverNow ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {isOverNow ? `Over by ${formatINR(Math.abs(item.remainingAfter))}` : `${formatINR(item.remainingAfter)} left`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
