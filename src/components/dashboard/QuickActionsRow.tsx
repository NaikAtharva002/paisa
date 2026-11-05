import React from 'react';
import { Plus, ArrowUpRight, Upload, Sparkles, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { formatINR } from '../../lib/calculations';

interface QuickActionsRowProps {
  todaySpent: number;
  budgetLeft: number;
  savingsCushion: number;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenImport: () => void;
  onOpenInsights: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  todaySpent,
  budgetLeft,
  savingsCushion,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenImport,
  onOpenInsights,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
      {/* 4 Quick Action Buttons */}
      <div className="lg:col-span-6 grid grid-cols-4 gap-2 sm:gap-3">
        {/* Add Expense */}
        <button
          onClick={onOpenAddExpense}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center group focus-visible:ring-2 focus-visible:ring-[#0F141C]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center mb-1.5 transition-colors">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F141C]">Add expense</span>
        </button>

        {/* Add Income */}
        <button
          onClick={onOpenAddIncome}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center group focus-visible:ring-2 focus-visible:ring-[#0F141C]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center mb-1.5 transition-colors">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F141C]">Add income</span>
        </button>

        {/* Import Statement */}
        <button
          onClick={onOpenImport}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center group focus-visible:ring-2 focus-visible:ring-[#0F141C]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center mb-1.5 transition-colors">
            <Upload className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F141C]">Import CSV</span>
        </button>

        {/* AI Insights */}
        <button
          onClick={onOpenInsights}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center group focus-visible:ring-2 focus-visible:ring-[#0F141C]"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0F141C] flex items-center justify-center mb-1.5 transition-colors">
            <Sparkles className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F141C]">AI insights</span>
        </button>
      </div>

      {/* Today's Snapshot Card */}
      <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#0F141C]">Today's snapshot</span>
          <span className="text-[11px] text-slate-500 font-medium">Real-time allowance</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* Spent */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-[#E11D48]" />
              <span>Spent</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-[#0F141C] mt-0.5">
              {formatINR(todaySpent)}
            </div>
          </div>

          {/* Budget Left */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <div className="text-[10px] text-[#065F46] font-semibold flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3" />
              <span>Budget left</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-[#059669] mt-0.5">
              {budgetLeft >= 0 ? formatINR(budgetLeft) : `-${formatINR(Math.abs(budgetLeft))}`}
            </div>
          </div>

          {/* Daily Cushion */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-center gap-1">
              <PiggyBank className="w-3 h-3 text-[#059669]" />
              <span>Savings</span>
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-[#0F141C] mt-0.5">
              {formatINR(savingsCushion)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
