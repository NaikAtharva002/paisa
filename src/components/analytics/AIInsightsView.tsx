import React, { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense } from '../../lib/calculations';

export const AIInsightsView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'insights' | 'suggestions' | 'alerts'>('all');
  const transactions = store.getTransactions();
  const profile = store.getProfile();

  const currentMonthTxs = transactions.filter(t => isSpendingExpense(t));
  const totalSpent = currentMonthTxs.reduce((s, t) => s + t.amount, 0);

  const insightsList = [
    {
      id: '1',
      type: 'alerts',
      icon: AlertTriangle,
      color: '#E06D53',
      bg: 'bg-[#FDF1EE]',
      border: 'border-[#FBDCD5]',
      title: 'Food & Dining Spending Velocity',
      body: 'You spent 32% more on quick-commerce and dining this month compared to your baseline. Consider setting a dedicated dining budget.',
      action: 'Set Category Cap',
    },
    {
      id: '2',
      type: 'insights',
      icon: TrendingUp,
      color: '#2E8B57',
      bg: 'bg-[#EBF7EE]',
      border: 'border-[#D4EED9]',
      title: 'Consistent Savings Momentum',
      body: `Great job! Your projected savings rate increased by 22% this month. At this rate, your Emergency Fund target will be reached 40 days early.`,
      action: 'View Savings Goals',
    },
    {
      id: '3',
      type: 'suggestions',
      icon: Lightbulb,
      color: '#8B5CF6',
      bg: 'bg-[#F4EEFF]',
      border: 'border-[#E9DEFF]',
      title: 'Recurring Subscriptions Audit',
      body: 'You have 3 active subscriptions totaling ₹748/month. Review whether services like OTT and cloud storage are actively utilized.',
      action: 'Review Subscriptions',
    },
    {
      id: '4',
      type: 'suggestions',
      icon: Sparkles,
      color: '#D4952B',
      bg: 'bg-[#FEF8EA]',
      border: 'border-[#FCEECB]',
      title: 'UPI Daily Allowance Calibration',
      body: 'Small impulse UPI purchases between 4 PM and 7 PM account for 28% of discretionary daily spends. Consider capping evening spends at ₹300.',
      action: 'Adjust Daily Target',
    },
  ];

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
          All Insights
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

      {/* Structured Insight Cards (Reference 2) */}
      <div className="space-y-3.5">
        {filtered.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-5 rounded-2xl bg-white border ${card.border} shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                  style={{ color: card.color }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#181D26]">{card.title}</h3>
                  <p className="text-xs text-[#5E687D] mt-1 leading-relaxed max-w-xl">
                    {card.body}
                  </p>
                </div>
              </div>

              <div className="self-end sm:self-center flex-shrink-0">
                <span className="text-xs font-bold text-[#D4952B] flex items-center gap-1 hover:underline cursor-pointer">
                  <span>{card.action}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
