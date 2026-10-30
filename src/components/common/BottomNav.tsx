import React from 'react';
import {
  LayoutDashboard, Receipt, PieChart, Target, Landmark, Settings as SettingsIcon, CalendarDays,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'recurring' | 'bank' | 'settings';
interface BottomNavProps { currentTab: NavTab; onSelectTab: (tab: NavTab) => void; }

const NAV_ITEMS: Array<{ id: NavTab; label: string; detail: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Overview', detail: 'Your money, today', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', detail: 'Every in and out', icon: Receipt },
  { id: 'budgets', label: 'Budgets & goals', detail: 'Plan what matters', icon: Target },
  { id: 'analytics', label: 'Insights', detail: 'Patterns over time', icon: PieChart },
  { id: 'recurring', label: 'Bills & repeats', detail: 'What comes next', icon: CalendarDays },
  { id: 'bank', label: 'Connected banks', detail: 'Accounts & consent', icon: Landmark },
  { id: 'settings', label: 'Preferences', detail: 'Your PAISA setup', icon: SettingsIcon },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => (
  <>
    <aside className="app-sidebar" aria-label="Main navigation">
      <div className="app-sidebar-brand">
        <div className="app-sidebar-mark">₹</div>
        <div><div className="app-sidebar-wordmark">PAISA</div><div className="app-sidebar-caption">Your money, in focus</div></div>
      </div>
      <div className="app-sidebar-label">Workspace</div>
      <nav className="app-sidebar-links">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button key={item.id} type="button" onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`app-sidebar-link ${active ? 'active' : ''}`}>
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="app-sidebar-foot">A clearer view of your everyday money.<br />Private by design · Built for India</div>
    </aside>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5ebe4] bg-white/95 backdrop-blur-xl px-1 pt-1 pb-2 md:hidden" aria-label="Mobile navigation">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button key={item.id} type="button" onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors ${active ? 'text-[#245d45]' : 'text-[#89958d]'}`}>
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[9px] font-semibold tracking-tight">{item.label === 'Overview' ? 'Today' : item.label === 'Transactions' ? 'Spends' : item.label === 'Budgets & goals' ? 'Goals' : item.label === 'Insights' ? 'Insights' : 'Bills'}</span>
              {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-[#28704c]" />}
            </button>
          );
        })}
      </div>
    </nav>
  </>
);
