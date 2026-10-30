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
  trendColor = '#2E8B57',
  isPrivateToggle,
  isObfuscated,
  onTogglePrivacy,
  onClick,
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'coral':
        return 'text-[#E06D53] bg-[#FDF1EE]';
      case 'amber':
        return 'text-[#D4952B] bg-[#FEF8EA]';
      case 'blue':
        return 'text-[#3B82F6] bg-[#EEF5FF]';
      case 'neutral':
        return 'text-[#7F899F] bg-[#F5F2EB]';
      case 'sage':
      default:
        return 'text-[#2E8B57] bg-[#EBF7EE]';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-[#DFD7C7] hover:shadow-card-hover' : ''
      }`}
    >
      <div>
        {/* Top Label & Actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#7F899F] tracking-tight">{title}</span>
            {isPrivateToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePrivacy?.();
                }}
                className="text-[#A4ADC0] hover:text-[#5E687D] p-0.5 rounded transition-colors"
                title={isObfuscated ? 'Reveal balance' : 'Hide balance'}
              >
                {isObfuscated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {Icon && (
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#5E687D] border border-[#EDE8E0]">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Primary Metric Value */}
        <div className="text-2xl sm:text-[1.75rem] font-black text-[#181D26] font-mono-num tracking-tight leading-none mt-1">
          {isObfuscated ? '••••••••' : value}
        </div>
      </div>

      {/* Bottom Subtitle / Badge / Sparkline Indicator */}
      <div className="mt-4 flex items-center justify-between gap-2">
        {badge ? (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getBadgeStyle()}`}>
            {badge}
          </span>
        ) : subtitle ? (
          <span className="text-[11px] text-[#7F899F]">{subtitle}</span>
        ) : <div />}

        {/* Sparkline Graphic (Reference 2) */}
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

        {/* Mini Bar Trend (Reference 2) */}
        {trendType === 'bars' && (
          <div className="flex items-end gap-1 h-5">
            <div className="w-1.5 h-2 rounded-t-sm bg-[#EFECE6]" />
            <div className="w-1.5 h-3 rounded-t-sm bg-[#EFECE6]" />
            <div className="w-1.5 h-4 rounded-t-sm bg-[#DFD7C7]" />
            <div className="w-1.5 h-5 rounded-t-sm" style={{ backgroundColor: trendColor }} />
          </div>
        )}
      </div>
    </div>
  );
};
