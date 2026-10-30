import React from 'react';
import { DailySpendingReport, RealityTone } from '../../types';
import { Sparkles, Lightbulb, Compass, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DailyRealityBannerProps {
  report: DailySpendingReport;
  tone: RealityTone;
}

export const DailyRealityBanner: React.FC<DailyRealityBannerProps> = ({ report, tone }) => {
  const getBannerStyle = () => {
    switch (report.status) {
      case 'overspent':
        return {
          glow: 'rgba(239, 68, 68, 0.15)',
          badge: 'tag-red',
          border: 'border-red-500/25',
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
        };
      case 'getting_close':
        return {
          glow: 'rgba(245, 158, 11, 0.15)',
          badge: 'tag-amber',
          border: 'border-amber-500/25',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'budget_reached':
        return {
          glow: 'rgba(99, 102, 241, 0.15)',
          badge: 'tag-blue',
          border: 'border-indigo-500/25',
          icon: <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'comfortable':
      default:
        return {
          glow: 'rgba(16, 185, 129, 0.15)',
          badge: 'tag-green',
          border: 'border-emerald-500/25',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
    }
  };

  const style = getBannerStyle();

  return (
    <div className={`p-6 rounded-2xl bg-[#0D1426] border ${style.border} shadow-card relative overflow-hidden backdrop-blur-md flex flex-col justify-between h-full`}>
      {/* Subtle ambient status glow */}
      <div
        className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{ background: style.glow }}
      />

      <div>
        {/* Header pill & Tone info */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="section-title text-slate-300">
              Daily Money Reality Check
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`tag ${style.badge}`}>
              {style.icon} {report.statusLabel}
            </span>
            <span className="text-[11px] text-slate-500 capitalize hidden sm:inline">
              ({tone} Tone)
            </span>
          </div>
        </div>

        {/* Dynamic commentary message */}
        <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
          {report.message}
        </p>

        {/* Actionable tomorrow recommendation */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#06091A] border border-white/[0.08] flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Tomorrow's Actionable Suggestion
            </div>
            <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {report.actionSuggestion}
            </div>
          </div>
        </div>
      </div>

      {/* Core Philosophy Footnote */}
      <div className="mt-5 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-500 italic">
        <span>"Sometimes you don't need a higher salary. You need to understand where your current salary is going."</span>
        <Compass className="w-3.5 h-3.5 text-slate-600 hidden sm:inline flex-shrink-0 ml-2" />
      </div>
    </div>
  );
};
