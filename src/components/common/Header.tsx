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

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night owl 🦉';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Winding down 🌙';
  };

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const toneOptions: Array<{ id: RealityTone; label: string; emoji: string }> = [
    { id: 'friendly', label: 'Friendly', emoji: '😊' },
    { id: 'sarcastic', label: 'Sarcastic & Witty', emoji: '😏' },
    { id: 'straightforward', label: 'Straightforward', emoji: '📊' },
    { id: 'encouraging', label: 'Encouraging', emoji: '🚀' },
  ];

  const activeTone = toneOptions.find(t => t.id === currentTone);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#06091A]/90 backdrop-blur-xl px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20">
              ₹
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#06091A] animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight text-white">PAISA</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-2.5 h-2.5" /> India AA Ready
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {getGreeting()},&nbsp;<span className="text-slate-200 font-semibold">{displayName || 'Friend'}</span>
              <span className="mx-1.5 text-slate-700">·</span>
              <span className="text-slate-400">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Tone Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowToneMenu(!showToneMenu)}
              className="btn-ghost text-xs font-semibold border border-white/[0.08]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="capitalize">{activeTone?.emoji} {activeTone?.label}</span>
            </button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 card-glass py-1.5 z-50 shadow-2xl">
                  <div className="px-3 py-1.5 section-title border-b border-white/[0.06] mb-1">Reality Check Tone</div>
                  {toneOptions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onChangeTone(t.id);
                        setShowToneMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                        currentTone === t.id
                          ? 'text-emerald-400 font-semibold bg-emerald-500/10'
                          : 'text-slate-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-base">{t.emoji}</span>
                      <span>{t.label}</span>
                      {currentTone === t.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reset Demo */}
          <button
            onClick={() => {
              if (confirm('Reset to demo dataset?')) store.resetToDemoData();
            }}
            className="hidden lg:flex btn-ghost text-[11px] border border-white/[0.06]"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Demo
          </button>

          {/* Notifications */}
          <button onClick={onOpenNotifications} className="btn-icon relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-[#06091A]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Add Expense CTA */}
          <button onClick={onOpenAddExpense} className="btn-primary">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Add Expense</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
