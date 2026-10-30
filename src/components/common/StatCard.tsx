import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  badge?: string;
  onClick?: () => void;
}

const THEME_MAP = {
  success: {
    icon: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    value: 'text-emerald-400',
    border: 'border-emerald-500/25 hover:border-emerald-500/40',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  warning: {
    icon: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    value: 'text-amber-400',
    border: 'border-amber-500/25 hover:border-amber-500/40',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  danger: {
    icon: 'bg-red-500/15 text-red-400 border-red-500/25',
    value: 'text-red-400',
    border: 'border-red-500/25 hover:border-red-500/40',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  primary: {
    icon: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    value: 'text-blue-400',
    border: 'border-blue-500/25 hover:border-blue-500/40',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  default: {
    icon: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    value: 'text-slate-100',
    border: 'border-white/[0.08] hover:border-white/[0.14]',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
  onClick,
}) => {
  const t = THEME_MAP[variant];
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-[#0D1426] border ${t.border} shadow-card backdrop-blur-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-[#111827] active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="section-title text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border flex items-center justify-center flex-shrink-0 ${t.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className={`text-2xl sm:text-3xl font-black font-mono-num ${t.value} leading-none mt-1`}>
        {value}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-400 leading-snug">
          {subtitle}
        </div>
      )}

      {badge && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.badge}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
