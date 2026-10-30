import React from 'react';
import { BudgetStatus } from '../../types';
import { formatINR } from '../../lib/calculations';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface BudgetProgressProps {
  percentUsed: number;
  status: BudgetStatus;
  statusLabel: string;
  dailyBudget: number;
  actualSpending: number;
  remainingAllowance: number;
  variant?: 'circle' | 'bar';
}

const STATUS_CONFIG: Record<
  BudgetStatus,
  {
    stroke: string;
    bgClass: string;
    textClass: string;
    icon: React.ReactNode;
  }
> = {
  comfortable: {
    stroke: '#2E8B57', // Sage green (Reference 2)
    bgClass: 'bg-[#EBF7EE] text-[#2E8B57]',
    textClass: 'text-[#2E8B57]',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  getting_close: {
    stroke: '#D4952B', // Amber gold (Reference 2)
    bgClass: 'bg-[#FEF8EA] text-[#D4952B]',
    textClass: 'text-[#D4952B]',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  budget_reached: {
    stroke: '#3B82F6', // Blue
    bgClass: 'bg-[#EEF5FF] text-[#3B82F6]',
    textClass: 'text-[#3B82F6]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  overspent: {
    stroke: '#E06D53', // Terracotta coral (Reference 2)
    bgClass: 'bg-[#FDF1EE] text-[#E06D53]',
    textClass: 'text-[#E06D53]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  percentUsed,
  status,
  statusLabel,
  dailyBudget,
  actualSpending,
  remainingAllowance,
  variant = 'circle',
}) => {
  const cfg = STATUS_CONFIG[status];
  const clamped = Math.min(100, Math.max(0, percentUsed));

  if (variant === 'bar') {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#7F899F] font-semibold">Budget Pacing</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bgClass}`}>
            {statusLabel} · {percentUsed}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#F5F2EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${clamped}%`, backgroundColor: cfg.stroke }}
          />
        </div>
      </div>
    );
  }

  // Circular gauge (Reference 2)
  const R = 64;
  const SW = 10;
  const C = 2 * Math.PI * R;
  const offset = C - (clamped / 100) * C;

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col items-center justify-between h-full">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#7F899F]">Daily Budget Gauge</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bgClass}`}>
          {cfg.icon} {statusLabel}
        </span>
      </div>

      {/* SVG Circular Ring Gauge */}
      <div className="relative my-2 flex items-center justify-center">
        <svg width="170" height="170" viewBox="0 0 160 160" className="-rotate-90">
          {/* Base track */}
          <circle cx="80" cy="80" r={R} fill="none" stroke="#F5F2EB" strokeWidth={SW} />
          {/* Progress arc */}
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={cfg.stroke}
            strokeWidth={SW}
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-black font-mono-num leading-none tracking-tight ${cfg.textClass}`}>
            {percentUsed}%
          </span>
          <span className="text-[11px] font-mono-num text-[#7F899F] mt-1 font-semibold">
            {formatINR(actualSpending)} / {formatINR(dailyBudget)}
          </span>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="pt-4 border-t border-[#EDE8E0] grid grid-cols-2 gap-4 w-full text-center">
        <div>
          <div className="text-[11px] text-[#7F899F] font-semibold">Spent Today</div>
          <div className="text-sm font-bold font-mono-num text-[#181D26]">{formatINR(actualSpending)}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#7F899F] font-semibold">
            {remainingAllowance >= 0 ? 'Remaining Cushion' : 'Over Limit'}
          </div>
          <div className={`text-sm font-bold font-mono-num ${remainingAllowance >= 0 ? 'text-[#2E8B57]' : 'text-[#E06D53]'}`}>
            {formatINR(Math.abs(remainingAllowance))}
          </div>
        </div>
      </div>
    </div>
  );
};
