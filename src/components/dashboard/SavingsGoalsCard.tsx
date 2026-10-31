import React from 'react';
import { ArrowRight, Laptop, Sparkles, ShieldCheck } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatINR } from '../../lib/calculations';

interface SavingsGoalsCardProps {
  goals: SavingsGoal[];
  onViewAll: () => void;
}

export const SavingsGoalsCard: React.FC<SavingsGoalsCardProps> = ({ goals, onViewAll }) => {
  const getGoalIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('laptop') || lower.includes('macbook')) {
      return <Laptop className="w-4 h-4 text-[#3B82F6]" />;
    }
    if (lower.includes('emergency')) {
      return <ShieldCheck className="w-4 h-4 text-[#2E8B57]" />;
    }
    return <Sparkles className="w-4 h-4 text-[#D4952B]" />;
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#181D26]">Savings Goals</h3>
          <p className="text-xs text-[#7F899F] mt-0.5">Progress toward targets</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#D4952B] hover:text-[#B87D1E] font-bold flex items-center gap-1 group transition-colors"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7F899F] space-y-2">
          <p>No savings goals created yet.</p>
          <button
            onClick={onViewAll}
            className="text-[11px] font-bold text-[#D4952B] hover:underline"
          >
            + Create your first savings goal
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {goals.slice(0, 3).map((goal) => {
            const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            return (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center">
                      {getGoalIcon(goal.name)}
                    </div>
                    <span className="font-bold text-[#181D26] truncate">{goal.name}</span>
                  </div>
                  <div className="font-mono-num text-[11px] font-bold text-[#3D4658]">
                    {formatINR(goal.current_amount)} <span className="text-[#7F899F] font-normal">/ {formatINR(goal.target_amount)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-2 bg-[#F5F2EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4952B] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
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
      )}
    </div>
  );
};
