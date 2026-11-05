import React, { useState } from 'react';
import { Plus, Bell, Search, Sparkles } from 'lucide-react';
import { RealityTone } from '../../types';
import { getNotifications } from '../../lib/notifications';
import { SyncStatusBadge } from './SyncStatusBadge';

interface HeaderProps {
  onOpenAddExpense: () => void;
  onOpenNotifications: () => void;
  onOpenSearch?: () => void;
  currentTone: RealityTone;
  onChangeTone: (tone: RealityTone) => void;
  displayName: string;
  userEmail?: string;
  onSignOut?: () => void;
  onResetCleanSlate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddExpense,
  onOpenNotifications,
  onOpenSearch,
  currentTone,
  onChangeTone,
  displayName,
  userEmail,
  onSignOut,
  onResetCleanSlate,
}) => {
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const unreadCount = getNotifications().filter(n => !n.read).length;

  const toneOptions: Array<{ id: RealityTone; label: string; emoji: string }> = [
    { id: 'friendly', label: 'Friendly', emoji: '😊' },
    { id: 'sarcastic', label: 'Sarcastic & Witty', emoji: '😏' },
    { id: 'straightforward', label: 'Straightforward', emoji: '📊' },
    { id: 'encouraging', label: 'Encouraging', emoji: '🚀' },
  ];

  const activeTone = toneOptions.find(t => t.id === currentTone);

  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Mobile Brand / Desktop Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {/* Mobile PAISA Logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F141C] flex items-center justify-center text-white">
              <span className="font-bold text-xs">₹</span>
            </div>
            <span className="font-bold text-base tracking-tight text-[#0F141C]">PAISA</span>
          </div>

          {/* Desktop Search Bar */}
          <div
            onClick={onOpenSearch}
            className="hidden lg:flex items-center relative w-full cursor-pointer group"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-[#0F141C] absolute left-3.5 transition-colors" />
            <input
              type="text"
              readOnly
              onClick={onOpenSearch}
              placeholder="Search transactions, budgets, categories..."
              className="w-full pl-9 pr-12 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-[#0F141C] placeholder-slate-400 group-hover:border-slate-300 shadow-xs cursor-pointer transition-colors focus:outline-none"
            />
            <span className="absolute right-3 text-[10px] font-mono font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right Tools (Tone, Notifications, Add Expense, Profile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Two-Way Cloud Sync Status Badge */}
          <SyncStatusBadge />

          {/* Tone Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowToneMenu(!showToneMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300 shadow-xs transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4952B]" />
              <span>{activeTone?.emoji} {activeTone?.label}</span>
            </button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-lg py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Reality check tone
                  </div>
                  {toneOptions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onChangeTone(t.id);
                        setShowToneMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                        currentTone === t.id
                          ? 'text-[#0F141C] font-bold bg-slate-100'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full text-slate-600 hover:text-[#0F141C] hover:bg-slate-100 active:scale-[0.98] transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
            )}
          </button>

          {/* Add Expense Primary CTA Button */}
          <button
            onClick={onOpenAddExpense}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add expense</span>
          </button>

          {/* User Profile Avatar with Clean Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-[#0F141C] text-white flex items-center justify-center text-xs font-bold shadow-xs active:scale-[0.98] transition-all"
              title="User profile"
            >
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-[#0F141C] truncate">{displayName || 'User'}</div>
                    {userEmail && <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>}
                  </div>
                  {onResetCleanSlate && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onResetCleanSlate();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#E11D48] hover:bg-red-50 transition-colors"
                    >
                      Reset to clean state
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
