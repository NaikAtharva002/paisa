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

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
  onClick,
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          border: 'border-emerald-500/30',
          valueColor: 'text-emerald-400',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          border: 'border-amber-500/30',
          valueColor: 'text-amber-400',
        };
      case 'danger':
        return {
          iconBg: 'bg-red-500/10 text-red-400 border-red-500/20',
          border: 'border-red-500/30',
          valueColor: 'text-red-400',
        };
      case 'primary':
        return {
          iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          border: 'border-blue-500/30',
          valueColor: 'text-blue-400',
        };
      default:
        return {
          iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
          border: 'border-slate-800/80',
          valueColor: 'text-slate-100',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-slate-900/80 border ${theme.border} backdrop-blur-sm shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-900' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          <div className={`mt-1 text-2xl sm:text-3xl font-extrabold font-mono-num ${theme.valueColor}`}>
            {value}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl border ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {badge && (
        <div className="mt-3">
          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
