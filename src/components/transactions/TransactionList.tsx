import React, { useState } from 'react';
import { Transaction, PaymentMethod, TransactionType } from '../../types';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { exportTransactionsToCsv } from '../../lib/csvParser';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShieldAlert,
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Filter transactions
  const filtered = transactions.filter(tx => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      tx.merchant.toLowerCase().includes(query) ||
      (tx.description && tx.description.toLowerCase().includes(query)) ||
      (tx.notes && tx.notes.toLowerCase().includes(query));

    const matchCategory = selectedCategory === 'all' || tx.category_id === selectedCategory;
    const matchMethod = selectedMethod === 'all' || tx.payment_method === selectedMethod;
    const matchType = selectedType === 'all' || tx.transaction_type === selectedType;

    return matchSearch && matchCategory && matchMethod && matchType;
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

  return (
    <div className="space-y-4">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by merchant, food, UPI, etc..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCsvImport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Import CSV statement"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={onAddTransaction}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add</span>
          </button>
        </div>

      </div>

      {/* Filters row */}
      <div className="grid grid-cols-3 gap-2">
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedMethod}
          onChange={e => setSelectedMethod(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Methods</option>
          <option value="UPI">UPI</option>
          <option value="Debit card">Debit card</option>
          <option value="Credit card">Credit card</option>
          <option value="Net banking">Net banking</option>
          <option value="Cash">Cash</option>
          <option value="Wallet">Wallet</option>
        </select>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            No transactions match the selected filters.
          </div>
        ) : (
          filtered.map(tx => {
            const isExpense = isSpendingExpense(tx);
            const isIncome = tx.transaction_type === 'income';
            const isSettlement = tx.is_credit_card_payment;

            return (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
              >
                {/* Left icon & details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isIncome
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isSettlement
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : isSettlement ? (
                      <ArrowLeftRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                      <span className="truncate">{tx.merchant}</span>
                      {tx.is_unplanned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                          Impulse
                        </span>
                      )}
                      {isSettlement && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0" title="Credit Card Bill Repayment: Excluded from daily spend">
                          CC Settlement
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                      <span>{catMap.get(tx.category_id) || 'General'}</span>
                      <span>•</span>
                      <span>{tx.payment_method}</span>
                      <span>•</span>
                      <span>{tx.transaction_date.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold font-mono-num ${
                        isIncome ? 'text-emerald-400' : isSettlement ? 'text-blue-400' : 'text-slate-100'
                      }`}
                    >
                      {isIncome ? `+${formatINR(tx.amount)}` : formatINR(tx.amount)}
                    </div>
                    {isSettlement && (
                      <div className="text-[10px] text-slate-500 font-medium">No double-count</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id, tx.merchant)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
