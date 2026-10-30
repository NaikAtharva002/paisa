import React, { useState } from 'react';
import { store } from '../lib/storage';
import { RecurringPayment, Frequency } from '../types';
import { formatINR } from '../lib/calculations';
import { CalendarDays, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const RecurringPage: React.FC = () => {
  const recurring = store.getRecurringPayments();
  const categories = store.getCategories();
  const profile = store.getProfile();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'all'>('upcoming');
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

  // Helper for brand logos (Reference 2)
  const getBrandLogo = (itemName: string) => {
    const lower = itemName.toLowerCase();
    if (lower.includes('jio')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#0F288E] text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          Jio
        </div>
      );
    }
    if (lower.includes('spotify')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#1DB954] text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          ♫
        </div>
      );
    }
    if (lower.includes('netflix')) {
      return (
        <div className="w-10 h-10 rounded-full bg-black text-[#E50914] text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          N
        </div>
      );
    }
    if (lower.includes('google')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#4285F4] text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          1
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] font-bold text-xs flex items-center justify-center flex-shrink-0">
        {itemName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      {/* Editorial Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Bills & Subscriptions</h2>
            <span className="tag tag-amber text-[10px]">
              {formatINR(totalMonthlyCost)}/month
            </span>
          </div>
          <p className="text-xs text-[#7F899F]">
            Keep recurring OTT, utility, and subscription expenses predictable and organized
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Upcoming / All Toggle (Reference 2) */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-[#EDE8E0] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeTab === 'upcoming' ? 'bg-[#181D26] text-white font-bold shadow-sm' : 'text-[#5E687D]'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeTab === 'all' ? 'bg-[#181D26] text-white font-bold shadow-sm' : 'text-[#5E687D]'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-primary text-xs px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Bills Cards List (Reference 2) */}
      <div className="rounded-3xl bg-white border border-[#EDE8E0] shadow-card divide-y divide-[#EDE8E0] overflow-hidden">
        {recurring.length === 0 ? (
          <div className="p-12 text-center text-[#7F899F] space-y-2">
            <CalendarDays className="w-8 h-8 mx-auto text-[#A4ADC0]" />
            <div className="text-sm font-bold text-[#181D26]">No recurring bills added yet</div>
            <p className="text-xs">Add your Netflix, Jio, rent, or gym subscriptions to stay ahead of renewal dates.</p>
          </div>
        ) : (
          recurring.map(item => {
            const dueDate = new Date(item.next_due_date);
            const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={item.id}
                className="p-5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {getBrandLogo(item.name)}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#181D26] truncate">{item.name}</div>
                    <div className="text-xs text-[#7F899F] mt-0.5 flex items-center gap-2">
                      <span className="text-[#D4952B] font-semibold">
                        Due {daysLeft > 0 ? `in ${daysLeft} days` : 'today'} ({new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dueDate)})
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.frequency}</span>
                      {item.auto_record && (
                        <>
                          <span>•</span>
                          <span className="text-[#2E8B57] font-medium">Auto-record</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-black font-mono-num text-[#181D26]">
                      {formatINR(item.amount)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRecordNow(item)}
                    className="px-4 py-1.5 rounded-full bg-[#181D26] hover:bg-[#2A3140] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Pay
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 text-[#A4ADC0] hover:text-[#E06D53] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Bill Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Recurring Payment / Subscription"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="section-title text-[#7F899F]">Service / Subscription Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jio Fiber, Spotify, Netflix, Rent, Cult.fit"
              className="input-field mt-1 text-xs"
            />
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Amount (INR ₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 499"
              className="input-field mt-1 text-xs font-mono-num font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-title text-[#7F899F]">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as Frequency)}
                className="input-field mt-1 text-xs"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="section-title text-[#7F899F]">Next Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="input-field mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="input-field mt-1 text-xs"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <label className="flex items-center gap-2.5 text-xs text-[#3D4658] cursor-pointer">
              <input
                type="checkbox"
                checked={autoRecord}
                onChange={e => setAutoRecord(e.target.checked)}
                className="rounded accent-[#D4952B] w-4 h-4 cursor-pointer"
              />
              <span>Automatically log completed spend on due date</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              Save Subscription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
