import React, { useState } from 'react';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { Target, Check, Edit2, ShieldAlert } from 'lucide-react';

export const BudgetManager: React.FC = () => {
  const categories = store.getCategories();
  const transactions = store.getTransactions();
  const profile = store.getProfile();

  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Calculate spending per category for current month
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthSpendingMap = new Map<string, number>();
  let totalMonthSpend = 0;

  transactions.forEach(tx => {
    if (isSpendingExpense(tx) && tx.transaction_date.startsWith(currentMonthPrefix)) {
      const cur = monthSpendingMap.get(tx.category_id) || 0;
      monthSpendingMap.set(tx.category_id, cur + tx.amount);
      totalMonthSpend += tx.amount;
    }
  });

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(
    store.getCategoryBudgets()
  );

  const baseBudgetLimit = Object.values(categoryBudgets).reduce((a, b) => a + b, 0) || 40000;
  const totalBudgetLimit = period === 'yearly' ? baseBudgetLimit * 12 : baseBudgetLimit;
  const currentSpend = period === 'yearly' ? totalMonthSpend * 12 : totalMonthSpend;
  const overallPct = totalBudgetLimit > 0 ? Math.min(100, Math.round((currentSpend / totalBudgetLimit) * 100)) : 0;

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const handleSaveBudget = (catId: string) => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      store.updateCategoryBudget(catId, val);
      setCategoryBudgets(store.getCategoryBudgets());
    }
    setEditingCat(null);
    setBudgetInput('');
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#E06D53', '#D4952B', '#2E8B57', '#3B82F6', '#8B5CF6', '#141820'];
    return colors[index % colors.length];
  };

  // Circular gauge parameters
  const R = 64;
  const SW = 10;
  const C = 2 * Math.PI * R;
  const offset = C - (overallPct / 100) * C;

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      {/* Top Card with Period Switcher & Large Circular Gauge (Reference 2) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col items-center justify-between">
        
        {/* Monthly / Yearly Toggle (Reference 2) */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-[#EDE8E0] text-xs font-semibold mb-6">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-5 py-1.5 rounded-full transition-all ${
              period === 'monthly' ? 'bg-[#181D26] text-white shadow-sm font-bold' : 'text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-5 py-1.5 rounded-full transition-all ${
              period === 'yearly' ? 'bg-[#181D26] text-white shadow-sm font-bold' : 'text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Big Circular Budget Meter (Reference 2) */}
        <div className="relative my-2 flex items-center justify-center">
          <svg width="190" height="190" viewBox="0 0 160 160" className="-rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="#F5F2EB" strokeWidth={SW} />
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="#2E8B57"
              strokeWidth={SW}
              strokeDasharray={C}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl sm:text-5xl font-black font-mono-num text-[#181D26] tracking-tight">
              {overallPct}%
            </span>
            <span className="text-xs font-mono-num text-[#7F899F] font-semibold mt-1">
              {formatINR(totalMonthSpend)} / {formatINR(totalBudgetLimit)}
            </span>
          </div>
        </div>

        <div className="text-xs text-[#7F899F] font-medium mt-3 text-center">
          {totalBudgetLimit - totalMonthSpend >= 0 ? (
            <span className="text-[#2E8B57] font-semibold">
              {formatINR(totalBudgetLimit - totalMonthSpend)} remaining in overall budget
            </span>
          ) : (
            <span className="text-[#E06D53] font-semibold">
              Exceeded planned budget by {formatINR(Math.abs(totalBudgetLimit - totalMonthSpend))}
            </span>
          )}
        </div>
      </div>

      {/* Category Breakdown Cards (Reference 2) */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-[#7F899F] uppercase tracking-wider px-2">
          Category Budgets
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.slice(0, 6).map((cat, i) => {
            const spent = monthSpendingMap.get(cat.id) || 0;
            const limit = categoryBudgets[cat.id] || 10000;
            const pct = Math.min(100, Math.round((spent / limit) * 100));
            const isOver = spent > limit;
            const barColor = getCategoryColor(i);

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center text-base">
                      {cat.icon}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-[#181D26]">{cat.name}</div>
                      <div className="text-[11px] text-[#7F899F]">Monthly limit</div>
                    </div>
                  </div>

                  <div className="text-right">
                    {editingCat === cat.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={budgetInput}
                          onChange={e => setBudgetInput(e.target.value)}
                          placeholder={String(limit)}
                          className="w-24 px-2.5 py-1 text-xs bg-white border border-[#D4952B] rounded-lg text-[#181D26] font-mono-num font-bold focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveBudget(cat.id)}
                          className="btn-icon w-6 h-6 bg-[#EBF7EE] text-[#2E8B57]"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono-num font-bold text-[#181D26]">
                          {formatINR(spent)} <span className="text-[#7F899F] font-normal">/ {formatINR(limit)}</span>
                        </span>
                        <button
                          onClick={() => {
                            setEditingCat(cat.id);
                            setBudgetInput(String(limit));
                          }}
                          className="text-[#A4ADC0] hover:text-[#181D26] p-1"
                          title="Edit limit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar with percentage on right */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[#F5F2EB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isOver ? '#E06D53' : barColor,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono-num font-bold text-[#5E687D] w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
