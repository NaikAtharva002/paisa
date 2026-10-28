import React from 'react';
import { DailySpendingReport, RealityTone } from '../../types';
import { formatINR } from '../../lib/calculations';
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Lightbulb, Compass } from 'lucide-react';

interface DailyRealityBannerProps {
  report: DailySpendingReport;
  tone: RealityTone;
}

export const DailyRealityBanner: React.FC<DailyRealityBannerProps> = ({ report, tone }) => {
  const getBannerStyle = () => {
    switch (report.status) {
      case 'overspent':
        return {
          bg: 'from-red-950/40 via-slate-900 to-slate-950',
          border: 'border-red-500/30',
          badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
          iconColor: 'text-red-400',
        };
      case 'getting_close':
        return {
          bg: 'from-amber-950/40 via-slate-900 to-slate-950',
          border: 'border-amber-500/30',
          badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          iconColor: 'text-amber-400',
        };
      case 'budget_reached':
        return {
          bg: 'from-indigo-950/40 via-slate-900 to-slate-950',
          border: 'border-indigo-500/30',
          badgeBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          iconColor: 'text-indigo-400',
        };
      case 'comfortable':
      default:
        return {
          bg: 'from-emerald-950/30 via-slate-900 to-slate-950',
          border: 'border-emerald-500/30',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          iconColor: 'text-emerald-400',
        };
    }
  };

  const style = getBannerStyle();

  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br ${style.bg} border ${style.border} shadow-2xl backdrop-blur-md relative overflow-hidden`}>
      
      {/* Decorative top pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Today's Money Reality Check
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${style.badgeBg}`}>
            {report.statusLabel}
          </span>
          <span className="text-[11px] text-slate-400 capitalize hidden sm:inline">
            ({tone} Tone)
          </span>
        </div>
      </div>

      {/* Main Quote / Message */}
      <div className="space-y-2">
        <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
          {report.message}
        </p>

        {/* Suggestion pill */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
              Tomorrow's Actionable Suggestion
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {report.actionSuggestion}
            </div>
          </div>
        </div>
      </div>

      {/* Core Philosophy Tagline */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 italic">
        <span>"Sometimes you don't need a higher salary. You need to understand where your current salary is going."</span>
        <Compass className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
      </div>

    </div>
  );
};
