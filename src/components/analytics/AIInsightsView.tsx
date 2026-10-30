import React, { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';

interface AIInsightItem {
  id: string;
  type: 'insights' | 'suggestions' | 'alerts';
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  title: string;
  body: string;
  action: string;
}

export const AIInsightsView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'insights' | 'suggestions' | 'alerts'>('all');
  const transactions = store.getTransactions();
  const profile = store.getProfile();
  const recurring = store.getRecurringPayments();
  const goals = store.getSavingsGoals();
  const categories = store.getCategories();
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const now = new Date();
  const currentMonthPrefix = now.toISOString().slice(0, 7);

  // Month-to-date expenses
  const mtdExpenses = transactions.filter(
    t => isSpendingExpense(t) && t.transaction_date.startsWith(currentMonthPrefix)
  );
  const totalSpent = mtdExpenses.reduce((s, t) => s + t.amount, 0);

  const mtdIncome = transactions
    .filter(t => t.transaction_type === 'income' && t.transaction_date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + t.amount, 0) || profile.monthly_income;

  // 1. Category Velocity Calculation
  const catSpendMap = new Map<string, number>();
  mtdExpenses.forEach(t => {
    catSpendMap.set(t.category_id, (catSpendMap.get(t.category_id) || 0) + t.amount);
  });

  let topCategoryName = 'Food & Dining';
  let topCategoryAmount = 0;
  catSpendMap.forEach((amt, catId) => {
    if (amt > topCategoryAmount) {
      topCategoryAmount = amt;
      topCategoryName = catMap.get(catId) || 'Food & Dining';
    }
  });

  const topCategoryPct = totalSpent > 0 ? Math.round((topCategoryAmount / totalSpent) * 100) : 0;

  // 2. Unplanned Purchases
  const unplannedExpenses = mtdExpenses.filter(t => t.is_unplanned);
  const unplannedTotal = unplannedExpenses.reduce((s, t) => s + t.amount, 0);
  const unplannedPct = totalSpent > 0 ? Math.round((unplannedTotal / totalSpent) * 100) : 0;

  // 3. Subscriptions Total
  const activeSubs = recurring.filter(r => r.is_active);
  const monthlySubsTotal = activeSubs.reduce((sum, item) => {
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

  // 4. Savings rate
  const savingsRate = mtdIncome > 0 ? Math.max(0, Math.round(((mtdIncome - totalSpent) / mtdIncome) * 100)) : 0;
  const primaryGoal = goals.find(g => g.current_amount < g.target_amount) || goals[0];

  const insightsList: AIInsightItem[] = [];

  if (mtdExpenses.length < 2) {
    insightsList.push({
      id: 'ins_baseline',
      type: 'suggestions',
      icon: Sparkles,
      color: '#D4952B',
      bg: 'bg-[#FEF8EA]',
      border: 'border-[#FCEECB]',
      title: 'Building Your Spending Baseline',
      body: 'Paisa needs at least 2 to 3 recorded purchases this month to calculate statistical patterns and actionable allowances.',
      action: 'Log Today\'s Spends',
    });
  } else {
    // Alert: Heavy category spend
    if (topCategoryPct >= 25) {
      insightsList.push({
        id: 'ins_top_cat',
        type: 'alerts',
        icon: AlertTriangle,
        color: '#E06D53',
        bg: 'bg-[#FDF1EE]',
        border: 'border-[#FBDCD5]',
        title: `${topCategoryName} Pacing Velocity`,
        body: `${topCategoryName} accounts for ${topCategoryPct}% (${formatINR(topCategoryAmount)}) of your discretionary expenses this month. Consider setting a dedicated category ceiling.`,
        action: 'Adjust Category Budget',
      });
    }

    // Insight: Savings momentum
    insightsList.push({
      id: 'ins_savings',
      type: 'insights',
      icon: TrendingUp,
      color: '#2E8B57',
      bg: 'bg-[#EBF7EE]',
      border: 'border-[#D4EED9]',
      title: 'Monthly Savings Momentum',
      body: `Your current month-to-date savings rate is ${savingsRate}%. Retaining ${formatINR(Math.max(0, mtdIncome - totalSpent))} helps fund your ${primaryGoal ? primaryGoal.name : 'Emergency Fund'}.`,
      action: 'View Savings Goals',
    });

    // Suggestion: Recurring subscriptions
    if (activeSubs.length > 0) {
      insightsList.push({
        id: 'ins_subs',
        type: 'suggestions',
        icon: Lightbulb,
        color: '#8B5CF6',
        bg: 'bg-[#F4EEFF]',
        border: 'border-[#E9DEFF]',
        title: 'Recurring Commitments Audit',
        body: `You have ${activeSubs.length} active recurring commitments totaling ${formatINR(monthlySubsTotal)}/month. Regularly audit auto-debits to prune services you no longer use.`,
        action: 'Review Subscriptions',
      });
    }

    // Suggestion: Impulse purchases
    if (unplannedExpenses.length > 0) {
      insightsList.push({
        id: 'ins_unplanned',
        type: 'suggestions',
        icon: Sparkles,
        color: '#D4952B',
        bg: 'bg-[#FEF8EA]',
        border: 'border-[#FCEECB]',
        title: 'Impulse Spending Pattern',
        body: `You logged ${unplannedExpenses.length} unplanned purchase(s) totaling ${formatINR(unplannedTotal)} (${unplannedPct}% of total spend). Adding a 10-minute pause before quick-commerce orders keeps buffers safe.`,
        action: 'View Unplanned Items',
      });
    }
  }

  const filtered = filter === 'all' ? insightsList : insightsList.filter(i => i.type === filter);

  return (
    <div className="space-y-5 animate-in max-w-4xl mx-auto">
      {/* Editorial Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EEFF] text-[#8B5CF6] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PAISA Financial Intelligence</span>
          </div>
          <h2 className="text-2xl font-black text-[#181D26] tracking-tight">
            AI Insights & Strategy
          </h2>
          <p className="text-xs text-[#5E687D] mt-1">
            Personalized, non-judgmental financial recommendations derived from your actual UPI transactions
          </p>
        </div>
      </div>

      {/* Filter Tabs (Reference 2) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-[#181D26] text-white shadow-sm'
              : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
          }`}
        >
          All Insights ({insightsList.length})
        </button>
        <button
          onClick={() => setFilter('insights')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'insights'
              ? 'bg-[#181D26] text-white shadow-sm'
              : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
          }`}
        >
          Insights
        </button>
        <button
          onClick={() => setFilter('suggestions')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'suggestions'
              ? 'bg-[#181D26] text-white shadow-sm'
              : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setFilter('alerts')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'alerts'
              ? 'bg-[#181D26] text-white shadow-sm'
              : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
          }`}
        >
          Alerts
        </button>
      </div>

      {/* Insights Cards List (Reference 2) */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] text-slate-400 text-xs">
            No insights in this category right now. Your spending is looking steady!
          </div>
        ) : (
          filtered.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-bold text-[#181D26]">{item.title}</div>
                    <p className="text-xs text-[#5E687D] leading-relaxed">{item.body}</p>
                  </div>
                </div>

                <div className="self-end sm:self-center flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#262D3B] shadow-xs">
                    <span>{item.action}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4952B]" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
