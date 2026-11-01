import React, { useState, useMemo } from 'react';
import { store } from '../../lib/storage';
import { Category, Transaction } from '../../types';
import { formatINR, isSpendingExpense, toPaise, fromPaise } from '../../lib/calculations';
import { showToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import {
  Target,
  Check,
  Edit2,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  PieChart,
  ShieldCheck,
  Calendar,
  Utensils,
  ShoppingBag,
  Car,
  Zap,
  Home,
  Film,
  Tv,
  Activity,
  BookOpen,
  Plane,
  Smile,
  ArrowLeftRight,
  PiggyBank,
  MoreHorizontal,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';

// Helper to render real Lucide SVG icons rather than raw string identifiers
export const renderCategoryIcon = (iconName?: string, className = 'w-4 h-4') => {
  switch (iconName?.toLowerCase()) {
    case 'utensils':
      return <Utensils className={className} />;
    case 'shoppingbag':
      return <ShoppingBag className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'tv':
      return <Tv className={className} />;
    case 'activity':
      return <Activity className={className} />;
    case 'bookopen':
      return <BookOpen className={className} />;
    case 'plane':
      return <Plane className={className} />;
    case 'smile':
      return <Smile className={className} />;
    case 'arrowleftright':
      return <ArrowLeftRight className={className} />;
    case 'trendingup':
      return <TrendingUp className={className} />;
    case 'piggybank':
      return <PiggyBank className={className} />;
    case 'morehorizontal':
      return <MoreHorizontal className={className} />;
    default:
      return <Tag className={className} />;
  }
};

type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export const BudgetManager: React.FC = () => {
  const categories = store.getCategories();
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const transactions = store.getTransactions();

  // Period filter
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'cat_food');
  const [amountInput, setAmountInput] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>('monthly');
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // New Custom Category sub-form state
  const [isCreatingCustomCat, setIsCreatingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');

  // Read budgets from store: Record<string, number> where limit > 0
  const categoryBudgets = store.getCategoryBudgets();
  const activeBudgetEntries = useMemo(() => {
    return Object.entries(categoryBudgets).filter(([_, limit]) => typeof limit === 'number' && limit > 0);
  }, [categoryBudgets]);

  // ----------------------------------------------------------------------
  // Section E: Transaction Intelligence Integration
  // Filter spending transactions by the active period with integer paise precision
  // ----------------------------------------------------------------------
  const { monthSpendingMap, totalPeriodSpend } = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    const currentYearPrefix = `${now.getFullYear()}`;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const spendMap = new Map<string, number>();
    let totalPaise = 0;

    for (const tx of transactions) {
      // 1. Must be genuine spending or refund (exclude income, credit card payments, internal transfers)
      if (tx.is_internal_transfer || tx.is_credit_card_payment || tx.transaction_type === 'income' || tx.transaction_type === 'transfer') {
        continue;
      }

      // 2. Period filter
      const txDate = tx.transaction_date.slice(0, 10);
      let matchPeriod = false;
      if (period === 'monthly') {
        matchPeriod = txDate.startsWith(currentMonthPrefix);
      } else if (period === 'weekly') {
        matchPeriod = txDate >= sevenDaysAgo;
      } else if (period === 'yearly') {
        matchPeriod = txDate.startsWith(currentYearPrefix);
      }

      if (!matchPeriod) continue;

      const pAmount = toPaise(tx.amount);
      const isRefund = tx.transaction_type === 'refund';
      const netPaise = isRefund ? -pAmount : pAmount;

      const currentCatPaise = spendMap.get(tx.category_id) || 0;
      spendMap.set(tx.category_id, currentCatPaise + netPaise);

      // Only add to total if category has an active budget
      if (categoryBudgets[tx.category_id] && categoryBudgets[tx.category_id] > 0) {
        totalPaise += netPaise;
      }
    }

    // Convert map from paise to rupees
    const convertedMap = new Map<string, number>();
    spendMap.forEach((p, catId) => {
      convertedMap.set(catId, Math.max(0, fromPaise(p)));
    });

    return {
      monthSpendingMap: convertedMap,
      totalPeriodSpend: Math.max(0, fromPaise(totalPaise)),
    };
  }, [transactions, period, categoryBudgets]);

  // ----------------------------------------------------------------------
  // Section B: Overall Summary Calculations
  // When zero budgets exist, total allocated is 0 and no misleading 40,000 or gauge!
  // ----------------------------------------------------------------------
  const summaryMetrics = useMemo(() => {
    if (activeBudgetEntries.length === 0) {
      return {
        totalAllocated: 0,
        totalSpent: 0,
        remaining: 0,
        overallPct: 0,
        hasBudgets: false,
        exceededCount: 0,
      };
    }

    let allocatedPaise = 0;
    let exceededCount = 0;

    for (const [catId, baseLimit] of activeBudgetEntries) {
      let scaledLimit = baseLimit;
      if (period === 'yearly') scaledLimit = baseLimit * 12;
      else if (period === 'weekly') scaledLimit = Math.round(baseLimit / 4.33);

      allocatedPaise += toPaise(scaledLimit);
      const catSpent = monthSpendingMap.get(catId) || 0;
      if (catSpent > scaledLimit) {
        exceededCount++;
      }
    }

    const totalAllocated = fromPaise(allocatedPaise);
    const remaining = totalAllocated - totalPeriodSpend;
    const overallPct = totalAllocated > 0 ? Math.min(100, Math.round((totalPeriodSpend / totalAllocated) * 100)) : 0;

    return {
      totalAllocated,
      totalSpent: totalPeriodSpend,
      remaining,
      overallPct,
      hasBudgets: true,
      exceededCount,
    };
  }, [activeBudgetEntries, period, totalPeriodSpend, monthSpendingMap]);

  // ----------------------------------------------------------------------
  // Modal Handlers (Create / Edit / Delete)
  // ----------------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setEditingCatId(null);
    setSelectedCatId(categories[0]?.id || 'cat_food');
    setAmountInput('');
    setSelectedPeriod(period);
    setIsCreatingCustomCat(false);
    setCustomCatName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (catId: string, currentLimit: number) => {
    setEditingCatId(catId);
    setSelectedCatId(catId);
    setAmountInput(String(currentLimit));
    setSelectedPeriod(period);
    setIsCreatingCustomCat(false);
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amountInput);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      alert('Please enter a budget amount greater than ₹0.');
      return;
    }

    let targetCatId = selectedCatId;

    // If user created a custom category on the fly
    if (isCreatingCustomCat && customCatName.trim()) {
      const newCatId = `cat_custom_${Date.now()}`;
      const newCat: Category = {
        id: newCatId,
        name: customCatName.trim(),
        icon: 'Tag',
        color: '#D4952B',
        category_type: 'expense',
      };
      store.addCategory(newCat);
      targetCatId = newCatId;
    }

    // Convert to monthly base limit if created under weekly or yearly
    let monthlyBaseLimit = parsedAmt;
    if (selectedPeriod === 'yearly') monthlyBaseLimit = Math.round(parsedAmt / 12);
    else if (selectedPeriod === 'weekly') monthlyBaseLimit = Math.round(parsedAmt * 4.33);

    store.updateCategoryBudget(targetCatId, monthlyBaseLimit);
    const catName = catMap.get(targetCatId)?.name || customCatName || targetCatId;

    showToast({
      type: 'success',
      title: editingCatId ? 'Budget Updated' : 'Budget Created',
      message: `${catName} budget set to ${formatINR(monthlyBaseLimit)}/month.`,
    });

    setIsModalOpen(false);
  };

  const handleDeleteBudget = (catId: string) => {
    const catName = catMap.get(catId)?.name || catId;
    store.deleteCategoryBudget(catId);
    setDeletingCatId(null);
    showToast({
      type: 'info',
      title: 'Budget Removed',
      message: `Spending limit for "${catName}" has been removed.`,
    });
  };

  // Circular gauge calculations
  const R = 54;
  const SW = 8;
  const C = 2 * Math.PI * R;
  const strokeDashoffset = C - (summaryMetrics.overallPct / 100) * C;

  return (
    <div className="space-y-5 animate-in max-w-4xl mx-auto px-2 sm:px-4">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Header Toolbar */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-card">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#181D26] tracking-tight">
            Spending Budgets
          </h2>
          <p className="text-xs text-[#7F899F] mt-0.5 font-medium">
            Category spending limits and discipline monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Toggle */}
          <div className="flex items-center gap-0.5 bg-[#FAF8F5] p-1 rounded-2xl border border-[#EDE8E0] text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'weekly' ? 'bg-[#181D26] text-white shadow-xs' : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'monthly' ? 'bg-[#181D26] text-white shadow-xs' : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'yearly' ? 'bg-[#181D26] text-white shadow-xs' : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Create Budget Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn-primary text-xs px-3.5 sm:px-4 py-2 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Overall Summary Card (Section B: Clean Slate & Accurate Totals) */}
      {/* ---------------------------------------------------------------- */}
      {!summaryMetrics.hasBudgets ? (
        // Clean Slate Zero State Banner (Section B)
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#EDE8E0] shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] flex items-center justify-center mx-auto shadow-xs">
            <Target className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-black text-base text-[#181D26]">Zero Budgets Configured</h3>
            <p className="text-xs text-[#7F899F] leading-relaxed">
              You haven't set any financial limits yet. Create a spending budget for categories like Food, Groceries, Shopping, or Bills to monitor your spending limits.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#5E687D] py-2 border-y border-[#EDE8E0]/60 max-w-lg mx-auto">
            <div>
              Total Allocated: <span className="font-mono-num font-black text-[#181D26]">₹0</span>
            </div>
            <span>•</span>
            <div>
              Total Spent: <span className="font-mono-num font-black text-[#181D26]">₹0</span>
            </div>
            <span>•</span>
            <div>
              Active Limits: <span className="font-mono-num font-black text-[#181D26]">0</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-all inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Your First Budget</span>
          </button>
        </div>
      ) : (
        // Active Budgets Summary Card (Accurate calculations, no hardcoded ₹40,000!)
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#EDE8E0] shadow-card">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Overall Circular Gauge & Numbers */}
            <div className="flex items-center gap-5 w-full md:w-auto">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    stroke="#FAF8F5"
                    strokeWidth={SW}
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    stroke={
                      summaryMetrics.overallPct >= 100
                        ? '#E06D53'
                        : summaryMetrics.overallPct >= 75
                        ? '#D4952B'
                        : '#2E8B57'
                    }
                    strokeWidth={SW}
                    strokeDasharray={C}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black font-mono-num text-[#181D26]">
                    {summaryMetrics.overallPct}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#7F899F]">
                    Used
                  </span>
                </div>
              </div>

              {/* Text Summary */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#7F899F] uppercase tracking-wider block">
                  {period === 'weekly' ? 'Weekly' : period === 'yearly' ? 'Yearly' : 'Monthly'} Budget Cap
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono-num text-[#181D26] tracking-tight">
                  {formatINR(summaryMetrics.totalSpent)}{' '}
                  <span className="text-sm font-medium text-[#7F899F]">
                    / {formatINR(summaryMetrics.totalAllocated)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  {summaryMetrics.remaining >= 0 ? (
                    <span className="text-xs font-bold text-[#2E8B57] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {formatINR(summaryMetrics.remaining)} remaining
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#E06D53] flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Exceeded by {formatINR(Math.abs(summaryMetrics.remaining))}
                    </span>
                  )}
                  {summaryMetrics.exceededCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                      {summaryMetrics.exceededCount} exceeded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats Pills */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] min-w-[130px]">
                <span className="text-[10px] font-bold text-[#7F899F] uppercase tracking-wider block">
                  Active Limits
                </span>
                <span className="text-sm font-black font-mono-num text-[#181D26]">
                  {activeBudgetEntries.length} {activeBudgetEntries.length === 1 ? 'Category' : 'Categories'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] min-w-[130px]">
                <span className="text-[10px] font-bold text-[#7F899F] uppercase tracking-wider block">
                  Discipline Health
                </span>
                <span
                  className={`text-sm font-black ${
                    summaryMetrics.overallPct <= 80 ? 'text-[#2E8B57]' : 'text-[#D4952B]'
                  }`}
                >
                  {summaryMetrics.overallPct <= 75
                    ? 'Comfortable'
                    : summaryMetrics.overallPct <= 99
                    ? 'Watchful'
                    : 'Critical'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. Category Budget Cards (Section C: Proper Lucide SVG Icons!) */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="text-xs font-bold text-[#7F899F] uppercase tracking-wider">
            Active Category Limits ({activeBudgetEntries.length})
          </div>
          {activeBudgetEntries.length > 0 && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="text-xs font-bold text-[#D4952B] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another category</span>
            </button>
          )}
        </div>

        {activeBudgetEntries.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-dashed border-[#DFD7C7] text-center text-xs text-[#7F899F]">
            No category budgets added yet. Click <strong>"Create Budget"</strong> above to set a spending limit.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeBudgetEntries.map(([catId, baseLimit]) => {
              const cat = catMap.get(catId);
              const catName = cat?.name || 'Custom Category';

              // Scale limit for active period view
              let limit = baseLimit;
              if (period === 'yearly') limit = baseLimit * 12;
              else if (period === 'weekly') limit = Math.round(baseLimit / 4.33);

              const spent = monthSpendingMap.get(catId) || 0;
              const remaining = limit - spent;
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = spent > limit;

              // Color based on status
              const barColor = isOver
                ? 'bg-[#E06D53]'
                : pct >= 75
                ? 'bg-[#D4952B]'
                : 'bg-[#2E8B57]';

              return (
                <div
                  key={catId}
                  className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all space-y-3.5 group relative"
                >
                  {/* Card Header: Icon + Category Name + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Section C: Proper Icon Component (Not raw string!) */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${cat?.color || '#D4952B'}15`,
                          color: cat?.color || '#D4952B',
                        }}
                      >
                        {renderCategoryIcon(cat?.icon, 'w-4 h-4')}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#181D26] truncate">
                          {catName}
                        </div>
                        <div className="text-[11px] text-[#7F899F] font-medium flex items-center gap-1.5">
                          <span className="capitalize">{period} limit</span>
                          <span>•</span>
                          <span className="font-mono-num">{pct}% used</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(catId, baseLimit)}
                        className="btn-icon w-7 h-7 text-[#5E687D] hover:text-[#181D26]"
                        title="Edit budget limit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(catId)}
                        className="btn-icon w-7 h-7 text-[#7F899F] hover:text-[#E06D53]"
                        title="Delete budget limit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts Row */}
                  <div className="flex items-baseline justify-between text-xs font-mono-num">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-[#7F899F] block">
                        Spent
                      </span>
                      <span className="font-black text-sm text-[#181D26]">
                        {formatINR(spent)}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-[#7F899F] block">
                        {isOver ? 'Exceeded By' : 'Remaining'}
                      </span>
                      <span
                        className={`font-black text-sm ${
                          isOver ? 'text-[#E06D53]' : 'text-[#2E8B57]'
                        }`}
                      >
                        {isOver ? `+${formatINR(Math.abs(remaining))}` : formatINR(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EDE8E0]">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, (spent / limit) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#7F899F] font-mono-num">
                      <span>Limit: {formatINR(limit)}</span>
                      <span>
                        {isOver ? (
                          <strong className="text-[#E06D53]">Over limit</strong>
                        ) : (
                          `${Math.round((remaining / limit) * 100)}% left`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Delete Confirmation Overlay for this card */}
                  {deletingCatId === catId && (
                    <div className="absolute inset-0 bg-white/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 z-10 animate-fadeIn border border-red-200">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <p className="text-xs font-bold text-[#181D26]">
                        Remove budget for "{catName}"?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(catId)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                        >
                          Yes, Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCatId(null)}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#5E687D]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Create / Edit Budget Modal (Section D) */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCatId ? 'Edit Spending Budget' : 'Create Category Budget'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs text-[#181D26]">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#3D4658]">
                Select Category
              </label>
              {!editingCatId && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCustomCat(!isCreatingCustomCat)}
                  className="text-[11px] font-bold text-[#D4952B] hover:underline"
                >
                  {isCreatingCustomCat ? 'Choose Existing' : '+ Custom Category'}
                </button>
              )}
            </div>

            {!isCreatingCustomCat ? (
              <select
                disabled={!!editingCatId}
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] disabled:opacity-60"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={customCatName}
                onChange={e => setCustomCatName(e.target.value)}
                placeholder="e.g. Gym & Fitness, Coffee, Gadgets"
                className="input-field text-xs rounded-2xl"
              />
            )}
          </div>

          {/* Budget Period */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#3D4658]">
              Budget Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['weekly', 'monthly', 'yearly'] as BudgetPeriod[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={`py-2 px-3 rounded-xl font-bold capitalize transition-all border ${
                    selectedPeriod === p
                      ? 'bg-[#181D26] text-white border-[#181D26] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#5E687D] border-[#EDE8E0] hover:text-[#181D26]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Limit Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#3D4658]">
              Spending Limit ({selectedPeriod})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#7F899F]">
                ₹
              </span>
              <input
                type="number"
                required
                min={100}
                step={50}
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                placeholder="e.g. 5000"
                className="input-field pl-8 text-sm font-bold font-mono-num rounded-2xl"
              />
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[2000, 5000, 10000, 15000, 25000, 50000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(String(val))}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] text-[11px] font-bold text-[#5E687D] hover:border-[#D4952B] hover:text-[#181D26] transition-colors"
                >
                  ₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#EDE8E0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-[#EDE8E0] text-xs font-bold text-[#5E687D] hover:text-[#181D26] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-colors shadow-xs"
            >
              {editingCatId ? 'Save Changes' : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
