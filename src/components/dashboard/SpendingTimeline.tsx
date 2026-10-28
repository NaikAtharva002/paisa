import React from 'react';
import { Transaction } from '../../types';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { Clock, Coffee, ShoppingBag, Car, Utensils, Zap, HelpCircle, AlertCircle } from 'lucide-react';

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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
        <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
        <div className="text-sm font-semibold text-slate-300">No Spends Logged Today</div>
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
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Today's Spending Timeline & Running Allowance</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Updated budget remaining in real-time after each purchase
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
          {todayExpenses.length} purchase{todayExpenses.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {itemsWithRunning.map((item, index) => {
          const isOverNow = item.remainingAfter < 0;
          return (
            <div
              key={item.tx.id}
              onClick={() => onEditTransaction(item.tx)}
              className="relative group cursor-pointer"
            >
              {/* Timeline circle node */}
              <div
                className={`absolute -left-[1.8rem] top-1 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                  isOverNow
                    ? 'bg-red-500 border-red-950 ring-2 ring-red-500/30'
                    : 'bg-emerald-500 border-slate-950 ring-2 ring-emerald-500/30'
                }`}
              />

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 group-hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                
                {/* Left details */}
                <div className="flex items-start gap-3">
                  <div className="text-[11px] font-bold text-slate-400 font-mono-num w-16 pt-0.5 flex-shrink-0">
                    {item.timeFormatted}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <span>{item.tx.merchant}</span>
                      {item.tx.is_unplanned && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                          Unplanned
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {catMap.get(item.tx.category_id) || 'General'} • {item.tx.payment_method}
                      {item.tx.description ? ` • ${item.tx.description}` : ''}
                    </div>
                  </div>
                </div>

                {/* Right amounts */}
                <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/50">
                  <div className="text-sm font-bold text-slate-100 font-mono-num">
                    {formatINR(item.tx.amount)}
                  </div>
                  <div className="text-[11px] font-medium flex items-center gap-1 font-mono-num">
                    <span className="text-slate-400 text-[10px]">Left:</span>
                    <span className={item.remainingAfter >= 0 ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                      {item.remainingAfter >= 0 ? formatINR(item.remainingAfter) : `-${formatINR(Math.abs(item.remainingAfter))}`}
                    </span>
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
