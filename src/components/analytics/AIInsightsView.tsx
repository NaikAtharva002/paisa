import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  X,
  Info,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { store } from '../../lib/storage';
import {
  formatINR,
  isSpendingExpense,
  compareMonthlySpending,
  calculateEssentialDiscretionarySplit,
} from '../../lib/calculations';
import { calculateMonthEndForecast } from '../../lib/forecasting';

export interface AIInsightItem {
  id: string;
  type: 'insights' | 'suggestions' | 'alerts';
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  title: string;
  body: string;
  action: string;
  supportingData: {
    period: string;
    metric: string;
    calculationTrace: string;
  };
}

export const AIInsightsView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'insights' | 'suggestions' | 'alerts'>('all');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  const transactions = store.getTransactions();
  const profile = store.getProfile();
  const recurring = store.getRecurringPayments();
  const goals = store.getSavingsGoals();
  const categories = store.getCategories();
  const categoryBudgets = store.getCategoryBudgets();
  const dismissedIds = store.getDismissedInsights();
  const isAiEnabled = store.getAIInsightsEnabled();

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

  // 5. Month-over-Month Comparison
  const momComparison = compareMonthlySpending(transactions, currentMonthPrefix);

  // 6. Essential vs Discretionary
  const split = calculateEssentialDiscretionarySplit(mtdExpenses);

  // 7. Spending Forecast
  const forecast = calculateMonthEndForecast({
    transactions,
    recurringPayments: recurring,
    profile,
    categoryBudgets,
    currentDate: now,
  });

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
      body: 'Paisa needs at least 2 to 3 recorded purchases this month to calculate statistical run-rates and actionable allowances.',
      action: 'Log Spends',
      supportingData: {
        period: currentMonthPrefix,
        metric: `${mtdExpenses.length} transaction(s) recorded`,
        calculationTrace: 'Formula: Transactions >= 2 required to compute statistical daily variance.',
      },
    });
  } else {
    // 1. Forecast / Run-Rate Alert
    if (forecast.status === 'sufficient_data') {
      if (forecast.riskLevel === 'critical' || forecast.riskLevel === 'high') {
        insightsList.push({
          id: 'ins_forecast_warning',
          type: 'alerts',
          icon: AlertTriangle,
          color: '#E06D53',
          bg: 'bg-[#FDF1EE]',
          border: 'border-[#FBDCD5]',
          title: 'Projected Budget Overrun Warning',
          body: forecast.explanatoryMessage,
          action: 'Inspect Pacing',
          supportingData: {
            period: currentMonthPrefix,
            metric: `Projected spend: ${formatINR(forecast.projectedMonthEndSpent)} vs Budget: ${formatINR(forecast.monthlyBudget)}`,
            calculationTrace: forecast.methodologyNotes,
          },
        });
      } else {
        insightsList.push({
          id: 'ins_forecast_ontrack',
          type: 'insights',
          icon: TrendingUp,
          color: '#2E8B57',
          bg: 'bg-[#EBF7EE]',
          border: 'border-[#D4EED9]',
          title: 'Projected Month-End Savings',
          body: `You are projected to finish the month at ${formatINR(forecast.projectedMonthEndSpent)}, on track to retain ${formatINR(forecast.projectedSavings)} in savings.`,
          action: 'View Projection',
          supportingData: {
            period: currentMonthPrefix,
            metric: `Run-rate: ${formatINR(forecast.dailyRunRate)}/day × ${forecast.daysRemaining} days left`,
            calculationTrace: forecast.methodologyNotes,
          },
        });
      }
    }

    // 2. Alert: Heavy Category Spend
    if (topCategoryPct >= 25) {
      insightsList.push({
        id: 'ins_top_cat',
        type: 'alerts',
        icon: AlertTriangle,
        color: '#E06D53',
        bg: 'bg-[#FDF1EE]',
        border: 'border-[#FBDCD5]',
        title: `${topCategoryName} Pacing Velocity`,
        body: `${topCategoryName} accounts for ${topCategoryPct}% (${formatINR(topCategoryAmount)}) of your total spending this month. Consider setting a dedicated category ceiling.`,
        action: 'Adjust Budget',
        supportingData: {
          period: currentMonthPrefix,
          metric: `${formatINR(topCategoryAmount)} spent out of ${formatINR(totalSpent)} (${topCategoryPct}%)`,
          calculationTrace: `Category Sum(${topCategoryName}) / Total Spending (${formatINR(totalSpent)}) = ${topCategoryPct}%`,
        },
      });
    }

    // 3. Month-over-Month Change
    if (momComparison.hasPreviousData && Math.abs(momComparison.deltaAmount) > 500) {
      const isIncrease = momComparison.deltaAmount > 0;
      insightsList.push({
        id: 'ins_mom_trend',
        type: isIncrease ? 'alerts' : 'insights',
        icon: isIncrease ? AlertTriangle : TrendingUp,
        color: isIncrease ? '#D4952B' : '#2E8B57',
        bg: isIncrease ? 'bg-[#FEF8EA]' : 'bg-[#EBF7EE]',
        border: isIncrease ? 'border-[#FCEECB]' : 'border-[#D4EED9]',
        title: isIncrease ? 'Spending Increased vs Last Month' : 'Spending Decreased vs Last Month',
        body: `You have spent ${formatINR(Math.abs(momComparison.deltaAmount))} (${Math.abs(momComparison.percentageChange)}%) ${isIncrease ? 'more' : 'less'} compared to the same period in ${momComparison.previousPeriodKey}.`,
        action: 'Compare Periods',
        supportingData: {
          period: `${momComparison.previousPeriodKey} vs ${momComparison.currentPeriodKey}`,
          metric: `${formatINR(momComparison.currentSpending)} (Current) vs ${formatINR(momComparison.previousSpending)} (Previous)`,
          calculationTrace: `Delta = ${formatINR(momComparison.currentSpending)} - ${formatINR(momComparison.previousSpending)} = ${formatINR(momComparison.deltaAmount)} (${momComparison.percentageChange}%)`,
        },
      });
    }

    // 4. Essential vs Discretionary Discipline
    if (split.totalSpending > 0) {
      insightsList.push({
        id: 'ins_essential_split',
        type: 'insights',
        icon: ShieldCheck,
        color: '#3B82F6',
        bg: 'bg-[#EFF6FF]',
        border: 'border-[#DBEAFE]',
        title: 'Needs vs Wants Balance',
        body: `${split.essentialPercentage}% of your spending (${formatINR(split.essentialTotal)}) went towards core essentials (Groceries, Bills, Rent, Health), and ${split.discretionaryPercentage}% (${formatINR(split.discretionaryTotal)}) towards discretionary lifestyle.`,
        action: 'View Split',
        supportingData: {
          period: currentMonthPrefix,
          metric: `Essential: ${formatINR(split.essentialTotal)} (${split.essentialPercentage}%) | Discretionary: ${formatINR(split.discretionaryTotal)} (${split.discretionaryPercentage}%)`,
          calculationTrace: 'Categories classified into Essential (Groceries, Rent, Bills, Health) and Discretionary (Dining, Shopping, Entertainment, Travel).',
        },
      });
    }

    // 5. Suggestion: Recurring Subscriptions Audit
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
        action: 'Review Bills',
        supportingData: {
          period: 'Monthly Recurring',
          metric: `${activeSubs.length} active bills totaling ${formatINR(monthlySubsTotal)}/month`,
          calculationTrace: activeSubs.map(s => `${s.name}: ${formatINR(s.amount)} (${s.frequency})`).join(', '),
        },
      });
    }

    // 6. Suggestion: Impulse Purchases
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
        action: 'View Unplanned',
        supportingData: {
          period: currentMonthPrefix,
          metric: `${unplannedExpenses.length} purchases totaling ${formatINR(unplannedTotal)} (${unplannedPct}% of spend)`,
          calculationTrace: unplannedExpenses.map(u => `${u.merchant}: ${formatINR(u.amount)}`).slice(0, 4).join(', '),
        },
      });
    }
  }

  // Filter dismissed insights and active tab filter
  const visibleInsights = insightsList.filter(i => !dismissedIds.includes(i.id));
  const filtered = filter === 'all' ? visibleInsights : visibleInsights.filter(i => i.type === filter);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.dismissInsight(id);
  };

  const handleToggleAi = () => {
    store.setAIInsightsEnabled(!isAiEnabled);
  };

  const handleFeedback = (id: string, rating: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedbackGiven(prev => ({ ...prev, [id]: rating }));
  };

  return (
    <div className="space-y-5 animate-in max-w-4xl mx-auto">
      {/* Editorial Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-[#EDE8E0] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EEFF] text-[#8B5CF6] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PAISA Financial Intelligence</span>
          </div>
          <h2 className="text-2xl font-black text-[#181D26] tracking-tight">
            AI Insights & Financial Strategy
          </h2>
          <p className="text-xs text-[#5E687D] mt-1">
            Deterministic, explainable financial patterns calculated purely from your local transaction records
          </p>
        </div>

        {/* Master AI Opt-in Toggle */}
        <div className="flex items-center gap-3 bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#EDE8E0] self-start sm:self-center">
          <span className="text-xs font-bold text-[#181D26]">Insights Engine</span>
          <button
            onClick={handleToggleAi}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
              isAiEnabled ? 'bg-[#2E8B57]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {!isAiEnabled ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] space-y-3">
          <Sliders className="w-8 h-8 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-[#181D26]">AI Insights are Currently Disabled</h3>
          <p className="text-xs text-[#5E687D] max-w-md mx-auto">
            You can re-enable the financial intelligence engine at any time using the toggle above.
          </p>
          <button
            onClick={() => store.setAIInsightsEnabled(true)}
            className="px-4 py-2 rounded-xl bg-[#181D26] text-white text-xs font-bold shadow-xs hover:bg-slate-800"
          >
            Enable Insights
          </button>
        </div>
      ) : (
        <>
          {/* Filter Tabs & Reset Action */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-[#181D26] text-white shadow-xs'
                    : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
                }`}
              >
                All Active ({visibleInsights.length})
              </button>
              <button
                onClick={() => setFilter('insights')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === 'insights'
                    ? 'bg-[#181D26] text-white shadow-xs'
                    : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
                }`}
              >
                Insights
              </button>
              <button
                onClick={() => setFilter('suggestions')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === 'suggestions'
                    ? 'bg-[#181D26] text-white shadow-xs'
                    : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
                }`}
              >
                Suggestions
              </button>
              <button
                onClick={() => setFilter('alerts')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === 'alerts'
                    ? 'bg-[#181D26] text-white shadow-xs'
                    : 'bg-white text-[#5E687D] border border-[#EDE8E0] hover:border-[#DFD7C7]'
                }`}
              >
                Alerts
              </button>
            </div>

            {dismissedIds.length > 0 && (
              <button
                onClick={() => store.clearDismissedInsights()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#5E687D] hover:text-[#181D26] hover:bg-slate-100 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore ({dismissedIds.length}) Dismissed</span>
              </button>
            )}
          </div>

          {/* Insights Cards List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-[#EDE8E0] text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-[#2E8B57]" />
                <p className="font-bold text-[#181D26]">All Caught Up!</p>
                <p className="text-slate-500">
                  No active insights in this tab right now. Your spending trajectory is steady.
                </p>
              </div>
            ) : (
              filtered.map(item => {
                const Icon = item.icon;
                const isExpanded = expandedTraceId === item.id;
                const feedback = feedbackGiven[item.id];

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border border-[#EDE8E0] shadow-card hover:border-[#DFD7C7] transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <Icon className="w-5 h-5" style={{ color: item.color }} />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#181D26]">{item.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-slate-500 uppercase tracking-wider">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#5E687D] leading-relaxed">{item.body}</p>
                        </div>
                      </div>

                      {/* Actions & Dismiss Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => setExpandedTraceId(isExpanded ? null : item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            isExpanded
                              ? 'bg-[#FAF8F5] border-[#DFD7C7] text-[#181D26]'
                              : 'border-[#EDE8E0] text-[#5E687D] hover:bg-slate-50'
                          }`}
                          title="View calculation trace and underlying data"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Why?</span>
                        </button>

                        <button
                          onClick={e => handleDismiss(item.id, e)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                          title="Dismiss insight"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Traceable Supporting Data Drawer */}
                    {isExpanded && (
                      <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs space-y-2 animate-in">
                        <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <span>Supporting Data Trace (OWASP Transparency)</span>
                          <span>Period: {item.supportingData.period}</span>
                        </div>
                        <div className="font-semibold text-[#181D26]">
                          {item.supportingData.metric}
                        </div>
                        <p className="text-slate-600 font-mono text-[11px] bg-white p-2 rounded-lg border border-[#EDE8E0]">
                          {item.supportingData.calculationTrace}
                        </p>

                        {/* User Feedback */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#EDE8E0]">
                          <span className="text-[11px] text-slate-500">Was this insight helpful?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={e => handleFeedback(item.id, 'up', e)}
                              className={`p-1 rounded-lg border text-xs flex items-center gap-1 ${
                                feedback === 'up'
                                  ? 'bg-[#EBF7EE] text-[#2E8B57] border-[#D4EED9]'
                                  : 'border-[#EDE8E0] text-slate-500 hover:bg-white'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Yes</span>
                            </button>
                            <button
                              onClick={e => handleFeedback(item.id, 'down', e)}
                              className={`p-1 rounded-lg border text-xs flex items-center gap-1 ${
                                feedback === 'down'
                                  ? 'bg-[#FDF1EE] text-[#E06D53] border-[#FBDCD5]'
                                  : 'border-[#EDE8E0] text-slate-500 hover:bg-white'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>No</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
