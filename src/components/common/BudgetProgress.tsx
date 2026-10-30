import React from 'react';
import { BudgetStatus } from '../../types';
import { formatINR } from '../../lib/calculations';
import { AlertTriangle, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

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
    glow: string;
    tagClass: string;
    textClass: string;
    icon: React.ReactNode;
  }
> = {
  comfortable: {
    stroke: '#10B981',
    glow: 'rgba(16,185,129,0.25)',
    tagClass: 'tag-green',
    textClass: 'text-emerald-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  getting_close: {
    stroke: '#F59E0B',
    glow: 'rgba(245,158,11,0.25)',
    tagClass: 'tag-amber',
    textClass: 'text-amber-400',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  budget_reached: {
    stroke: '#6366F1',
    glow: 'rgba(99,102,241,0.25)',
    tagClass: 'tag bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    textClass: 'text-indigo-400',
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  overspent: {
    stroke: '#EF4444',
    glow: 'rgba(239,68,68,0.25)',
    tagClass: 'tag-red',
    textClass: 'text-red-400',
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
      <div className="w-full space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="section-title">Budget Pacing</span>
          <span className={`tag ${cfg.tagClass}`}>{statusLabel} · {percentUsed}%</span>
        </div>
        <div className="w-full h-2.5 bg-[#06091A] rounded-full overflow-hidden border border-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${clamped}%`, backgroundColor: cfg.stroke }}
          />
        </div>
      </div>
    );
  }

  // Circular dial
  const R = 64;
  const SW = 10;
  const C = 2 * Math.PI * R;
  const offset = C - (clamped / 100) * C;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-700"
        style={{ background: cfg.glow, top: '-10%', left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* SVG Dial */}
      <div className="relative z-10 flex items-center justify-center">
        <svg width="180" height="180" viewBox="0 0 160 160" className="-rotate-90">
          {/* Background circle track */}
          <circle cx="80" cy="80" r={R} fill="none" stroke="#111827" strokeWidth={SW} />
          {/* Active progress arc */}
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
            style={{ filter: `drop-shadow(0 0 6px ${cfg.stroke}66)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Used</span>
          <span className={`text-4xl font-black font-mono-num leading-none mt-0.5 ${cfg.textClass}`}>
            {percentUsed}%
          </span>
          <span className={`mt-2 tag ${cfg.tagClass} text-[10px]`}>
            {cfg.icon} {statusLabel}
          </span>
        </div>
      </div>

      {/* Summary stats beneath dial */}
      <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4 w-full text-center">
        <div>
          <div className="section-title text-slate-400 mb-1">Spent Today</div>
          <div className="text-base font-bold font-mono-num text-slate-100">{formatINR(actualSpending)}</div>
        </div>
        <div>
          <div className="section-title text-slate-400 mb-1">{remainingAllowance >= 0 ? 'Remaining' : 'Over Limit'}</div>
          <div className={`text-base font-bold font-mono-num ${remainingAllowance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatINR(Math.abs(remainingAllowance))}
          </div>
        </div>
      </div>

      {/* Daily allowance footnote */}
      <div className="relative z-10 mt-3 text-center">
        <span className="text-[11px] text-slate-500">Daily budget allowance: </span>
        <span className="text-[11px] font-bold font-mono-num text-slate-300">{formatINR(dailyBudget)}</span>
      </div>
    </div>
  );
};
