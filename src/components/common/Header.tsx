import React, { useState } from 'react';
import { Plus, Bell, Sparkles, Shield, RotateCcw } from 'lucide-react';
import { RealityTone } from '../../types';
import { store } from '../../lib/storage';
import { getNotifications } from '../../lib/notifications';

interface HeaderProps {
  onOpenAddExpense: () => void;
  onOpenNotifications: () => void;
  currentTone: RealityTone;
  onChangeTone: (tone: RealityTone) => void;
  displayName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddExpense,
  onOpenNotifications,
  currentTone,
  onChangeTone,
  displayName,
}) => {
  const [showToneMenu, setShowToneMenu] = useState(false);
  const unreadCount = getNotifications().filter(n => !n.read).length;

  // Local time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const toneOptions: Array<{ id: RealityTone; label: string; icon: string }> = [
    { id: 'friendly', label: 'Friendly', icon: '😊' },
    { id: 'sarcastic', label: 'Sarcastic & Witty', icon: '😏' },
    { id: 'straightforward', label: 'Straightforward', icon: '📊' },
    { id: 'encouraging', label: 'Encouraging', icon: '🚀' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand & Local Greeting */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-extrabold text-xl">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">PAISA</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-2.5 h-2.5" /> India AA Ready
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>{getGreeting()}, <strong className="text-slate-200">{displayName || 'Friend'}</strong></span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Reality Tone Selector */}
          <div className="relative">
            <button
              onClick={() => setShowToneMenu(!showToneMenu)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              title="Change Reality Check Tone"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="capitalize">{currentTone} Tone</span>
            </button>

            {showToneMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setShowToneMenu(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                  Reality Check Tone
                </div>
                {toneOptions.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onChangeTone(t.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-800 transition-colors ${
                      currentTone === t.id ? 'text-emerald-400 font-semibold bg-emerald-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo Data Pill */}
          <button
            onClick={() => {
              if (confirm('Reset to realistic demo dataset?')) {
                store.resetToDemoData();
              }
            }}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reload Demo Transactions"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>

          {/* In-app Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Prominent Add Expense Button */}
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Add Expense</span>
            <span className="xs:hidden">Add</span>
          </button>

        </div>
      </div>
    </header>
  );
};
