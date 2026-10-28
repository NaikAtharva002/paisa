import React from 'react';
import { BudgetStatus } from '../../types';
import { formatINR } from '../../lib/calculations';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface BudgetProgressProps {
  percentUsed: number;
  status: BudgetStatus;
  statusLabel: string;
  dailyBudget: number;
  actualSpending: number;
  remainingAllowance: number;
  variant?: 'circle' | 'bar';
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  percentUsed,
  status,
  statusLabel,
  dailyBudget,
  actualSpending,
  remainingAllowance,
  variant = 'circle',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'comfortable':
        return {
          stroke: '#10B981', // emerald-500
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          track: 'stroke-emerald-950/40',
          text: 'text-emerald-400',
        };
      case 'getting_close':
        return {
          stroke: '#F59E0B', // amber-500
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          track: 'stroke-amber-950/40',
          text: 'text-amber-400',
        };
      case 'budget_reached':
        return {
          stroke: '#6366F1', // indigo-500
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          track: 'stroke-indigo-950/40',
          text: 'text-indigo-400',
        };
      case 'overspent':
        return {
          stroke: '#EF4444', // red-500
          bg: 'bg-red-500/10 text-red-400 border-red-500/20',
          track: 'stroke-red-950/40',
          text: 'text-red-400',
        };
    }
  };

  const colors = getStatusColor();

  if (variant === 'bar') {
    const clampedWidth = Math.min(100, Math.max(0, percentUsed));
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-400">Budget Pacing</span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${colors.bg}`}>
            {statusLabel} ({percentUsed}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${clampedWidth}%`,
              backgroundColor: colors.stroke,
            }}
          />
        </div>
      </div>
    );
  }

  // Circular dial
  const radius = 62;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Clamp visually at 100% for circle ring length
  const progressRatio = Math.min(100, Math.max(0, percentUsed)) / 100;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900/90 to-slate-950/90 rounded-2xl border border-slate-800/80 shadow-xl relative overflow-hidden">
      {/* Subtle glow behind dial */}
      <div 
        className="absolute w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: colors.stroke }}
      />

      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
          {/* Background circle track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active progress track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Used
          </span>
          <span className="text-3xl font-extrabold text-white font-mono-num">
            {percentUsed}%
          </span>
          <div className={`mt-1 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg}`}>
            {status === 'overspent' ? (
              <AlertCircle className="w-3 h-3 text-red-400" />
            ) : status === 'getting_close' ? (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Summary beneath dial */}
      <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center pt-3 border-t border-slate-800/60">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Spent Today</div>
          <div className="text-base font-bold text-slate-100 font-mono-num">
            {formatINR(actualSpending)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">
            {remainingAllowance >= 0 ? 'Remaining' : 'Over Limit'}
          </div>
          <div className={`text-base font-bold font-mono-num ${remainingAllowance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatINR(Math.abs(remainingAllowance))}
          </div>
        </div>
      </div>
    </div>
  );
};
