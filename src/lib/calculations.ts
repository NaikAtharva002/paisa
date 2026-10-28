import { FinancialProfile, Transaction, BudgetStatus, DailySpendingReport, RealityTone } from '../types';

/**
 * Checks if a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the exact number of days in a month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }
  const daysPerMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysPerMonth[month - 1];
}

/**
 * Formats a number in Indian Rupee format (e.g. ₹1,00,000.00 or ₹3,333.33).
 */
export function formatINR(amount: number, includeDecimals = true): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(rounded);
}

/**
 * Compact Indian number format (e.g. ₹1.5L, ₹25K).
 */
export function formatINRCompact(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return formatINR(amount, false);
}

/**
 * Calculates the daily income equivalent for a given monthly income and month/year.
 * Daily Income Equivalent = Monthly Income / Calendar Days in Month
 */
export function calculateDailyIncomeEquivalent(monthlyIncome: number, year: number, month: number): number {
  const totalDays = getDaysInMonth(year, month);
  if (totalDays <= 0 || monthlyIncome <= 0) return 0;
  return Number((monthlyIncome / totalDays).toFixed(2));
}

/**
 * Calculates daily spendable budget:
 * (Monthly Income - Savings Target - Fixed Commitments) / Calendar Days in Month
 */
export function calculateDailySpendableBudget(profile: FinancialProfile, year: number, month: number): number {
  const totalDays = getDaysInMonth(year, month);
  if (totalDays <= 0) return 0;

  const disposable = Math.max(0, profile.monthly_income - (profile.savings_target || 0) - (profile.fixed_commitments || 0));
  return Number((disposable / totalDays).toFixed(2));
}

/**
 * Resolves the effective daily budget based on user budgeting mode preference.
 */
export function getEffectiveDailyBudget(profile: FinancialProfile, year: number, month: number): number {
  switch (profile.budgeting_mode) {
    case 'custom_limit':
      return profile.daily_budget_override > 0 
        ? profile.daily_budget_override 
        : calculateDailyIncomeEquivalent(profile.monthly_income, year, month);
    case 'spendable_income':
      return calculateDailySpendableBudget(profile, year, month);
    case 'income_equivalent':
    default:
      return calculateDailyIncomeEquivalent(profile.monthly_income, year, month);
  }
}

/**
 * Determines whether a transaction counts towards daily/monthly discretionary spending.
 * CRITICAL RULE: Transfers, credit card bill repayments, and investments/savings 
 * must never be counted twice or treated as daily consumption.
 */
export function isSpendingExpense(tx: Transaction): boolean {
  if (tx.transaction_type === 'expense') {
    if (tx.is_credit_card_payment) return false;
    if (tx.is_internal_transfer) return false;
    return true;
  }
  return false;
}

/**
 * Calculates net spending for a list of transactions.
 * Treats refunds as spending reductions.
 */
export function calculateTotalSpending(transactions: Transaction[]): number {
  let total = 0;
  for (const tx of transactions) {
    if (isSpendingExpense(tx)) {
      total += tx.amount;
    } else if (tx.transaction_type === 'refund') {
      total -= tx.amount;
    }
  }
  return Number(Math.max(0, total).toFixed(2));
}

/**
 * Calculates total income for a list of transactions.
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return Number(
    transactions
      .filter(tx => tx.transaction_type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0)
      .toFixed(2)
  );
}

/**
 * Determines budget status based on percent of daily budget utilized.
 */
export function getBudgetStatus(percentUsed: number, warningThreshold = 70): BudgetStatus {
  if (percentUsed > 100) return 'overspent';
  if (percentUsed === 100) return 'budget_reached';
  if (percentUsed >= warningThreshold) return 'getting_close';
  return 'comfortable';
}

/**
 * Formats a user-friendly label for budget status.
 */
export function getBudgetStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'comfortable':
      return 'Within budget';
    case 'getting_close':
      return 'Getting close';
    case 'budget_reached':
      return 'Budget reached';
    case 'overspent':
      return 'Overspent';
  }
}

/**
 * Generates the complete daily spending reality report for a specific day.
 */
export function calculateDailyReport(
  dailyBudget: number,
  todayTransactions: Transaction[],
  targetDateStr: string,
  recentDailyAverage = dailyBudget,
  tone: RealityTone = 'friendly'
): DailySpendingReport {
  const actualSpending = calculateTotalSpending(todayTransactions);
  const variance = Number((dailyBudget - actualSpending).toFixed(2));
  const remainingAllowance = Number((dailyBudget - actualSpending).toFixed(2));
  const overspending = Number(Math.max(0, actualSpending - dailyBudget).toFixed(2));

  const percentUsed = dailyBudget > 0 
    ? Number(((actualSpending / dailyBudget) * 100).toFixed(1))
    : 0;

  const status = getBudgetStatus(percentUsed);
  const statusLabel = getBudgetStatusLabel(status);

  // Group by category to find biggest spending category
  const categoryMap = new Map<string, number>();
  let unplannedCount = 0;

  for (const tx of todayTransactions) {
    if (isSpendingExpense(tx)) {
      const current = categoryMap.get(tx.category_id) || 0;
      categoryMap.set(tx.category_id, current + tx.amount);
      if (tx.is_unplanned) unplannedCount++;
    }
  }

  let biggestCategory: string | undefined;
  let biggestCategoryAmount = 0;
  for (const [cat, amt] of categoryMap.entries()) {
    if (amt > biggestCategoryAmount) {
      biggestCategory = cat;
      biggestCategoryAmount = amt;
    }
  }

  const hasTransactions = todayTransactions.filter(isSpendingExpense).length > 0;

  // Generate tone-based reality message
  const { message, actionSuggestion } = generateRealityMessage({
    dailyBudget,
    actualSpending,
    overspending,
    status,
    percentUsed,
    unplannedCount,
    tone,
    hasTransactions,
  });

  return {
    date: targetDateStr,
    dailyBudget,
    actualSpending,
    variance,
    remainingAllowance,
    overspending,
    percentUsed,
    status,
    statusLabel,
    biggestCategory,
    biggestCategoryAmount,
    transactionCount: todayTransactions.length,
    unplannedCount,
    recentDailyAverage,
    hasTransactions,
    message,
    actionSuggestion,
  };
}

/**
 * Generates copy for the Nightly Financial Reality Check based on chosen tone.
 */
function generateRealityMessage(params: {
  dailyBudget: number;
  actualSpending: number;
  overspending: number;
  status: BudgetStatus;
  percentUsed: number;
  unplannedCount: number;
  tone: RealityTone;
  hasTransactions: boolean;
}): { message: string; actionSuggestion: string } {
  const { dailyBudget, actualSpending, overspending, status, percentUsed, unplannedCount, tone, hasTransactions } = params;

  if (!hasTransactions) {
    return {
      message: "No expenses recorded today! Either your wallet had a peaceful rest day, or you haven't logged your coffee yet.",
      actionSuggestion: "If you made any UPI or cash payments today, add them now to keep your daily story honest."
    };
  }

  if (status === 'overspent') {
    const exceedPercent = dailyBudget > 0 ? Math.round((overspending / dailyBudget) * 100) : 100;
    switch (tone) {
      case 'sarcastic':
        return {
          message: `Congratulations! You blew past today's budget by ${formatINR(overspending)} (+${exceedPercent}%). Did Zomato send a royal invitation, or did Blinkit deliver golden almonds?`,
          actionSuggestion: "Tomorrow's challenge: Drink home water, delete 1 food delivery cart, and redeem your pride."
        };
      case 'encouraging':
        return {
          message: `Today went over by ${formatINR(overspending)}, but don't sweat it. Awareness is 90% of winning with money. One heavier day does not define your month.`,
          actionSuggestion: "Set a conservative dining limit tomorrow to naturally pull your weekly average back in line."
        };
      case 'straightforward':
        return {
          message: `Budget exceeded by ${formatINR(overspending)} (${exceedPercent}% over limit). Total spent: ${formatINR(actualSpending)} against target of ${formatINR(dailyBudget)}.`,
          actionSuggestion: `Reduce tomorrow's spending to compensate for the ${formatINR(overspending)} variance.`
        };
      case 'friendly':
      default:
        return {
          message: `You spent ${formatINR(actualSpending)} today, which is ${formatINR(overspending)} over your ₹${dailyBudget.toLocaleString('en-IN')} target.`,
          actionSuggestion: unplannedCount > 0 
            ? `You had ${unplannedCount} unplanned purchases today. Try pausing for 10 minutes before impromptu orders tomorrow.`
            : "Plan your meals and travel early tomorrow to stay nicely inside your allowance."
        };
    }
  }

  if (status === 'getting_close' || status === 'budget_reached') {
    switch (tone) {
      case 'sarcastic':
        return {
          message: `You've burned through ${percentUsed}% of today's allowance. Proceed cautiously before hitting 'Place Order' again.`,
          actionSuggestion: "Lock your UPI apps for the evening and sleep in victory."
        };
      case 'straightforward':
        return {
          message: `You are at ${percentUsed}% of your daily budget with ${formatINR(dailyBudget - actualSpending)} remaining.`,
          actionSuggestion: "Keep any additional purchases tonight strictly to essentials."
        };
      case 'encouraging':
      case 'friendly':
      default:
        return {
          message: `Solid pacing! You used ${percentUsed}% of your daily budget and stayed comfortably under the ceiling.`,
          actionSuggestion: `You have ${formatINR(dailyBudget - actualSpending)} left in your buffer for today.`
        };
    }
  }

  // Comfortable (< 70%)
  switch (tone) {
    case 'sarcastic':
      return {
        message: `Look at you, financial saint. You only used ${percentUsed}% of your budget today. Your bank balance actually breathed a sigh of relief.`,
        actionSuggestion: "Carry that surplus into tomorrow or tuck it straight into your savings bucket."
      };
    case 'straightforward':
      return {
        message: `Today's spending was ${formatINR(actualSpending)} out of ${formatINR(dailyBudget)} (${percentUsed}% used). Surplus: ${formatINR(dailyBudget - actualSpending)}.`,
        actionSuggestion: "Maintained comfortable surplus under daily limit."
      };
    case 'encouraging':
    case 'friendly':
    default:
      return {
        message: `Outstanding! You stayed comfortably within budget today, spending only ${formatINR(actualSpending)} of your ${formatINR(dailyBudget)} allowance.`,
        actionSuggestion: `You saved ${formatINR(dailyBudget - actualSpending)} today that stays right in your pocket!`
      };
  }
}
