import React from 'react';
import { Plus, ArrowUpRight, FileSpreadsheet, Sparkles, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
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
      {/* 4 Action Circle Buttons (Reference 2) */}
      <div className="lg:col-span-6 grid grid-cols-4 gap-2 sm:gap-3">
        {/* Add Expense */}
        <button
          onClick={onOpenAddExpense}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] hover:border-[#FBDCD5] hover:shadow-card transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-[#FDF1EE] text-[#E06D53] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-bold text-[#181D26] tracking-tight">Add Expense</span>
        </button>

        {/* Add Income */}
        <button
          onClick={onOpenAddIncome}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] hover:border-[#D4EED9] hover:shadow-card transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-[#EBF7EE] text-[#2E8B57] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-bold text-[#181D26] tracking-tight">Add Income</span>
        </button>

        {/* Scan / Import */}
        <button
          onClick={onOpenImport}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] hover:border-[#FCEECB] hover:shadow-card transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-[#FEF8EA] text-[#D4952B] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#181D26] tracking-tight">Import CSV</span>
        </button>

        {/* AI Insights */}
        <button
          onClick={onOpenInsights}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] hover:border-[#E9DEFF] hover:shadow-card transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-[#F4EEFF] text-[#8B5CF6] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#181D26] tracking-tight">AI Insights</span>
        </button>
      </div>

      {/* Today's Snapshot Card (Reference 2) */}
      <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#181D26]">Today's Snapshot</span>
          <span className="text-[11px] text-[#7F899F]">Real-time allowance</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* Spent */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <div className="text-[10px] text-[#7F899F] font-semibold flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-[#E06D53]" />
              <span>Spent</span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono-num text-[#181D26] mt-0.5">
              {formatINR(todaySpent)}
            </div>
          </div>

          {/* Budget Left */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#EBF7EE] border border-[#D4EED9]">
            <div className="text-[10px] text-[#2E8B57] font-semibold flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3" />
              <span>Budget Left</span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono-num text-[#2E8B57] mt-0.5">
              {budgetLeft >= 0 ? formatINR(budgetLeft) : `-${formatINR(Math.abs(budgetLeft))}`}
            </div>
          </div>

          {/* Daily Cushion */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <div className="text-[10px] text-[#7F899F] font-semibold flex items-center justify-center gap-1">
              <PiggyBank className="w-3 h-3 text-[#2E8B57]" />
              <span>Savings</span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono-num text-[#181D26] mt-0.5">
              {formatINR(savingsCushion)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
