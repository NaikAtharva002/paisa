import React from 'react';
import { LucideIcon, Eye, EyeOff } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: 'sage' | 'coral' | 'amber' | 'blue' | 'neutral';
  trendType?: 'sparkline' | 'bars' | 'none';
  trendColor?: string;
  isPrivateToggle?: boolean;
  isObfuscated?: boolean;
  onTogglePrivacy?: () => void;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = 'sage',
  trendType = 'none',
  trendColor = '#059669',
  isPrivateToggle,
  isObfuscated,
  onTogglePrivacy,
  onClick,
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'coral':
        return 'text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3]';
      case 'amber':
        return 'text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A]';
      case 'blue':
        return 'text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE]';
      case 'neutral':
        return 'text-slate-600 bg-slate-100 border border-slate-200';
      case 'sage':
      default:
        return 'text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0]';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
      }`}
    >
      <div>
        {/* Top Label & Actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 tracking-tight">{title}</span>
            {isPrivateToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePrivacy?.();
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                title={isObfuscated ? 'Reveal balance' : 'Hide balance'}
              >
                {isObfuscated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {Icon && (
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Primary Metric Value */}
        <div className="text-2xl sm:text-[1.75rem] font-bold text-[#0F141C] font-mono tracking-tight leading-none mt-1">
          {isObfuscated ? '••••••••' : value}
        </div>
      </div>

      {/* Bottom Subtitle / Badge / Trend Indicator */}
      <div className="mt-4 flex items-center justify-between gap-2">
        {badge ? (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getBadgeStyle()}`}>
            {badge}
          </span>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-500 font-medium">{subtitle}</span>
        ) : <div />}

        {/* Sparkline Graphic */}
        {trendType === 'sparkline' && (
          <svg className="w-16 h-7 overflow-visible" viewBox="0 0 60 24">
            <path
              d="M 2 18 Q 15 20, 25 12 T 45 10 T 58 4"
              fill="none"
              stroke={trendColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Mini Bar Trend */}
        {trendType === 'bars' && (
          <div className="flex items-end gap-1 h-5">
            <div className="w-1.5 h-2 rounded-t-sm bg-slate-100" />
            <div className="w-1.5 h-3 rounded-t-sm bg-slate-200" />
            <div className="w-1.5 h-4 rounded-t-sm bg-slate-300" />
            <div className="w-1.5 h-5 rounded-t-sm" style={{ backgroundColor: trendColor }} />
          </div>
        )}
      </div>
    </div>
  );
};
