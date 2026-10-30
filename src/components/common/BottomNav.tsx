import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Trophy,
  Menu,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'recurring'
  | 'analytics'
  | 'insights'
  | 'bank'
  | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobileMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileMenu,
}) => {
  const mobileNavItems: Array<{
    id: NavTab | 'more';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }> = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      onClick: () => onSelectTab('dashboard'),
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      onClick: () => onSelectTab('transactions'),
    },
    {
      id: 'budgets',
      label: 'Budget',
      icon: Target,
      onClick: () => onSelectTab('budgets'),
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: Trophy,
      onClick: () => onSelectTab('goals'),
    },
    {
      id: 'more',
      label: 'More',
      icon: Menu,
      onClick: () => (onOpenMobileMenu ? onOpenMobileMenu() : onSelectTab('settings')),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#EDE8E0] px-2 py-2 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive ? 'text-[#D4952B] font-bold' : 'text-[#7F899F] hover:text-[#181D26]'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-[#FFF6E6]' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
