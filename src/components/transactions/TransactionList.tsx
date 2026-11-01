import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category } from '../../types';
import { formatINR, toPaise, fromPaise } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { exportTransactionsToCsv, exportTransactionsToExcel } from '../../lib/csvParser';
import { showToast } from '../common/Toast';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';
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
  FileSpreadsheet,
  FileText,
  ChevronDown,
  X,
  AlertCircle,
  HelpCircle,
  Calendar,
  Building2,
  CreditCard,
  Sparkles,
  TrendingUp,
  TrendingDown,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Car,
  Zap,
  Film,
  HeartPulse,
  Home,
  LineChart,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';

interface TransactionListProps {
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenCsvImport: () => void;
}

type FilterTab = 'all' | 'income' | 'expense' | 'transfer' | 'needs_review';
type PeriodFilter = 'all' | 'this_month' | 'last_month' | '30_days' | 'this_year';
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

export const TransactionList: React.FC<TransactionListProps> = ({
  onAddTransaction,
  onEditTransaction,
  onOpenCsvImport,
}) => {
  // Store subscriptions & data
  const transactions = store.getTransactions();
  const categories = store.getCategories();
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accounts = store.getAccounts();
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const people = store.getPeople();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Selected Transaction for Drawer
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // ----------------------------------------------------------------------
  // Section 4: Transaction Identity Resolution
  // Priority:
  // 1. User-confirmed merchant/person identity
  // 2. Recognised merchant from reliable transaction data
  // 3. Extracted UPI recipient
  // 4. Cleaned original bank description
  // 5. Unknown merchant (never invent fake names)
  // ----------------------------------------------------------------------
  const resolveIdentity = (tx: Transaction): { name: string; isUnknown: boolean; subtitle?: string } => {
    const rawMerchant = (tx.merchant || '').trim();
    const rawDesc = (tx.description || '').trim();

    // 1. User-confirmed person/merchant directory match
    const matchedPerson = people.find(p => {
      const pName = p.display_name.toLowerCase();
      if (rawMerchant.toLowerCase() === pName) return true;
      if (p.aliases?.some(a => rawMerchant.toLowerCase().includes(a.toLowerCase()))) return true;
      if (p.upi_vpa && (rawDesc.toLowerCase().includes(p.upi_vpa.toLowerCase()) || rawMerchant.toLowerCase().includes(p.upi_vpa.toLowerCase()))) return true;
      return false;
    });

    if (matchedPerson) {
      return { name: matchedPerson.display_name, isUnknown: false, subtitle: matchedPerson.relationship };
    }

    // 2. Recognised merchant from reliable data
    if (rawMerchant && rawMerchant !== 'Unknown Merchant' && rawMerchant !== 'Transaction') {
      return { name: rawMerchant, isUnknown: false };
    }

    // 3. Extracted UPI Recipient from description/notes
    const combined = `${rawMerchant} ${rawDesc} ${tx.notes || ''}`;
    const upiMatch = combined.match(/UPI\/(?:CR|DR)?\/?\d*\/([A-Za-z0-9 ._-]{3,30})\//i) ||
                     combined.match(/([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,64})/i);
    if (upiMatch && upiMatch[1]) {
      const extracted = upiMatch[1].replace(/[_-]/g, ' ').trim();
      if (extracted.length > 2) {
        return { name: extracted, isUnknown: false, subtitle: 'Extracted UPI Recipient' };
      }
    }

    // 4. Cleaned original bank description
    if (rawDesc) {
      const cleaned = rawDesc
        .replace(/^(POS|UPI|NEFT|RTGS|IMPS|INB|ATM|BIL|ACH)\/?[A-Z0-9]*\/?/i, '')
        .replace(/\d{6,}/g, '')
        .replace(/XX\d{4}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length >= 3) {
        return { name: cleaned, isUnknown: false };
      }
    }

    // 5. Unknown fallback (never invent names)
    return { name: rawMerchant || 'Unknown Merchant', isUnknown: true };
  };

  // ----------------------------------------------------------------------
  // Section 3: Contextual Transaction Icons
  // ----------------------------------------------------------------------
  const getTransactionIcon = (tx: Transaction, isIncome: boolean, isTransfer: boolean, isNeedsReview: boolean) => {
    if (isTransfer) {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 shadow-2xs">
          <ArrowLeftRight className="w-4 h-4 stroke-[2.2]" />
        </div>
      );
    }

    if (isIncome) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#EBF7EE] text-[#2E8B57] border border-[#CDE5D7] flex items-center justify-center shrink-0 shadow-2xs">
          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }

    if (isNeedsReview) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
          <AlertCircle className="w-4 h-4 stroke-[2.2]" />
        </div>
      );
    }

    // Category-specific iconography
    switch (tx.category_id) {
      case 'cat_food':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
        );
      case 'cat_groceries':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case 'cat_transport':
        return (
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Car className="w-4 h-4" />
          </div>
        );
      case 'cat_shopping':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Package className="w-4 h-4" />
          </div>
        );
      case 'cat_bills':
        return (
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 border border-orange-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="w-4 h-4" />
          </div>
        );
      case 'cat_entertainment':
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Film className="w-4 h-4" />
          </div>
        );
      case 'cat_health':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <HeartPulse className="w-4 h-4" />
          </div>
        );
      case 'cat_rent':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <Home className="w-4 h-4" />
          </div>
        );
      case 'cat_investments':
        return (
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0 shadow-2xs">
            <LineChart className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#5E687D] border border-slate-200/70 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
    }
  };

  // ----------------------------------------------------------------------
  // Section 5 & 6: Filtering & Search Engine
  // ----------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const currentYearPrefix = `${now.getFullYear()}`;

    return transactions.filter(tx => {
      // 1. Text Search across merchant, description, notes, external id, category, account
      if (query) {
        const catName = catMap.get(tx.category_id)?.name.toLowerCase() || '';
        const accName = tx.account_id ? accountMap.get(tx.account_id)?.account_name.toLowerCase() || '' : '';
        const matches =
          tx.merchant.toLowerCase().includes(query) ||
          (tx.description && tx.description.toLowerCase().includes(query)) ||
          (tx.notes && tx.notes.toLowerCase().includes(query)) ||
          (tx.external_transaction_id && tx.external_transaction_id.toLowerCase().includes(query)) ||
          (tx.payment_method && tx.payment_method.toLowerCase().includes(query)) ||
          catName.includes(query) ||
          accName.includes(query);
        if (!matches) return false;
      }

      // 2. Tab Filter
      const isTransfer = tx.transaction_type === 'transfer' || tx.is_internal_transfer;
      const isNeedsReview = !tx.category_id || tx.category_id === 'cat_other';

      if (activeTab === 'income' && tx.transaction_type !== 'income') return false;
      if (activeTab === 'expense' && (tx.transaction_type !== 'expense' || isTransfer)) return false;
      if (activeTab === 'transfer' && !isTransfer) return false;
      if (activeTab === 'needs_review' && !isNeedsReview) return false;

      // 3. Period Filter
      const dateStr = tx.transaction_date.slice(0, 10);
      if (periodFilter === 'this_month' && !dateStr.startsWith(currentMonthPrefix)) return false;
      if (periodFilter === 'last_month' && !dateStr.startsWith(lastMonthPrefix)) return false;
      if (periodFilter === '30_days' && dateStr < thirtyDaysAgo) return false;
      if (periodFilter === 'this_year' && !dateStr.startsWith(currentYearPrefix)) return false;

      // 4. Category Filter
      if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;

      // 5. Account Filter
      if (selectedAccount !== 'all' && tx.account_id !== selectedAccount) return false;

      return true;
    });
  }, [transactions, searchQuery, activeTab, periodFilter, selectedCategory, selectedAccount, catMap, accountMap]);

  // Sorting
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      }
      if (sortOrder === 'highest') {
        return b.amount - a.amount;
      }
      if (sortOrder === 'lowest') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [filteredTransactions, sortOrder]);

  // ----------------------------------------------------------------------
  // Section 8: Integer Paise Accurate Totals (Period & Daily)
  // Internal transfers strictly excluded from income and expense sums!
  // ----------------------------------------------------------------------
  const periodSummary = useMemo(() => {
    let inflowPaisa = 0;
    let outflowPaisa = 0;
    let transferCount = 0;

    for (const tx of filteredTransactions) {
      const isTransfer = tx.is_internal_transfer || tx.transaction_type === 'transfer';
      if (isTransfer) {
        transferCount++;
        continue;
      }
      const p = toPaise(tx.amount);
      if (tx.transaction_type === 'income') {
        inflowPaisa += p;
      } else {
        outflowPaisa += p;
      }
    }

    const netPaisa = inflowPaisa - outflowPaisa;
    return {
      inflow: fromPaise(inflowPaisa),
      outflow: fromPaise(outflowPaisa),
      net: fromPaise(netPaisa),
      totalCount: filteredTransactions.length,
      transferCount,
    };
  }, [filteredTransactions]);

  // Count of "Needs Review" across all transactions for the tab badge
  const needsReviewCount = useMemo(() => {
    return transactions.filter(t => !t.category_id || t.category_id === 'cat_other').length;
  }, [transactions]);

  // ----------------------------------------------------------------------
  // Section 2: Date-Grouped Transaction Feed
  // Group by YYYY-MM-DD, compute daily inflow, outflow & net movement
  // ----------------------------------------------------------------------
  interface DateGroup {
    dateKey: string;
    formattedDate: string;
    relativeLabel?: string;
    txList: Transaction[];
    inflow: number;
    outflow: number;
    net: number;
  }

  const dateGroups: DateGroup[] = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

    const groupMap = new Map<string, Transaction[]>();
    for (const tx of sortedTransactions) {
      const key = tx.transaction_date.slice(0, 10);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(tx);
    }

    const groups: DateGroup[] = [];
    groupMap.forEach((txList, dateKey) => {
      const dateObj = new Date(`${dateKey}T00:00:00`);
      let relativeLabel: string | undefined;
      if (dateKey === todayStr) relativeLabel = 'Today';
      else if (dateKey === yesterdayStr) relativeLabel = 'Yesterday';

      const formattedDate = new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }).format(dateObj);

      // Compute day's totals with integer paise
      let dayInflowPaisa = 0;
      let dayOutflowPaisa = 0;
      for (const t of txList) {
        if (t.is_internal_transfer || t.transaction_type === 'transfer') continue;
        const p = toPaise(t.amount);
        if (t.transaction_type === 'income') dayInflowPaisa += p;
        else dayOutflowPaisa += p;
      }

      groups.push({
        dateKey,
        formattedDate,
        relativeLabel,
        txList,
        inflow: fromPaise(dayInflowPaisa),
        outflow: fromPaise(dayOutflowPaisa),
        net: fromPaise(dayInflowPaisa - dayOutflowPaisa),
      });
    });

    return groups;
  }, [sortedTransactions]);

  // ----------------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------------
  const handleDeleteTransaction = (tx: Transaction) => {
    store.deleteTransaction(tx.id);
    showToast({
      type: 'info',
      title: `Deleted "${tx.merchant}" (${formatINR(tx.amount)})`,
      message: 'Tap Undo within 5 seconds to restore.',
      undoAction: () => {
        store.addTransaction(tx);
        showToast({
          type: 'success',
          title: 'Transaction restored!',
          message: `${tx.merchant} is back in your ledger.`,
        });
      },
    });
  };

  const handleCategoryChange = (tx: Transaction, newCategoryId: string) => {
    store.updateTransaction(tx.id, { category_id: newCategoryId });
    if (selectedTxForDetail && selectedTxForDetail.id === tx.id) {
      setSelectedTxForDetail({ ...selectedTxForDetail, category_id: newCategoryId });
    }
  };

  const handleExportExcel = () => {
    const bytes = exportTransactionsToExcel(sortedTransactions);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paisa_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportCsv = () => {
    const csv = exportTransactionsToCsv(sortedTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paisa_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
    setPeriodFilter('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSortOrder('newest');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    activeTab !== 'all' ||
    periodFilter !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    sortOrder !== 'newest';

  return (
    <div className="space-y-4 max-w-5xl mx-auto px-2 sm:px-4">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Header Toolbar */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#EDE8E0] shadow-card">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#181D26] tracking-tight">
            Financial Activity
          </h2>
          <p className="text-xs text-[#7F899F] mt-0.5 font-medium">
            Verified, date-grouped transaction ledger with zero fake demo records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Button */}
          <button
            type="button"
            onClick={onOpenCsvImport}
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            title="Import Bank Statement (Excel, PDF, CSV, JSON)"
          >
            <Upload className="w-3.5 h-3.5 text-[#D4952B]" />
            <span>Import Statement</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              title="Export Transactions"
            >
              <Download className="w-3.5 h-3.5 text-[#5E687D]" />
              <span className="hidden xs:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-[#7F899F]" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white border border-[#EDE8E0] shadow-xl p-1.5 z-30 animate-in">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#181D26] hover:bg-[#FAF8F5] flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E8B57]" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#181D26] hover:bg-[#FAF8F5] flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D4952B]" />
                  <span>Export CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {/* Add Transaction Button */}
          <button
            type="button"
            onClick={onAddTransaction}
            className="btn-primary text-xs px-3.5 sm:px-4 py-2 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Period Summary Bar (Integer Paise Precision) */}
      {/* ---------------------------------------------------------------- */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Money In */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#2E8B57] border border-emerald-200/60 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#7F899F] uppercase tracking-wider block">
                Money In
              </span>
              <span className="text-sm sm:text-base font-black font-mono-num text-[#2E8B57] truncate block">
                +{formatINR(periodSummary.inflow)}
              </span>
            </div>
          </div>

          {/* Money Out */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#181D26] border border-slate-200/60 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#7F899F] uppercase tracking-wider block">
                Money Out
              </span>
              <span className="text-sm sm:text-base font-black font-mono-num text-[#181D26] truncate block">
                -{formatINR(periodSummary.outflow)}
              </span>
            </div>
          </div>

          {/* Net Movement */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                periodSummary.net >= 0
                  ? 'bg-emerald-50 text-[#2E8B57] border-emerald-200/60'
                  : 'bg-amber-50 text-[#D4952B] border-amber-200/60'
              }`}
            >
              {periodSummary.net >= 0 ? (
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#7F899F] uppercase tracking-wider block">
                Net Movement
              </span>
              <span
                className={`text-sm sm:text-base font-black font-mono-num truncate block ${
                  periodSummary.net >= 0 ? 'text-[#2E8B57]' : 'text-[#D4952B]'
                }`}
              >
                {periodSummary.net >= 0 ? '+' : ''}{formatINR(periodSummary.net)}
              </span>
            </div>
          </div>

          {/* Total Filtered Activity */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#8C5D17] border border-amber-200/60 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#7F899F] uppercase tracking-wider block">
                Transactions
              </span>
              <span className="text-sm sm:text-base font-black font-mono-num text-[#181D26] truncate block">
                {periodSummary.totalCount} {periodSummary.totalCount === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. Search Bar, Filter Tabs & Advanced Controls */}
      {/* ---------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-3.5">
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7F899F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search merchant, bank narration, UPI ref, notes, category..."
              className="input-field pl-9.5 pr-8 text-xs rounded-2xl bg-[#FAF8F5] border-[#EDE8E0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F899F] hover:text-[#181D26]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showFiltersPanel || hasActiveFilters
                ? 'bg-[#181D26] text-white border-[#181D26]'
                : 'bg-[#FAF8F5] text-[#5E687D] border-[#EDE8E0] hover:text-[#181D26]'
            }`}
            title="Toggle advanced filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Filter Tabs (Horizontal Scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 border-t border-[#EDE8E0]/70 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-[#181D26] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            All Activity ({transactions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'income'
                ? 'bg-[#2E8B57] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3" />
            <span>Money In</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'expense'
                ? 'bg-[#181D26] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>Money Out</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'transfer'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Transfers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('needs_review')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'needs_review'
                ? 'bg-[#D4952B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#5E687D] hover:text-[#181D26]'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>Needs Review</span>
            {needsReviewCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'needs_review' ? 'bg-white text-[#D4952B]' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {needsReviewCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto text-xs text-[#E06D53] hover:underline font-bold whitespace-nowrap px-2"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-[#EDE8E0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 animate-fadeIn text-xs">
            {/* Period Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-[#7F899F] mb-1">Period</label>
              <select
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value as PeriodFilter)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26]"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="30_days">Last 30 Days</option>
                <option value="this_year">This Year</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-[#7F899F] mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26]"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-[#7F899F] mb-1">Account</label>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26]"
              >
                <option value="all">All Accounts</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-[#7F899F] mb-1">Sort Order</label>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Date-Grouped Transaction Feed (Section 2 & 3) */}
      {/* ---------------------------------------------------------------- */}
      {transactions.length === 0 ? (
        // Clean Slate Empty State (Section 9)
        <div className="p-10 sm:p-14 text-center rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] flex items-center justify-center mx-auto shadow-xs">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-black text-lg text-[#181D26]">Clean Financial Activity Feed</h3>
            <p className="text-xs text-[#7F899F] max-w-md mx-auto mt-1 leading-relaxed">
              No transactions recorded yet. PAISA only displays verified real financial data. Import an official bank statement (Excel, PDF, CSV) or record an expense to begin tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onOpenCsvImport}
              className="px-4 py-2.5 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#262D3B] transition-all flex items-center gap-2 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#D4952B]" />
              <span>Import Bank Statement (Excel, PDF, CSV)</span>
            </button>
            <button
              type="button"
              onClick={onAddTransaction}
              className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-[#181D26] text-xs font-bold hover:border-[#D4952B] transition-all flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-[#2E8B57]" />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      ) : dateGroups.length === 0 ? (
        // No filter matches
        <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] shadow-card space-y-3">
          <Filter className="w-8 h-8 text-[#A4ADC0] mx-auto" />
          <div className="font-bold text-sm text-[#181D26]">No transactions match your filters</div>
          <p className="text-xs text-[#7F899F]">
            Try adjusting search terms, dates, or category selections.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] hover:border-[#D4952B] transition-colors inline-block"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(group => (
            <div key={group.dateKey} className="space-y-1.5">
              {/* Section 2: Date Group Header (Date shown only once!) */}
              <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {group.relativeLabel && (
                    <span className="font-extrabold text-[#181D26] text-xs bg-[#FAF8F5] border border-[#EDE8E0] px-2 py-0.5 rounded-md">
                      {group.relativeLabel}
                    </span>
                  )}
                  <span className="font-bold text-[#5E687D]">
                    {group.formattedDate}
                  </span>
                  <span className="text-[11px] text-[#9AA4B2] font-semibold">
                    • {group.txList.length} {group.txList.length === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>

                {/* Day Summary Metrics */}
                <div className="flex items-center gap-2.5 text-[11px] font-mono-num font-bold">
                  {group.inflow > 0 && (
                    <span className="text-[#2E8B57]">
                      +{formatINR(group.inflow)}
                    </span>
                  )}
                  {group.outflow > 0 && (
                    <span className="text-[#3D4658]">
                      -{formatINR(group.outflow)}
                    </span>
                  )}
                  <span className="text-[#7F899F] font-semibold">
                    Net: {group.net >= 0 ? '+' : ''}{formatINR(group.net)}
                  </span>
                </div>
              </div>

              {/* Transaction Rows Container */}
              <div className="rounded-2xl bg-white border border-[#EDE8E0] shadow-card divide-y divide-[#EDE8E0] overflow-hidden">
                {group.txList.map(tx => {
                  const isIncome = tx.transaction_type === 'income';
                  const isTransfer = tx.transaction_type === 'transfer' || tx.is_internal_transfer;
                  const isNeedsReview = !tx.category_id || tx.category_id === 'cat_other';
                  const identity = resolveIdentity(tx);
                  const categoryName = catMap.get(tx.category_id)?.name || 'Uncategorized';
                  const account = tx.account_id ? accountMap.get(tx.account_id) : undefined;

                  const timeStr = new Intl.DateTimeFormat('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(tx.transaction_date));

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="p-3.5 sm:p-4 hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      {/* LEFT: Contextual Icon + Identity + Secondary Metadata */}
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                        {getTransactionIcon(tx, isIncome, !!isTransfer, isNeedsReview)}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#181D26] truncate">
                              {identity.name}
                            </span>
                            {identity.subtitle && (
                              <span className="text-[10px] font-semibold text-[#7F899F] bg-slate-100 px-1.5 py-0.2 rounded-sm hidden sm:inline">
                                {identity.subtitle}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#7F899F] mt-0.5 flex flex-wrap items-center gap-1.5">
                            {/* Category with "Needs Review" state */}
                            {isNeedsReview ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                Needs review
                              </span>
                            ) : (
                              <span className="font-medium text-[#5E687D]">{categoryName}</span>
                            )}

                            <span>•</span>
                            <span className="font-mono-num">{timeStr}</span>

                            {tx.payment_method && (
                              <>
                                <span>•</span>
                                <span className="font-mono-num">{tx.payment_method}</span>
                              </>
                            )}

                            {account && (
                              <>
                                <span>•</span>
                                <span className="text-[#7F899F] truncate max-w-[120px] hidden sm:inline">
                                  {account.account_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Amount + Direction Treatment + Hover Action Menu */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-sm sm:text-base font-black font-mono-num tracking-tight ${
                              isIncome
                                ? 'text-[#2E8B57]'
                                : isTransfer
                                ? 'text-[#3B82F6]'
                                : 'text-[#181D26]'
                            }`}
                          >
                            {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{formatINR(tx.amount)}
                          </div>
                        </div>

                        {/* Action buttons (always accessible, highlighted on hover) */}
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onEditTransaction(tx);
                            }}
                            className="btn-icon w-7 h-7 text-[#5E687D] hover:text-[#181D26]"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteTransaction(tx);
                            }}
                            aria-label={`Delete ${tx.merchant}`}
                            className="btn-icon w-7 h-7 text-[#7F899F] hover:text-[#E06D53]"
                            title="Delete Transaction"
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
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 5. Transaction Detail Slide-Over Drawer (Section 7) */}
      {/* ---------------------------------------------------------------- */}
      <TransactionDetailDrawer
        transaction={selectedTxForDetail}
        isOpen={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        onEdit={tx => {
          setSelectedTxForDetail(null);
          onEditTransaction(tx);
        }}
        onDelete={tx => {
          setSelectedTxForDetail(null);
          handleDeleteTransaction(tx);
        }}
        onCategoryChange={handleCategoryChange}
      />
    </div>
  );
};
