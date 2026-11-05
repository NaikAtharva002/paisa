import React from 'react';
import { DailySpendingReport, RealityTone } from '../../types';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Compass } from 'lucide-react';

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

  const getStatusBadge = () => {
    switch (report.status) {
      case 'overspent':
        return {
          pill: 'bg-[#FDF2F2] text-[#E11D48] border-[#FECDD3]',
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#E11D48]" />,
          label: 'Over daily limit',
        };
      case 'getting_close':
        return {
          pill: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />,
          label: 'Pacing close to limit',
        };
      case 'comfortable':
      default:
        return {
          pill: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />,
          label: 'Within budget',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
      {/* Top Banner Content */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {getGreeting()}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F141C] tracking-tight">
              {displayName || 'Friend'}
            </h1>
            <span className="text-[#D4952B] text-lg">✨</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl leading-relaxed">
            {report.message || 'Your daily money telemetry is active and calibrated.'}
          </p>
        </div>

        {/* Status Pill & Tone Indicator */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.pill}`}>
            {status.icon}
            <span>{status.label}</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="capitalize">{tone} tone</span>
          </div>
        </div>
      </div>

      {/* Tomorrow's Actionable Guidance Callout */}
      {report.actionSuggestion && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3 text-xs">
          <Compass className="w-4 h-4 text-[#D4952B] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[#0F141C]">Tomorrow's suggestion: </span>
            <span className="text-slate-600">{report.actionSuggestion}</span>
          </div>
        </div>
      )}
    </div>
  );
};
