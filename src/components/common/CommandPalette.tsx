import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Receipt,
  Target,
  Trophy,
  CalendarDays,
  PieChart,
  Sparkles,
  Landmark,
  Settings,
  Plus,
  Upload,
  Download,
  ArrowRight,
  Command,
} from 'lucide-react';
import { store } from '../../lib/storage';
import { NavTab } from './BottomNav';
import { formatINR } from '../../lib/calculations';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenAddExpense: () => void;
  onOpenCsvImport: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'Transactions' | 'Goals' | 'Bills';
  icon: React.ElementType;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenAddExpense,
  onOpenCsvImport,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const transactions = store.getTransactions();
  const goals = store.getSavingsGoals();
  const recurring = store.getRecurringPayments();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const baseItems: PaletteItem[] = [
    {
      id: 'nav_dashboard',
      title: 'Go to Overview / Dashboard',
      subtitle: 'Daily allowance reality check & overview',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => onNavigate('dashboard'),
    },
    {
      id: 'nav_transactions',
      title: 'Go to Transactions',
      subtitle: 'View, filter, and edit transaction history',
      category: 'Navigation',
      icon: Receipt,
      action: () => onNavigate('transactions'),
    },
    {
      id: 'nav_budgets',
      title: 'Go to Budgets',
      subtitle: 'Category spending caps & circular gauge',
      category: 'Navigation',
      icon: Target,
      action: () => onNavigate('budgets'),
    },
    {
      id: 'nav_goals',
      title: 'Go to Savings Goals',
      subtitle: 'Track milestone targets & deposits',
      category: 'Navigation',
      icon: Trophy,
      action: () => onNavigate('goals'),
    },
    {
      id: 'nav_bills',
      title: 'Go to Bills & Subscriptions',
      subtitle: 'Upcoming recurring expenses & pay flow',
      category: 'Navigation',
      icon: CalendarDays,
      action: () => onNavigate('recurring'),
    },
    {
      id: 'nav_analytics',
      title: 'Go to Analytics & Reports',
      subtitle: 'Monthly cash flow, category donuts & trends',
      category: 'Navigation',
      icon: PieChart,
      action: () => onNavigate('analytics'),
    },
    {
      id: 'nav_insights',
      title: 'Go to AI Insights',
      subtitle: 'Actionable spending velocity & advice',
      category: 'Navigation',
      icon: Sparkles,
      action: () => onNavigate('insights'),
    },
    {
      id: 'nav_bank',
      title: 'Go to Accounts',
      subtitle: 'Manage linked banks, wallets & net worth',
      category: 'Navigation',
      icon: Landmark,
      action: () => onNavigate('bank'),
    },
    {
      id: 'nav_settings',
      title: 'Go to Settings',
      subtitle: 'Income cycles, theme, notifications & data',
      category: 'Navigation',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
    {
      id: 'act_add_expense',
      title: 'Add New Expense / Income (N)',
      subtitle: 'Record a new spending or earning entry',
      category: 'Actions',
      icon: Plus,
      action: onOpenAddExpense,
    },
    {
      id: 'act_import_csv',
      title: 'Import Bank Statement (CSV / JSON)',
      subtitle: 'Ingest bank statements with duplicate detection',
      category: 'Actions',
      icon: Upload,
      action: onOpenCsvImport,
    },
    {
      id: 'act_export_backup',
      title: 'Export Full Data Backup',
      subtitle: 'Download complete offline JSON archive',
      category: 'Actions',
      icon: Download,
      action: () => {
        const json = store.exportFullDataBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paisa_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      },
    },
  ];

  // Add search results from recent transactions
  const matchingTransactions: PaletteItem[] = transactions
    .filter(
      t =>
        query.length >= 2 &&
        (t.merchant.toLowerCase().includes(query.toLowerCase()) ||
          t.description?.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 5)
    .map(t => ({
      id: `tx_${t.id}`,
      title: `${t.merchant} — ${formatINR(t.amount)}`,
      subtitle: `${t.transaction_date.slice(0, 10)} • ${t.payment_method} (${t.transaction_type})`,
      category: 'Transactions',
      icon: Receipt,
      action: () => onNavigate('transactions'),
    }));

  // Add search results from goals
  const matchingGoals: PaletteItem[] = goals
    .filter(g => query.length >= 2 && g.name.toLowerCase().includes(query.toLowerCase()))
    .map(g => ({
      id: `goal_${g.id}`,
      title: `Goal: ${g.name} (${formatINR(g.current_amount)} / ${formatINR(g.target_amount)})`,
      subtitle: `Target date: ${g.target_date}`,
      category: 'Goals',
      icon: Trophy,
      action: () => onNavigate('goals'),
    }));

  // Add search results from recurring bills
  const matchingBills: PaletteItem[] = recurring
    .filter(r => query.length >= 2 && r.name.toLowerCase().includes(query.toLowerCase()))
    .map(r => ({
      id: `bill_${r.id}`,
      title: `Bill: ${r.name} — ${formatINR(r.amount)} (${r.frequency})`,
      subtitle: `Next due: ${r.next_due_date}`,
      category: 'Bills',
      icon: CalendarDays,
      action: () => onNavigate('recurring'),
    }));

  const q = query.toLowerCase().trim();
  const filteredBase = baseItems.filter(
    item =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
  );

  const allItems = [...filteredBase, ...matchingTransactions, ...matchingGoals, ...matchingBills];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#181D26]/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl border border-[#EDE8E0] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#EDE8E0] flex items-center gap-3 bg-[#FAF8F5]">
          <Search className="w-5 h-5 text-[#7F899F] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search screens, actions, merchants, budgets, goals... (Esc to close)"
            className="w-full bg-transparent text-sm text-[#181D26] placeholder-[#7F899F] outline-none font-medium"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white border border-[#EDE8E0] text-[10px] font-mono font-bold text-[#7F899F]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F5F2EB]">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7F899F]">
              No matches found for "{query}". Try searching "expense", "budgets", or a merchant name.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[#181D26] text-white shadow-xs' : 'hover:bg-[#FAF8F5] text-[#181D26]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#2A3241] text-[#F0D49C]' : 'bg-[#FAF8F5] text-[#7F899F] border border-[#EDE8E0]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-slate-300' : 'text-[#7F899F]'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      isSelected
                        ? 'bg-[#2A3241] text-slate-300'
                        : 'bg-[#FAF8F5] text-[#7F899F] border border-[#EDE8E0]'
                    }`}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="p-3 border-t border-[#EDE8E0] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#7F899F] px-4">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white border border-[#EDE8E0] px-1.5 py-0.5 rounded text-[10px] mr-1">↑</kbd>
              <kbd className="font-mono bg-white border border-[#EDE8E0] px-1.5 py-0.5 rounded text-[10px] mr-1">↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-white border border-[#EDE8E0] px-1.5 py-0.5 rounded text-[10px] mr-1">↵</kbd>
              Select
            </span>
          </div>
          <div>PAISA Quick Navigator</div>
        </div>
      </div>
    </div>
  );
};
