import React, { useState } from 'react';
import { store } from '../lib/storage';
import { RecurringPayment, Frequency } from '../types';
import { formatINR, advanceNextDueDate, roundPaise } from '../lib/calculations';
import { CalendarDays, Plus, Trash2, Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { BillPayModal } from '../components/common/BillPayModal';

export const RecurringPage: React.FC = () => {
  const recurring = store.getRecurringPayments();
  const categories = store.getCategories();
  const profile = store.getProfile();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'all'>('upcoming');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringPayment | null>(null);
  const [payingBill, setPayingBill] = useState<RecurringPayment | null>(null);

  // Form states
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

  const handleOpenAdd = () => {
    setName('');
    setAmount('');
    setFrequency('monthly');
    setDueDate(new Date().toISOString().slice(0, 10));
    setCategoryId('cat_subscriptions');
    setAutoRecord(false);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: RecurringPayment) => {
    setEditingItem(item);
    setName(item.name);
    setAmount(String(item.amount));
    setFrequency(item.frequency);
    setDueDate(item.next_due_date);
    setCategoryId(item.category_id);
    setAutoRecord(item.auto_record);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = roundPaise(parseFloat(amount));
    if (!name.trim() || isNaN(numAmt) || numAmt <= 0) {
      alert('Please enter a valid bill name and amount greater than 0.');
      return;
    }

    if (editingItem) {
      store.updateRecurringPayment(editingItem.id, {
        name: name.trim(),
        amount: numAmt,
        frequency,
        next_due_date: dueDate || editingItem.next_due_date,
        category_id: categoryId,
        auto_record: autoRecord,
      });
      setEditingItem(null);
    } else {
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
    }

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
    if (confirm(`Record payment of ${formatINR(item.amount)} for ${item.name}?`)) {
      // 1. Add expense transaction
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

      // 2. Advance due date to the next cycle so it is no longer overdue!
      const nextDue = advanceNextDueDate(item.next_due_date, item.frequency);
      store.updateRecurringPayment(item.id, { next_due_date: nextDue });

      alert(`Recorded payment! Next due date advanced to ${nextDue}.`);
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
        <div className="w-10 h-10 rounded-full bg-[#E50914] text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          N
        </div>
      );
    }
    if (lower.includes('google')) {
      return (
        <div className="w-10 h-10 rounded-full bg-white border border-[#EDE8E0] text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-[#4285F4]">1</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-[#181D26] text-xs font-bold flex items-center justify-center flex-shrink-0">
        {itemName.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  // Calculate days until next due
  const getDaysUntilDue = (dateStr: string) => {
    const due = new Date(dateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sortedRecurring = [...recurring].sort((a, b) => {
    return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
  });

  const displayedList = activeTab === 'upcoming'
    ? sortedRecurring.filter(item => getDaysUntilDue(item.next_due_date) <= 30)
    : sortedRecurring;

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      {/* Top Banner & Summary (Reference 2) */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#181D26] tracking-tight">
            Bills & Subscriptions
          </h2>
          <p className="text-xs text-[#7F899F] mt-0.5">
            Auto-track recurring commitments to safeguard your daily spendable allowance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Upcoming / All Toggle (Reference 2) */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-[#EDE8E0] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-[#181D26] text-white font-bold shadow-sm'
                  : 'text-[#5E687D]'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeTab === 'all'
                  ? 'bg-[#181D26] text-white font-bold shadow-sm'
                  : 'text-[#5E687D]'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Monthly Recurring Commitment KPI */}
      <div className="p-5 rounded-2xl bg-[#FCF8EE] border border-[#EBD7AF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EBD7AF] flex items-center justify-center text-[#D4952B] shadow-xs">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#8C5D17]">
              Total Monthly Recurring Outflow
            </div>
            <div className="text-[11px] text-[#A67527] mt-0.5">
              Factor in {recurring.filter(r => r.is_active).length} active fixed subscriptions
            </div>
          </div>
        </div>
        <div className="text-xl font-black font-mono-num text-[#8C5D17]">
          {formatINR(totalMonthlyCost)}/month
        </div>
      </div>

      {/* Branded Recurring Bills List (Reference 2) */}
      <div className="space-y-3">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] text-slate-400 text-xs">
            No bills in this tab. Click "Add Bill" to track new recurring expenses!
          </div>
        ) : (
          displayedList.map(item => {
            const daysDiff = getDaysUntilDue(item.next_due_date);
            const isDueSoon = daysDiff <= 3 && daysDiff >= 0;
            const isOverdue = daysDiff < 0;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {getBrandLogo(item.name)}

                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#181D26] truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[#7F899F] flex items-center gap-2 mt-0.5">
                      <span className={isOverdue ? 'text-[#E06D53] font-bold' : isDueSoon ? 'text-[#D4952B] font-bold' : 'text-[#7F899F]'}>
                        {isOverdue
                          ? `Overdue by ${Math.abs(daysDiff)} days`
                          : daysDiff === 0
                          ? 'Due today'
                          : `Due in ${daysDiff} days`}
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

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-black font-mono-num text-[#181D26]">
                      {formatINR(item.amount)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPayingBill(item)}
                    aria-label={`Pay ${item.name}`}
                    className="px-4 py-1.5 rounded-full bg-[#181D26] hover:bg-[#2A3140] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Pay
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-[#7F899F] hover:text-[#181D26] rounded-lg transition-colors"
                    title="Edit bill"
                  >
                    <Edit2 className="w-4 h-4" />
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

      {/* Add / Edit Bill Modal */}
      <Modal
        isOpen={isAddOpen || !!editingItem}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? `Edit ${editingItem.name}` : 'Add Recurring Payment / Subscription'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="section-title text-[#7F899F]">Service / Subscription Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jio Fiber, Spotify, Netflix, Rent, Cult.fit"
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] focus:bg-white focus:outline-none focus:border-[#181D26]"
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
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-mono-num font-bold text-[#181D26] focus:bg-white focus:outline-none focus:border-[#181D26]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-title text-[#7F899F]">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as Frequency)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26] focus:bg-white focus:outline-none focus:border-[#181D26]"
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
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26] focus:bg-white focus:outline-none focus:border-[#181D26]"
              />
            </div>
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-semibold text-[#181D26] focus:bg-white focus:outline-none focus:border-[#181D26]"
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
              onClick={() => {
                setIsAddOpen(false);
                setEditingItem(null);
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              {editingItem ? 'Update Subscription' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* UPI Deep Link & Payment Settlement Modal */}
      <BillPayModal
        bill={payingBill}
        isOpen={!!payingBill}
        onClose={() => setPayingBill(null)}
      />
    </div>
  );
};
