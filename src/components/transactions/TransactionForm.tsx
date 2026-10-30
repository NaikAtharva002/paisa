import React, { useState, useEffect } from 'react';
import { Transaction, PaymentMethod, TransactionType } from '../../types';
import { store } from '../../lib/storage';
import { suggestCategory } from '../../lib/categorization';
import { Sparkles } from 'lucide-react';

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000];
const POPULAR_MERCHANTS = ['Blinkit', 'Swiggy', 'Zepto', 'Zomato', 'Uber', 'Amazon', 'Chai Point'];

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

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
  };

  const handleSelectMerchant = (name: string) => {
    setMerchant(name);
    if (!description) setDescription(name);
  };

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
    <form onSubmit={handleSubmit} className="space-y-4 text-[#181D26]">
      {/* Transaction Type Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
        <button
          type="button"
          onClick={() => setTransactionType('expense')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            transactionType === 'expense'
              ? 'bg-[#E06D53] text-white shadow-sm'
              : 'text-[#7F899F] hover:text-[#181D26]'
          }`}
        >
          Expense (Spends)
        </button>
        <button
          type="button"
          onClick={() => setTransactionType('income')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            transactionType === 'income'
              ? 'bg-[#2E8B57] text-white shadow-sm'
              : 'text-[#7F899F] hover:text-[#181D26]'
          }`}
        >
          Income (Credit)
        </button>
      </div>

      {/* Amount Input with Quick Preset Buttons */}
      <div>
        <label className="section-title text-[#7F899F]">Amount (INR ₹)</label>
        <div className="relative mt-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-[#7F899F]">
            ₹
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xl font-bold font-mono-num text-[#181D26] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
          />
        </div>

        {/* Quick Add Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {QUICK_AMOUNTS.map(val => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAmount(val)}
              className="text-[11px] font-mono-num font-semibold px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] text-[#3D4658] hover:border-[#D4952B] hover:text-[#181D26] transition-colors"
            >
              +₹{val}
            </button>
          ))}
          {amount && (
            <button
              type="button"
              onClick={() => setAmount('')}
              className="text-[10px] text-[#7F899F] hover:text-[#181D26] ml-auto font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Merchant / Payee with Popular Suggestions */}
      <div>
        <label className="section-title text-[#7F899F]">Merchant / Payee</label>
        <input
          type="text"
          required
          value={merchant}
          onChange={e => setMerchant(e.target.value)}
          placeholder="e.g. Swiggy, Blinkit, Starbucks, Uber"
          className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] placeholder-[#9AA4B2] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
        />

        {/* Popular Merchant Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {POPULAR_MERCHANTS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectMerchant(m)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] text-[#7F899F] hover:text-[#181D26] hover:border-[#D4952B] transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Category Selection with AI Auto-detect Badge */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="section-title text-[#7F899F]">Expense Category</label>
          {autoCatSuggestion && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2E8B57]">
              <Sparkles className="w-3 h-3" /> Auto-detected: {autoCatSuggestion}
            </span>
          )}
        </div>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Method & Date/Time Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="section-title text-[#7F899F]">Payment Mode</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
          >
            {paymentMethods.map(method => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="section-title text-[#7F899F]">Date & Time</label>
          <input
            type="datetime-local"
            value={transactionDate}
            onChange={e => setTransactionDate(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Flags: Unplanned & Credit Card Payment */}
      <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-2">
        <label className="flex items-center gap-2.5 text-xs text-[#3D4658] cursor-pointer">
          <input
            type="checkbox"
            checked={isUnplanned}
            onChange={e => setIsUnplanned(e.target.checked)}
            className="rounded accent-[#E06D53] w-4 h-4 cursor-pointer"
          />
          <span>Mark as <strong>Unplanned / Impulse Purchase</strong></span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-[#3D4658] cursor-pointer">
          <input
            type="checkbox"
            checked={isCreditCardPayment}
            onChange={e => setIsCreditCardPayment(e.target.checked)}
            className="rounded accent-[#2E8B57] w-4 h-4 cursor-pointer"
          />
          <span>Credit card bill payment (excluded from daily spending to prevent double count)</span>
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="section-title text-[#7F899F]">Notes (Optional)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Split with Rahul, Office lunch"
          className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-sm text-[#181D26] placeholder-[#9AA4B2] focus:outline-none focus:border-[#181D26] focus:bg-white transition-colors"
        />
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE8E0]">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary text-xs"
        >
          {initialData ? 'Update Transaction' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
};
