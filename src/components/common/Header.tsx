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

export const Header: React.FC<HeaderProps> = ({ onOpenAddExpense, onOpenNotifications, currentTone, onChangeTone, displayName }) => {
  const [showToneMenu, setShowToneMenu] = useState(false);
  const unreadCount = getNotifications().filter(n => !n.read).length;
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'A quiet moment for your money' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Winding down';
  const formattedDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const toneOptions: Array<{ id: RealityTone; label: string; emoji: string }> = [
    { id: 'friendly', label: 'Friendly', emoji: '😊' }, { id: 'sarcastic', label: 'Sarcastic & Witty', emoji: '😏' },
    { id: 'straightforward', label: 'Straightforward', emoji: '📊' }, { id: 'encouraging', label: 'Encouraging', emoji: '🚀' },
  ];
  const activeTone = toneOptions.find(t => t.id === currentTone);

  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <div className="min-w-0">
          <div className="brand-mobile items-center gap-2 mb-1">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#174b3b] text-sm font-black text-white">₹</span>
            <span className="text-[12px] font-extrabold tracking-[.18em] text-[#174b3b]">PAISA</span>
            <span className="text-[9px] text-[#849087]">· Private finance</span>
          </div>
          <div className="text-[11px] font-semibold text-[#738078]">{greeting}, <span className="text-[#294538]">{displayName || 'there'}</span></div>
          <div className="hidden sm:block text-[10px] text-[#9aa49d] mt-0.5">{formattedDate}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <button type="button" onClick={() => setShowToneMenu(!showToneMenu)} className="btn-ghost text-[11px] font-semibold border border-[#e5ebe4]">
              <Sparkles className="w-3.5 h-3.5 text-[#a17b39]" /><span>{activeTone?.emoji} {activeTone?.label}</span>
            </button>
            {showToneMenu && <>
              <button aria-label="Close tone menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowToneMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[#e5ebe4] bg-white py-2 z-50 shadow-xl">
                <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#89958d]">Reality check tone</div>
                {toneOptions.map(t => <button type="button" key={t.id} onClick={() => { onChangeTone(t.id); setShowToneMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left ${currentTone === t.id ? 'text-[#245d45] bg-[#edf4ee] font-semibold' : 'text-[#53645a] hover:bg-[#f6f8f5]'}`}>
                  <span>{t.emoji}</span><span>{t.label}</span>{currentTone === t.id && <span className="ml-auto">✓</span>}
                </button>)}
              </div>
            </>}
          </div>
          <button type="button" onClick={() => { if (confirm('Reset to demo dataset?')) store.resetToDemoData(); }}
            className="hidden lg:flex btn-ghost text-[10px] border border-[#e5ebe4]"><RotateCcw className="w-3 h-3" />Reset demo</button>
          <button type="button" onClick={onOpenNotifications} aria-label="Notifications" className="btn-icon relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#28704c] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#f5f6f1]">{unreadCount}</span>}
          </button>
          <button type="button" onClick={onOpenAddExpense} className="btn-primary text-[11px] sm:text-xs">
            <Plus className="w-4 h-4 stroke-[2.5]" /><span>Add transaction</span>
          </button>
        </div>
      </div>
    </header>
  );
};
