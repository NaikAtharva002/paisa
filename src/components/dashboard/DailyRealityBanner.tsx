import React from 'react';
import { DailySpendingReport, RealityTone } from '../../types';
import { Sparkles, ArrowRight, Lightbulb, Compass, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface DailyRealityBannerProps {
  report: DailySpendingReport;
  tone: RealityTone;
  displayName: string;
}

export const DailyRealityBanner: React.FC<DailyRealityBannerProps> = ({ report, tone, displayName }) => {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = () => {
    switch (report.status) {
      case 'overspent':
        return {
          pill: 'bg-[#FDF1EE] text-[#E06D53] border-[#FBDCD5]',
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#E06D53]" />,
        };
      case 'getting_close':
        return {
          pill: 'bg-[#FEF8EA] text-[#D4952B] border-[#FCEECB]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D4952B]" />,
        };
      case 'comfortable':
      default:
        return {
          pill: 'bg-[#EBF7EE] text-[#2E8B57] border-[#D4EED9]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" />,
        };
    }
  };

  const statusStyle = getStatusColor();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-[#EDE8E0] p-6 sm:p-8 shadow-card flex flex-col justify-between">
      {/* Background Organic Dunes / Hills Illustration (Reference 2) */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 max-w-md pointer-events-none opacity-40 sm:opacity-90 overflow-hidden flex items-center justify-end">
        <svg
          viewBox="0 0 420 180"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          <path
            d="M 50 180 Q 150 60, 260 120 T 420 70 L 420 180 Z"
            fill="#EAF3EC"
          />
          <path
            d="M 120 180 Q 230 40, 320 100 T 420 40 L 420 180 Z"
            fill="#FBEFE3"
          />
          <path
            d="M 220 180 Q 290 80, 370 120 T 420 90 L 420 180 Z"
            fill="#F2ECE1"
          />
          {/* Subtle floral/leaf silhouette */}
          <path
            d="M 390 140 Q 375 110, 385 85 Q 400 115, 390 140 Z"
            fill="#2E8B57"
            opacity="0.3"
          />
          <path
            d="M 370 150 Q 355 125, 368 105 Q 380 130, 370 150 Z"
            fill="#D4952B"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Top Banner Content */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#7F899F] flex items-center gap-1.5">
            <span>{getGreeting()},</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-3xl sm:text-4xl font-black text-[#181D26] tracking-tight">
              {displayName || 'Atharva'}
            </h1>
            <span className="text-[#D4952B] text-xl">✨</span>
          </div>
          <p className="text-sm text-[#5E687D] font-medium mt-1.5 max-w-lg leading-relaxed">
            {report.message || 'Your money story is looking better this month.'}
          </p>
        </div>

        {/* Motivational Quote Badge (Reference 2) */}
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#3D4658] shadow-sm flex-shrink-0 self-start">
          <div className="text-left">
            <div className="font-bold text-[#181D26]">Discipline today</div>
            <div className="text-[11px] text-[#7F899F]">creates freedom tomorrow.</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#D4952B] ml-1" />
        </div>
      </div>

      {/* Actionable Suggestion Callout */}
      <div className="relative z-10 mt-6 pt-4 border-t border-[#EDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FEF8EA] text-[#D4952B] flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="text-xs text-[#3D4658]">
            <strong className="text-[#181D26]">Tomorrow's Suggestion: </strong>
            {report.actionSuggestion}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${statusStyle.pill}`}>
            {statusStyle.icon}
            {report.statusLabel}
          </span>
          <span className="text-[11px] text-[#7F899F] capitalize">
            ({tone} tone)
          </span>
        </div>
      </div>
    </div>
  );
};
