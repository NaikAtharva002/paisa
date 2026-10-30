import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { exportTransactionsToCsv } from '../../lib/csvParser';
import {
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface TransactionListProps {
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenCsvImport: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onAddTransaction,
  onEditTransaction,
  onOpenCsvImport,
}) => {
  const transactions = store.getTransactions();
  const categories = store.getCategories();
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'expense' | 'income' | 'this_month'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const now = new Date();
  const currentMonthPrefix = now.toISOString().slice(0, 7);

  // Filter transactions
  const filtered = transactions.filter(tx => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      tx.merchant.toLowerCase().includes(query) ||
      (tx.description && tx.description.toLowerCase().includes(query)) ||
      (tx.notes && tx.notes.toLowerCase().includes(query));

    const matchCategory = selectedCategory === 'all' || tx.category_id === selectedCategory;

    let matchTab = true;
    if (filterTab === 'expense') matchTab = tx.transaction_type === 'expense';
    if (filterTab === 'income') matchTab = tx.transaction_type === 'income';
    if (filterTab === 'this_month') matchTab = tx.transaction_date.startsWith(currentMonthPrefix);

    return matchSearch && matchCategory && matchTab;
  });

  // Group by date (Today, Yesterday, Earlier)
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  const groups: { [key: string]: Transaction[] } = {};
  filtered.forEach(tx => {
    const dateStr = tx.transaction_date.slice(0, 10);
    let label = 'Earlier';
    if (dateStr === todayStr) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';
    else {
      label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });

  const handleDelete = (id: string, merchant: string) => {
    if (confirm(`Delete transaction "${merchant}"?`)) {
      store.deleteTransaction(id);
    }
  };

  const handleExportCsv = () => {
    const csv = exportTransactionsToCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paisa_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Reference 2 styled merchant avatar icons
  const getMerchantAvatar = (merchant: string, isIncome: boolean) => {
    const lower = merchant.toLowerCase();
    if (isIncome) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#EBF7EE] text-[#2E8B57] flex items-center justify-center font-bold text-xs shadow-sm">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('swiggy')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#FC8019] text-white flex items-center justify-center font-black text-xs shadow-sm">
          S
        </div>
      );
    }
    if (lower.includes('blinkit')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#F8CB46] text-[#181D26] flex items-center justify-center font-black text-xs shadow-sm">
          B
        </div>
      );
    }
    if (lower.includes('zomato')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#E23744] text-white flex items-center justify-center font-black text-xs shadow-sm">
          Z
        </div>
      );
    }
    if (lower.includes('uber') || lower.includes('ola')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#181D26] text-white flex items-center justify-center font-black text-xs shadow-sm">
          U
        </div>
      );
    }
    if (lower.includes('zepto')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#9E1BFF] text-white flex items-center justify-center font-black text-xs shadow-sm">
          Z
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-[#F5F2EB] text-[#7F899F] flex items-center justify-center font-bold text-xs border border-[#EDE8E0]">
        {merchant.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in max-w-4xl mx-auto">
      {/* Header & Search */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Transactions</h2>
            <p className="text-xs text-[#7F899F] mt-0.5">Filter, review, and search your spending records</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCsvImport}
              className="btn-secondary text-xs px-3.5 py-2"
              title="Import CSV bank statement"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary text-xs px-3.5 py-2"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onAddTransaction}
              className="btn-primary text-xs px-4 py-2"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar (Reference 2) */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search transactions, UPI, food, bills..."
            className="input-field pl-9.5 text-xs rounded-full bg-[#FAF8F5]"
          />
        </div>

        {/* Filter Pills (Reference 2: All, Expenses, Income, This Month) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#EDE8E0] text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
              filterTab === 'all'
                ? 'bg-[#181D26] text-white shadow-sm'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('expense')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
              filterTab === 'expense'
                ? 'bg-[#181D26] text-white shadow-sm'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilterTab('income')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
              filterTab === 'income'
                ? 'bg-[#181D26] text-white shadow-sm'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilterTab('this_month')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
              filterTab === 'this_month'
                ? 'bg-[#181D26] text-white shadow-sm'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            This Month
          </button>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-xs text-[#3D4658] font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date-Grouped Transaction Cards (Reference 2) */}
      {Object.keys(groups).length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-2">
          <Receipt className="w-8 h-8 text-[#A4ADC0] mx-auto" />
          <div className="font-bold text-sm text-[#181D26]">No transactions found</div>
          <p className="text-xs text-[#7F899F]">Try clearing filters or tap Add to record a new transaction.</p>
        </div>
      ) : (
        Object.entries(groups).map(([groupLabel, txList]) => (
          <div key={groupLabel} className="space-y-2">
            <div className="text-xs font-bold text-[#7F899F] uppercase tracking-wider px-2">
              {groupLabel}
            </div>

            <div className="rounded-2xl bg-white border border-[#EDE8E0] shadow-card divide-y divide-[#EDE8E0] overflow-hidden">
              {txList.map(tx => {
                const isIncome = tx.transaction_type === 'income';
                const categoryName = catMap.get(tx.category_id) || 'General';
                const timeStr = new Intl.DateTimeFormat('en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }).format(new Date(tx.transaction_date));

                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="p-4 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {getMerchantAvatar(tx.merchant, isIncome)}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#181D26] truncate">
                          {tx.merchant}
                        </div>
                        <div className="text-xs text-[#7F899F] mt-0.5 flex items-center gap-2">
                          <span>{categoryName}</span>
                          <span>•</span>
                          <span className="font-mono-num">{timeStr}</span>
                          {tx.payment_method && (
                            <>
                              <span>•</span>
                              <span className="font-mono-num">{tx.payment_method}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm sm:text-base font-black font-mono-num ${
                            isIncome ? 'text-[#2E8B57]' : 'text-[#181D26]'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="btn-icon w-7 h-7"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#5E687D]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tx.id, tx.merchant);
                          }}
                          className="btn-icon w-7 h-7 text-[#E06D53]"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
