import React, { useState } from 'react';
import { SavingsGoal } from '../../types';
import { store } from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { PiggyBank, Plus, CheckCircle2, ShieldCheck, Laptop, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal } from '../common/Modal';

export const SavingsGoalsList: React.FC = () => {
  const goals = store.getSavingsGoals();
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New goal form
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDate, setNewDate] = useState('2026-12-31');

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

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-400" />
            <span>Savings Goals & Targets</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Convert daily budget surpluses into real financial cushions
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary text-xs px-3.5 py-1.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
          const isCompleted = goal.current_amount >= goal.target_amount;

          return (
            <div
              key={goal.id}
              className="p-4 rounded-xl bg-[#06091A] border border-white/[0.06] hover:border-white/[0.14] transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{goal.name}</div>
                      <div className="text-[10px] text-slate-500">Target: {goal.target_date}</div>
                    </div>
                  </div>
                  {isCompleted && (
                    <span className="tag tag-green text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-emerald-400 font-bold">{formatINR(goal.current_amount)}</span>
                    <span className="text-slate-500">of {formatINR(goal.target_amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#0D1426] rounded-full overflow-hidden border border-white/[0.04]">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono-num">{pct}% reached</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGoal(goal)}
                className="w-full py-1.5 rounded-lg bg-[#111827] hover:bg-[#1A2340] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-colors"
              >
                + Add Deposit
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL: Deposit into Goal */}
      <Modal
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal ? `Deposit to ${selectedGoal.name}` : ''}
      >
        {selectedGoal && (
          <div className="space-y-4">
            <div>
              <label className="section-title text-slate-400">Deposit Amount (₹)</label>
              <input
                type="number"
                min="1"
                required
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="e.g. 2000"
                className="input-field mt-1 text-lg font-bold font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedGoal(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeposit(selectedGoal)}
                className="btn-primary text-xs"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Add New Goal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Savings Goal"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="section-title text-slate-400">Goal Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Emergency Fund, New Laptop, Goa Trip"
              className="input-field mt-1 text-xs"
            />
          </div>

          <div>
            <label className="section-title text-slate-400">Target Amount (₹)</label>
            <input
              type="number"
              min="100"
              required
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              placeholder="e.g. 50000"
              className="input-field mt-1 text-xs font-mono-num"
            />
          </div>

          <div>
            <label className="section-title text-slate-400">Target Completion Date</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="input-field mt-1 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
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
              Create Goal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
