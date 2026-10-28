import React, { useState } from 'react';
import { store } from '../lib/storage';
import { RecurringPayment, Frequency } from '../types';
import { formatINR } from '../lib/calculations';
import { CalendarDays, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const RecurringPage: React.FC = () => {
  const recurring = store.getRecurringPayments();
  const categories = store.getCategories();
  const profile = store.getProfile();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('cat_subscriptions');
  const [autoRecord, setAutoRecord] = useState(false);

  // Compute estimated total monthly recurring commitment
  const totalMonthlyCost = recurring.reduce((sum, item) => {
    if (!item.is_active) return sum;
    switch (item.frequency) {
      case 'weekly':
        return sum + (item.amount * 52) / 12;
      case 'quarterly':
        return sum + item.amount / 3;
      case 'yearly':
        return sum + item.amount / 12;
      case 'monthly':
      default:
        return sum + item.amount;
    }
  }, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!name.trim() || isNaN(numAmt) || numAmt <= 0) return;

    store.addRecurringPayment({
      id: `rec_${Date.now()}`,
      user_id: profile.user_id,
      name: name.trim(),
      amount: numAmt,
      frequency,
      next_due_date: dueDate || new Date().toISOString().slice(0, 10),
      category_id: categoryId,
      auto_record: autoRecord,
      is_active: true,
    });

    setIsAddOpen(false);
    setName('');
    setAmount('');
    setAutoRecord(false);
  };

  const handleDelete = (id: string, itemName: string) => {
    if (confirm(`Remove recurring expense "${itemName}"?`)) {
      store.deleteRecurringPayment(id);
    }
  };

  const handleRecordNow = (item: RecurringPayment) => {
    if (confirm(`Record today's payment of ${formatINR(item.amount)} for ${item.name}?`)) {
      store.addTransaction({
        user_id: profile.user_id,
        transaction_date: new Date().toISOString(),
        merchant: item.name,
        amount: item.amount,
        transaction_type: 'expense',
        category_id: item.category_id,
        payment_method: 'Net banking',
        is_recurring: true,
        notes: `Confirmed recurring payment (${item.frequency})`,
      });
      alert(`Recorded ${item.name} expense! Your dashboard has updated.`);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header card with total commitment */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <span>Recurring Bills & Subscriptions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Fixed monthly drain on your salary before you even start spending daily cash.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Estimated Monthly Drain</div>
            <div className="text-2xl font-extrabold text-white font-mono-num">
              {formatINR(totalMonthlyCost)}
            </div>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Safety notice as required by Section 3.I */}
      <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Paisa Safety Rule:</strong> Recurring reminders never auto-deduct funds from your bank account or create silent transactions without your explicit approval.
        </span>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {recurring.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-sm text-slate-100">{item.name}</div>
                <div className="text-xs text-slate-400 capitalize mt-0.5">
                  {item.frequency} • Next due: <strong className="text-slate-300">{item.next_due_date}</strong>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-slate-100 font-mono-num">
                  {formatINR(item.amount)}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                  {item.frequency}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleRecordNow(item)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Record payment today</span>
              </button>

              <button
                onClick={() => handleDelete(item.id, item.name)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"
                title="Delete recurring payment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-100 mb-3">Add Recurring Subscription / Bill</h4>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Netflix, Rent, Cult.fit, Broadband"
                  required
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Amount (INR)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="649"
                    required
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as Frequency)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white capitalize"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Next Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Category</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
