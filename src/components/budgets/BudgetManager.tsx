import React, { useState } from 'react';
import { Budget } from '../../types';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { Target, Plus, AlertCircle } from 'lucide-react';

export const BudgetManager: React.FC = () => {
  const categories = store.getCategories();
  const transactions = store.getTransactions();
  const profile = store.getProfile();

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
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Category Budgets (Monthly Pacing)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor and enforce spending limits per category
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.slice(0, 6).map(cat => {
          const spent = monthSpendingMap.get(cat.id) || 0;
          const limit = categoryBudgets[cat.id] || 10000;
          const pct = Math.min(150, Math.round((spent / limit) * 100));
          const isOver = spent > limit;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs text-slate-200">{cat.name}</div>
                <div className="text-right">
                  {editingCat === cat.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        placeholder={String(limit)}
                        className="w-20 px-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveBudget(cat.id)}
                        className="text-xs text-emerald-400 font-bold px-1.5"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCat(cat.id);
                        setBudgetInput(String(limit));
                      }}
                      className="text-xs text-slate-400 hover:text-white font-mono-num font-medium"
                    >
                      Limit: <strong className="text-slate-200">{formatINR(limit, false)}</strong> ✎
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                <span>Spent: <strong className={isOver ? 'text-red-400' : 'text-slate-200'}>{formatINR(spent)}</strong></span>
                <span>{pct}% used</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
