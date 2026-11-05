import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Trophy,
  CalendarDays,
  Sparkles,
  Landmark,
  Settings as SettingsIcon,
} from 'lucide-react';
import { NavTab } from './BottomNav';

interface DesktopSidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'goals', label: 'Goals', icon: Trophy },
  { id: 'recurring', label: 'Bills & Subscriptions', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'bank', label: 'Accounts', icon: Landmark },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className="hidden lg:flex w-64 bg-[#0F141C] text-slate-300 flex-col justify-between p-6 h-screen sticky top-0 border-r border-slate-800/80 select-none z-30 overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-white text-[#0F141C] flex items-center justify-center font-bold text-sm shadow-sm">
            <span>₹</span>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">PAISA</span>
            <span className="block text-[11px] text-slate-400 font-medium">Daily reality check</span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                } focus-visible:ring-2 focus-visible:ring-white`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#059669]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Settings Link */}
      <div className="pt-4 border-t border-slate-800/80">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'settings'
              ? 'bg-slate-800 text-white font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          } focus-visible:ring-2 focus-visible:ring-white`}
        >
          <SettingsIcon
            className={`w-4 h-4 ${
              currentTab === 'settings' ? 'text-white' : 'text-slate-400'
            }`}
          />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
