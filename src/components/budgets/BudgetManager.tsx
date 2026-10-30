import React, { useState } from 'react';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { Target, Check, Edit2 } from 'lucide-react';

export const BudgetManager: React.FC = () => {
  const categories = store.getCategories();
  const transactions = store.getTransactions();

  // Calculate spending per category for current month
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthSpendingMap = new Map<string, number>();

  transactions.forEach(tx => {
    if (isSpendingExpense(tx) && tx.transaction_date.startsWith(currentMonthPrefix)) {
      const cur = monthSpendingMap.get(tx.category_id) || 0;
      monthSpendingMap.set(tx.category_id, cur + tx.amount);
    }
  });

  // Mock initial category budgets if none created
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({
    cat_food: 12000,
    cat_groceries: 15000,
    cat_shopping: 8000,
    cat_transport: 4000,
    cat_entertainment: 3500,
  });

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const handleSaveBudget = (catId: string) => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      setCategoryBudgets(prev => ({ ...prev, [catId]: val }));
    }
    setEditingCat(null);
    setBudgetInput('');
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Category Budgets & Pacing</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Set and monitor monthly spending caps for individual categories
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {categories.slice(0, 6).map(cat => {
          const spent = monthSpendingMap.get(cat.id) || 0;
          const limit = categoryBudgets[cat.id] || 10000;
          const pct = Math.min(150, Math.round((spent / limit) * 100));
          const isOver = spent > limit;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-[#06091A] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
                <div className="text-right">
                  {editingCat === cat.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        placeholder={String(limit)}
                        className="w-24 px-2 py-1 text-xs bg-[#0D1426] border border-emerald-500 rounded-lg text-white font-mono-num focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveBudget(cat.id)}
                        className="btn-icon w-6 h-6 text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono-num font-bold text-slate-300">
                        Cap: {formatINR(limit)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingCat(cat.id);
                          setBudgetInput(String(limit));
                        }}
                        className="text-slate-500 hover:text-slate-200 transition-colors p-1"
                        title="Edit limit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-[#0D1426] rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono-num">
                  <span className={isOver ? 'text-red-400 font-bold' : 'text-slate-400'}>
                    Spent: {formatINR(spent)}
                  </span>
                  <span className={isOver ? 'text-red-400 font-bold' : 'text-slate-500'}>
                    {pct}% used
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
