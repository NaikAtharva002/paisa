import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Landmark,
  Settings as SettingsIcon,
  CalendarDays,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'recurring'
  | 'bank'
  | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'transactions', label: 'Spends', icon: Receipt },
  { id: 'budgets', label: 'Goals', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'recurring', label: 'Bills', icon: CalendarDays },
  { id: 'bank', label: 'Bank Sync', icon: Landmark },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => (
  <>
    {/* Mobile bottom navigation bar */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#06091A]/95 backdrop-blur-xl border-t border-white/[0.08] px-1 pt-1 pb-2 md:hidden">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
                active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400" />
              )}
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-emerald-500/15' : ''}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 tracking-wide ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>

    {/* Desktop sub-nav bar */}
    <div className="hidden md:block border-b border-white/[0.06] bg-[#06091A]/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-8 flex items-center gap-1.5 py-2.5 overflow-x-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </>
);
