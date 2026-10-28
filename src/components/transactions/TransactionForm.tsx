import React, { useState, useEffect } from 'react';
import { Transaction, PaymentMethod, TransactionType } from '../../types';
import { store } from '../../lib/storage';
import { suggestCategory } from '../../lib/categorization';
import { Sparkles, AlertCircle } from 'lucide-react';

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const categories = store.getCategories();
  const profile = store.getProfile();

  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [transactionType, setTransactionType] = useState<TransactionType>(initialData?.transaction_type || 'expense');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || 'cat_food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.payment_method || 'UPI');
  const [transactionDate, setTransactionDate] = useState(
    initialData?.transaction_date || new Date().toISOString().slice(0, 16)
  );
  const [isUnplanned, setIsUnplanned] = useState(initialData?.is_unplanned || false);
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring || false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [autoCatSuggestion, setAutoCatSuggestion] = useState<string | null>(null);
  const [isCreditCardPayment, setIsCreditCardPayment] = useState(initialData?.is_credit_card_payment || false);

  // Auto-suggest category whenever merchant changes
  useEffect(() => {
    if (!initialData && merchant.length >= 2) {
      const result = suggestCategory(merchant, description);
      if (result.categoryId && result.confidence >= 0.7) {
        setCategoryId(result.categoryId);
        setAutoCatSuggestion(result.matchedRule || null);
        if (result.isCreditCardPayment) {
          setIsCreditCardPayment(true);
        }
      }
    }
  }, [merchant, description, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    if (!merchant.trim()) {
      alert('Please enter a merchant or description.');
      return;
    }

    if (initialData) {
      store.updateTransaction(initialData.id, {
        amount: numAmount,
        merchant: merchant.trim(),
        description: description.trim(),
        transaction_type: transactionType,
        category_id: categoryId,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        is_unplanned: isUnplanned,
        is_recurring: isRecurring,
        is_credit_card_payment: isCreditCardPayment,
        notes: notes.trim(),
      });
    } else {
      store.addTransaction({
        user_id: profile.user_id,
        amount: numAmount,
        merchant: merchant.trim(),
        description: description.trim(),
        transaction_type: transactionType,
        category_id: categoryId,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        is_unplanned: isUnplanned,
        is_recurring: isRecurring,
        is_credit_card_payment: isCreditCardPayment,
        notes: notes.trim(),
      });
    }

    onSuccess();
  };

  const paymentMethods: PaymentMethod[] = [
    'UPI',
    'Debit card',
    'Credit card',
    'Cash',
    'Net banking',
    'Wallet',
    'Other',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Type Toggle */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
        {(['expense', 'income', 'transfer'] as TransactionType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setTransactionType(type)}
            className={`py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${
              transactionType === type
                ? type === 'income' 
                  ? 'bg-emerald-500 text-slate-950'
                  : type === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Amount (Big prominent input) */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Amount (INR)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-2xl font-bold text-slate-400">₹</span>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            required
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-2xl sm:text-3xl font-extrabold text-white font-mono-num placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Merchant / Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Merchant / Description
          </label>
          {autoCatSuggestion && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-matched "{autoCatSuggestion}"
            </span>
          )}
        </div>
        <input
          type="text"
          value={merchant}
          onChange={e => setMerchant(e.target.value)}
          placeholder="e.g. Swiggy, Blinkit, Uber, Starbucks, House Rent"
          required
          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Category & Payment Method Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {paymentMethods.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Date & Time
        </label>
        <input
          type="datetime-local"
          value={transactionDate.slice(0, 16)}
          onChange={e => setTransactionDate(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Special Flags */}
      <div className="pt-2 space-y-2 border-t border-slate-800">
        
        {/* Unplanned purchase checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isUnplanned}
            onChange={e => setIsUnplanned(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0"
          />
          <span>Mark as an <strong>unplanned / impulse purchase</strong></span>
        </label>

        {/* Credit card settlement / transfer notice */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isCreditCardPayment}
            onChange={e => setIsCreditCardPayment(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0"
          />
          <span>This is a <strong>Credit Card Bill Payment / Transfer</strong> (Exclude from daily spend)</span>
        </label>

        {isCreditCardPayment && (
          <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Card bill payments are settlements; checking this prevents double-counting the original purchases already logged in your statement.</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          {initialData ? 'Update Transaction' : 'Save Expense'}
        </button>
      </div>

    </form>
  );
};
