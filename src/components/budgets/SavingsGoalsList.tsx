import React, { useState } from 'react';
import { SavingsGoal } from '../../types';
import { store } from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { PiggyBank, Plus, CheckCircle2, ShieldCheck, Flame, Laptop, Palmtree, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

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
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-400" />
            <span>Savings Goals & Challenges</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Turn your daily budget savings into real financial freedom
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {goals.map(goal => {
          const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
          const isComplete = goal.current_amount >= goal.target_amount;

          return (
            <div
              key={goal.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
                    <span>{goal.name}</span>
                    {isComplete && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Achieved!
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono-num">
                    {progress}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-1">
                  Target date: {goal.target_date}
                </div>
              </div>

              {/* Progress track */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isComplete ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-300">
                  <span>Current: <strong>{formatINR(goal.current_amount, false)}</strong></span>
                  <span className="text-slate-400">Target: {formatINR(goal.target_amount, false)}</span>
                </div>
              </div>

              {/* Quick deposit button */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                {selectedGoal?.id === goal.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      placeholder="Add ₹"
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num"
                      autoFocus
                    />
                    <button
                      onClick={() => handleDeposit(goal)}
                      className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setSelectedGoal(null)}
                      className="text-xs text-slate-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedGoal(goal)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Contribute surplus to goal</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-100 mb-3">Create New Savings Goal</h4>
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Goal Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Goa Trip, iPhone, Emergency Fund"
                  required
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Target Amount (INR)</label>
                <input
                  type="number"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  placeholder="e.g. 50000"
                  required
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-mono-num"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Target Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
