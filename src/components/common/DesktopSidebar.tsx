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
  Leaf,
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
    <aside className="hidden lg:flex w-64 bg-[#141820] text-slate-300 flex-col justify-between p-6 h-screen sticky top-0 border-r border-[#222936] select-none z-30 overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4952B] to-[#B87D1E] flex items-center justify-center text-white shadow-gold-glow">
            <Leaf className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-wider text-white">PAISA</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-tight">Your Money Reality Check</span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1.5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#222936] text-[#F5C065] shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#1B212C]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#F5C065]' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4952B]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Settings Link */}
      <div className="pt-4 border-t border-[#222936]">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'settings'
              ? 'bg-[#222936] text-[#F5C065] font-bold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-[#1B212C]'
          }`}
        >
          <SettingsIcon
            className={`w-4 h-4 ${
              currentTab === 'settings' ? 'text-[#F5C065]' : 'text-slate-400'
            }`}
          />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
