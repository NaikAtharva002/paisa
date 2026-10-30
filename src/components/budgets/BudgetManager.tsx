import React, { useState } from 'react';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { Target, Check, Edit2, ShieldAlert, Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { showToast } from '../common/Toast';
import { Modal } from '../common/Modal';

export const BudgetManager: React.FC = () => {
  const categories = store.getCategories();
  const transactions = store.getTransactions();
  const profile = store.getProfile();

  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCatId, setNewCatId] = useState(categories[0]?.id || 'cat_food');
  const [newAmount, setNewAmount] = useState('');
  const [newPeriod, setNewPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [rollover, setRollover] = useState(false);

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

  const handleSaveBudget = (catId: string, customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      store.updateCategoryBudget(catId, val);
      setCategoryBudgets(store.getCategoryBudgets());
      const catName = categories.find(c => c.id === catId)?.name || catId;
      showToast({
        type: 'success',
        title: 'Budget updated!',
        message: `${catName} budget set to ${formatINR(val)}`,
      });
    }
    setEditingCat(null);
    setBudgetInput('');
  };

  const handleCreateBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt < 0) {
      alert('Please enter a valid budget amount');
      return;
    }
    handleSaveBudget(newCatId, amt);
    setIsCreateOpen(false);
    setNewAmount('');
  };

  const handleDeleteBudget = (catId: string) => {
    const catName = categories.find(c => c.id === catId)?.name || catId;
    if (confirm(`Remove custom budget limit for "${catName}"?`)) {
      handleSaveBudget(catId, 0);
    }
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
        <div className="flex items-center justify-between px-2">
          <div className="text-xs font-bold text-[#7F899F] uppercase tracking-wider">
            Category Budgets & Spending Caps
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Budget</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.slice(0, 8).map((cat, i) => {
            const spent = monthSpendingMap.get(cat.id) || 0;
            const limit = categoryBudgets[cat.id] || 10000;
            const pct = Math.min(100, Math.round((spent / limit) * 100));
            const isOver = spent > limit;
            const barColor = getCategoryColor(i);

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all space-y-3 group"
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
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCat(null)}
                          className="btn-icon w-6 h-6 text-[#7F899F]"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
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
                          className="text-[#A4ADC0] hover:text-[#181D26] p-1 rounded-lg"
                          title="Edit limit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {limit > 0 && (
                          <button
                            onClick={() => handleDeleteBudget(cat.id)}
                            className="text-[#A4ADC0] hover:text-[#E06D53] p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Reset limit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

      {/* Create Budget Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Category Spending Budget"
      >
        <form onSubmit={handleCreateBudgetSubmit} className="space-y-4">
          <div>
            <label className="section-title text-[#7F899F]">Target Category</label>
            <select
              value={newCatId}
              onChange={e => setNewCatId(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] outline-none"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Monthly Limit Amount (INR ₹)</label>
            <input
              type="number"
              required
              min="0"
              step="100"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="e.g. 12000"
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] font-mono-num outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-title text-[#7F899F]">Budget Period</label>
              <select
                value={newPeriod}
                onChange={e => setNewPeriod(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs text-[#181D26] outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 text-xs text-[#3D4658] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rollover}
                  onChange={e => setRollover(e.target.checked)}
                  className="rounded accent-[#D4952B] w-4 h-4 cursor-pointer"
                />
                <span>Rollover unused funds</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Save Budget
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
