import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Landmark,
  Settings as SettingsIcon,
  CalendarDays
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

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'transactions', label: 'Spends', icon: Receipt },
    { id: 'budgets', label: 'Goals', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'recurring', label: 'Bills', icon: CalendarDays },
    { id: 'bank', label: 'Bank Sync', icon: Landmark },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 md:hidden">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/10' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sub-Nav Tabs */}
      <div className="hidden md:flex items-center gap-1.5 py-3 border-b border-slate-800/80 max-w-7xl mx-auto px-8 overflow-x-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
