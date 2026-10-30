import React from 'react';
import { ArrowRight } from 'lucide-react';
import { formatINR } from '../../lib/calculations';

interface BudgetSummaryItem {
  id: string;
  name: string;
  icon: string;
  spent: number;
  limit: number;
  color?: string;
}

interface ActiveBudgetsCardProps {
  budgets: BudgetSummaryItem[];
  onViewAll: () => void;
}

export const ActiveBudgetsCard: React.FC<ActiveBudgetsCardProps> = ({ budgets, onViewAll }) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#181D26]">Active Budgets</h3>
          <p className="text-xs text-[#7F899F] mt-0.5">Pacing against monthly caps</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#D4952B] hover:text-[#B87D1E] font-bold flex items-center gap-1 group transition-colors"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="space-y-3.5">
        {budgets.slice(0, 3).map((item) => {
          const pct = Math.min(100, Math.round((item.spent / item.limit) * 100));
          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center text-xs">
                    {item.icon}
                  </span>
                  <span className="font-bold text-[#181D26]">{item.name}</span>
                </div>
                <div className="font-mono-num text-[11px] font-bold text-[#3D4658]">
                  {formatINR(item.spent)} <span className="text-[#7F899F] font-normal">/ {formatINR(item.limit)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-2 bg-[#F5F2EB] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.color || '#E06D53',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono-num font-bold text-[#7F899F] w-7 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
