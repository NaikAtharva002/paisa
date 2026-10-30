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
  ArrowLeftRight,
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
    <div className="space-y-4 animate-in">
      {/* Top action and filter bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by merchant, Swiggy, UPI, notes..."
              className="input-field pl-9.5 text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCsvImport}
              className="btn-secondary text-xs px-3.5 py-2"
              title="Import CSV bank statement"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="btn-secondary text-xs px-3.5 py-2"
              title="Export filtered records to CSV"
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

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.05] text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#06091A] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="expense">Expense (Spends)</option>
            <option value="income">Income (Credits)</option>
            <option value="transfer">Transfers</option>
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#06091A] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-emerald-500 max-w-[150px]"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#06091A] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="Debit card">Debit Card</option>
            <option value="Credit card">Credit Card</option>
            <option value="Cash">Cash</option>
            <option value="Net banking">Net Banking</option>
          </select>

          {(searchQuery || selectedCategory !== 'all' || selectedMethod !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedMethod('all');
                setSelectedType('all');
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transaction List Cards */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
          <span className="section-title text-slate-400">
            Transactions ({filtered.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Click any row to edit or view details
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-sm font-semibold text-slate-200">No transactions found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No records match your active search or filters. Try adjusting them or tap "Add" to record a new spend.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const isIncome = tx.transaction_type === 'income';
              const isTransfer = tx.transaction_type === 'transfer';
              const categoryName = catMap.get(tx.category_id) || 'General';
              const formattedDate = new Intl.DateTimeFormat('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(tx.transaction_date));

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="p-3.5 sm:p-4 rounded-xl bg-[#06091A] border border-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  {/* Left Icon & Description */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isTransfer
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isTransfer ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {tx.merchant}
                        </span>
                        <span className="tag tag-slate text-[9px] hidden xs:inline">
                          {categoryName}
                        </span>
                        {tx.is_unplanned && (
                          <span className="tag tag-amber text-[9px]">
                            Unplanned
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-2">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="font-mono-num">{tx.payment_method}</span>
                        {tx.description && tx.description !== tx.merchant && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-black font-mono-num ${
                          isIncome
                            ? 'text-emerald-400'
                            : isTransfer
                            ? 'text-blue-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                      </div>
                      {tx.is_credit_card_payment && (
                        <div className="text-[10px] text-slate-500">CC Payment</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction(tx);
                        }}
                        className="btn-icon w-8 h-8"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tx.id, tx.merchant);
                        }}
                        className="btn-icon w-8 h-8 text-slate-500 hover:text-red-400 hover:border-red-500/30"
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
        )}
      </div>
    </div>
  );
};
