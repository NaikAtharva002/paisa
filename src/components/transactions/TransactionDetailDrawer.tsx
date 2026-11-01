import React, { useState } from 'react';
import { Transaction, Account, Category } from '../../types';
import { formatINR } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { showToast } from '../common/Toast';
import {
  X,
  Edit2,
  Trash2,
  Copy,
  Check,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Tag,
  Sparkles,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertCircle,
  HelpCircle,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onCategoryChange: (tx: Transaction, newCategoryId: string) => void;
  onCreateRule?: (merchant: string, categoryId: string) => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCategoryChange,
  onCreateRule,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(transaction?.category_id || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ruleSaved, setRuleSaved] = useState(false);

  if (!isOpen || !transaction) return null;

  const categories = store.getCategories();
  const catMap = new Map(categories.map(c => [c.id, c]));
  const currentCategory = catMap.get(transaction.category_id);
  
  const accounts = store.getAccounts();
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const linkedAccount = transaction.account_id ? accountMap.get(transaction.account_id) : undefined;

  const isIncome = transaction.transaction_type === 'income';
  const isTransfer = transaction.transaction_type === 'transfer' || transaction.is_internal_transfer;
  const isNeedsReview = !transaction.category_id || transaction.category_id === 'cat_other';

  const dateObj = new Date(transaction.transaction_date);
  const formattedFullDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);

  const handleCopyRef = () => {
    const textToCopy = transaction.external_transaction_id || transaction.id;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveCategory = (newCatId: string) => {
    setSelectedCatId(newCatId);
    onCategoryChange(transaction, newCatId);
    setIsChangingCategory(false);
    showToast({
      type: 'success',
      title: 'Category Updated',
      message: `Transaction categorized as ${catMap.get(newCatId)?.name || 'Updated'}.`,
    });
  };

  const handleCreateRule = () => {
    if (!transaction.merchant) return;
    const catId = selectedCatId || transaction.category_id || 'cat_other';
    store.saveUserCategoryRule({
      categoryId: catId,
      keywords: [transaction.merchant.toLowerCase().trim()],
    });
    setRuleSaved(true);
    showToast({
      type: 'success',
      title: 'Rule Remembered',
      message: `Future transactions from "${transaction.merchant}" will automatically be categorized as ${catMap.get(catId)?.name}.`,
    });
    if (onCreateRule) {
      onCreateRule(transaction.merchant, catId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slideInRight border-l border-[#EDE8E0]">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-[#EDE8E0] flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isIncome
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isTransfer
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-[#3D4658] border border-slate-200'
                }`}
              >
                {isIncome ? 'Money In' : isTransfer ? 'Transfer' : 'Money Out'}
              </span>
              {isNeedsReview && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Needs review
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(transaction);
                }}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-[#5E687D] hover:text-[#181D26] flex items-center justify-center transition-colors"
                title="Edit Transaction"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-8 h-8 rounded-xl hover:bg-red-50 text-[#7F899F] hover:text-red-600 flex items-center justify-center transition-colors"
                title="Delete Transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-[#7F899F] hover:text-[#181D26] flex items-center justify-center transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Banner */}
          {showDeleteConfirm && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-900 space-y-2">
              <div className="text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Delete this transaction permanently?</span>
              </div>
              <p className="text-[11px] text-red-700">
                This will remove the transaction from your ledger and update your monthly totals.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete(transaction);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Amount Hero Section */}
            <div className="text-center py-2 space-y-1 border-b border-[#EDE8E0] pb-6">
              <div
                className={`text-3xl sm:text-4xl font-black font-mono-num tracking-tight ${
                  isIncome ? 'text-[#2E8B57]' : isTransfer ? 'text-[#3B82F6]' : 'text-[#181D26]'
                }`}
              >
                {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{formatINR(transaction.amount)}
              </div>
              <div className="text-base font-bold text-[#181D26] mt-2">
                {transaction.merchant || 'Unknown Transaction'}
              </div>
              <div className="text-xs text-[#7F899F] flex items-center justify-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedFullDate} • {formattedTime}</span>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7F899F]">
                Transaction Details
              </h4>

              <div className="rounded-2xl border border-[#EDE8E0] bg-[#FAF8F5]/50 divide-y divide-[#EDE8E0] overflow-hidden text-xs">
                {/* Category with Quick Inline Editor */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#5E687D]">
                    <Tag className="w-3.5 h-3.5 text-[#D4952B]" />
                    <span className="font-semibold">Category</span>
                  </div>

                  {!isChangingCategory ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#181D26]">
                        {currentCategory?.name || 'Uncategorized'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChangingCategory(true)}
                        className="text-[11px] font-bold text-[#D4952B] hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <select
                      autoFocus
                      value={selectedCatId || transaction.category_id}
                      onChange={e => handleSaveCategory(e.target.value)}
                      onBlur={() => setIsChangingCategory(false)}
                      className="px-2 py-1 rounded-xl bg-white border border-[#D4952B] text-xs font-bold text-[#181D26]"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Account */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#5E687D]">
                    <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="font-semibold">Account</span>
                  </div>
                  <div className="font-bold text-[#181D26] text-right">
                    {linkedAccount ? linkedAccount.account_name : 'Direct Cash / Unassigned'}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#5E687D]">
                    <CreditCard className="w-3.5 h-3.5 text-[#2E8B57]" />
                    <span className="font-semibold">Payment Method</span>
                  </div>
                  <div className="font-bold text-[#181D26]">
                    {transaction.payment_method || 'UPI'}
                  </div>
                </div>

                {/* Reference / External ID */}
                {(transaction.external_transaction_id || transaction.id) && (
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#5E687D]">
                      <FileText className="w-3.5 h-3.5 text-[#7F899F]" />
                      <span className="font-semibold">Reference ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#3D4658]">
                        {transaction.external_transaction_id || transaction.id.slice(0, 16)}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRef}
                        className="text-[#7F899F] hover:text-[#181D26] transition-colors"
                        title="Copy Reference ID"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-[#2E8B57]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Synchronisation Status */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#5E687D]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2E8B57]" />
                    <span className="font-semibold">Storage & Sync</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-bold text-[11px] text-[#2E8B57]">
                    <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
                    <span>Local & Supabase Synced</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Original Statement Description / Narration */}
            {transaction.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7F899F]">
                  Original Bank Narration
                </h4>
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-mono text-[#3D4658] break-all leading-relaxed">
                  {transaction.description}
                </div>
              </div>
            )}

            {/* User Notes */}
            {transaction.notes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7F899F]">
                  Notes
                </h4>
                <div className="p-3.5 rounded-2xl bg-white border border-[#EDE8E0] text-xs text-[#3D4658]">
                  {transaction.notes}
                </div>
              </div>
            )}

            {/* Merchant Rule Learning Card */}
            {transaction.merchant && transaction.merchant !== 'Unknown Merchant' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-[#F5F2EB] border border-[#EDE8E0] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#181D26]">
                  <Sparkles className="w-4 h-4 text-[#D4952B]" />
                  <span>Category Rule Memory</span>
                </div>
                <p className="text-[11px] text-[#7F899F] leading-normal">
                  Always categorize transactions from <strong>"{transaction.merchant}"</strong> as{' '}
                  <strong>{currentCategory?.name || 'selected category'}</strong> in future imports?
                </p>
                <button
                  type="button"
                  disabled={ruleSaved}
                  onClick={handleCreateRule}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    ruleSaved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-white border border-[#EDE8E0] text-[#181D26] hover:border-[#D4952B] shadow-xs'
                  }`}
                >
                  {ruleSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Rule Remembered!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#D4952B]" />
                      <span>Remember this rule</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-[#EDE8E0] bg-[#FAF8F5]/80 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-[#181D26] text-white text-xs font-bold hover:bg-[#2A3140] transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl bg-white border border-[#EDE8E0] text-xs font-bold text-[#5E687D] hover:text-[#181D26] hover:border-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
