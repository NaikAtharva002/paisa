import React, { useState } from 'react';
import { SavingsGoal } from '../../types';
import { store } from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { Plus, CheckCircle2, Laptop, Palmtree, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal } from '../common/Modal';

export const SavingsGoalsList: React.FC = () => {
  const goals = store.getSavingsGoals();
  const [filterTab, setFilterTab] = useState<'active' | 'completed'>('active');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New goal form
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDate, setNewDate] = useState('2026-12-31');

  const filteredGoals = goals.filter(g => {
    const isCompleted = g.current_amount >= g.target_amount;
    return filterTab === 'completed' ? isCompleted : !isCompleted;
  });

  const handleDeposit = (goal: SavingsGoal) => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    const newAmount = goal.current_amount + val;
    store.updateSavingsGoal(goal.id, { current_amount: newAmount });

    if (newAmount >= goal.target_amount) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {}
    }

    setSelectedGoal(null);
    setDepositAmount('');
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newTarget);
    if (!newName.trim() || isNaN(target) || target <= 0) return;

    const profile = store.getProfile();
    store.addSavingsGoal({
      id: `goal_${Date.now()}`,
      user_id: profile.user_id,
      name: newName.trim(),
      target_amount: target,
      current_amount: 0,
      target_date: newDate,
      icon: 'PiggyBank',
      category: 'general',
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewTarget('');
  };

  const getGoalIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('laptop') || lower.includes('macbook')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#EEF5FF] text-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <Laptop className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('trip') || lower.includes('europe') || lower.includes('vacation')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#FEF8EA] text-[#D4952B] flex items-center justify-center flex-shrink-0">
          <Palmtree className="w-5 h-5" />
        </div>
      );
    }
    if (lower.includes('emergency')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#2E8B57] flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-[#F4EEFF] text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      {/* Header & Tabs */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#181D26] tracking-tight">Savings Goals</h2>
          <p className="text-xs text-[#7F899F] mt-0.5">Turn daily budget discipline into milestone achievements</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active / Completed Toggle (Reference 2) */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-[#EDE8E0] text-xs font-semibold">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                filterTab === 'active' ? 'bg-[#181D26] text-white font-bold shadow-sm' : 'text-[#5E687D]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                filterTab === 'completed' ? 'bg-[#181D26] text-white font-bold shadow-sm' : 'text-[#5E687D]'
              }`}
            >
              Completed
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary text-xs px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Goal Cards Grid (Reference 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] text-slate-400">
            No {filterTab} goals found. Tap "New Goal" to create your next financial milestone!
          </div>
        ) : (
          filteredGoals.map(goal => {
            const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const isDone = goal.current_amount >= goal.target_amount;

            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getGoalIcon(goal.name)}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#181D26] truncate">{goal.name}</div>
                        <div className="text-[11px] text-[#7F899F] mt-0.5">Target by {goal.target_date}</div>
                      </div>
                    </div>

                    {isDone && (
                      <span className="tag tag-green text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Reached
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono-num font-bold">
                      <span className="text-[#181D26]">{formatINR(goal.current_amount)}</span>
                      <span className="text-[#7F899F] font-normal">of {formatINR(goal.target_amount)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#F5F2EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D4952B] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono-num font-bold text-[#5E687D] w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EDE8E0] flex items-center justify-between">
                  <span className="text-[11px] text-[#7F899F]">
                    {isDone ? 'Goal completed 🎉' : `${formatINR(goal.target_amount - goal.current_amount)} left to save`}
                  </span>
                  <button
                    onClick={() => setSelectedGoal(goal)}
                    className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] hover:border-[#D4952B] hover:text-[#D4952B] text-xs font-bold text-[#262D3B] transition-colors shadow-sm"
                  >
                    + Deposit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal ? `Deposit to ${selectedGoal.name}` : ''}
      >
        {selectedGoal && (
          <div className="space-y-4">
            <div>
              <label className="section-title text-[#7F899F]">Deposit Amount (INR ₹)</label>
              <input
                type="number"
                min="1"
                required
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="input-field mt-1 text-lg font-bold font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSelectedGoal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={() => handleDeposit(selectedGoal)} className="btn-primary text-xs">
                Confirm Deposit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Goal Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Savings Goal"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="section-title text-[#7F899F]">Goal Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. New Laptop, Europe Trip, Emergency Fund"
              className="input-field mt-1 text-xs"
            />
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Target Amount (₹)</label>
            <input
              type="number"
              min="100"
              required
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              placeholder="e.g. 80000"
              className="input-field mt-1 text-xs font-mono-num"
            />
          </div>

          <div>
            <label className="section-title text-[#7F899F]">Target Date</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="input-field mt-1 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              Save Goal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
