import React, { useState } from 'react';
import { Plus, Bell, Search, Sparkles, Leaf, Shield } from 'lucide-react';
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
    <header className="sticky top-0 z-20 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EDE8E0] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Mobile Brand / Desktop Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {/* Mobile PAISA Logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4952B] to-[#B87D1E] flex items-center justify-center text-white shadow-sm">
              <Leaf className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-wider text-[#181D26]">PAISA</span>
          </div>

          {/* Desktop Search Bar (Reference 2) */}
          <div
            onClick={onOpenSearch}
            className="hidden lg:flex items-center relative w-full cursor-pointer group"
          >
            <Search className="w-4 h-4 text-[#7F899F] group-hover:text-[#D4952B] absolute left-3.5 transition-colors" />
            <input
              type="text"
              readOnly
              onClick={onOpenSearch}
              placeholder="Search anything... (transactions, budgets, merchants)"
              className="w-full pl-9 pr-12 py-2 rounded-full bg-white border border-[#EDE8E0] text-xs text-[#181D26] placeholder-[#A4ADC0] group-hover:border-[#D4952B] shadow-sm cursor-pointer transition-colors"
            />
            <span className="absolute right-3 text-[10px] font-mono-num font-semibold text-[#7F899F] bg-[#F5F2EB] px-1.5 py-0.5 rounded border border-[#EDE8E0]">
              ⌘K /
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EDE8E0] text-xs font-medium text-[#3D4658] hover:border-[#DFD7C7] shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4952B]" />
              <span>{activeTone?.emoji} {activeTone?.label}</span>
            </button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-[#EDE8E0] shadow-floating py-1.5 z-50">
                  <div className="px-3 py-1.5 section-title border-b border-[#EDE8E0] mb-1">
                    Reality Check Tone
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
                          ? 'text-[#D4952B] font-bold bg-[#FFF6E6]'
                          : 'text-[#3D4658] hover:bg-[#FAF8F5]'
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
            className="btn-icon relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#3D4658]" />
            {unreadCount > 0 && (
              <span className="absolute 1 top-1.5 right-1.5 w-2 h-2 bg-[#E06D53] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Prominent Add Expense Button */}
          <button
            onClick={onOpenAddExpense}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-[#DCE7FA] border border-[#BACDF2] hover:ring-2 hover:ring-[#BACDF2] flex items-center justify-center text-xs font-bold text-[#2A4B82] shadow-sm select-none transition-all cursor-pointer"
              title="User Account & Settings"
            >
              {displayName ? displayName.charAt(0).toUpperCase() : 'A'}
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#EDE8E0] shadow-card p-1.5 z-50 animate-in text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-[#EDE8E0]">
                    <div className="font-bold text-[#181D26] truncate">{displayName || 'My Account'}</div>
                    <div className="text-[10px] text-[#7F899F] truncate">{userEmail || 'Local Secure Vault'}</div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onResetCleanSlate?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#D4952B] hover:bg-[#FAF8F5] font-semibold flex items-center gap-2"
                  >
                    <span>✨</span>
                    <span>Reset to Clean Slate (₹0)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[#E06D53] hover:bg-red-50 font-semibold flex items-center gap-2"
                  >
                    <span>🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
