import { FinancialProfile, Transaction, BudgetStatus, DailySpendingReport, RealityTone, Frequency } from '../types';

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
 * Monetary precision helpers using integer paise (1 Rupee = 100 Paise).
 * Eliminates JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

export function roundPaise(amount: number): number {
  return fromPaise(toPaise(amount));
}

export function addMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) + toPaise(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) - toPaise(b));
}

export function multiplyMoney(amount: number, factor: number): number {
  return fromPaise(Math.round(toPaise(amount) * factor));
}

/**
 * Formats a number in Indian Rupee format (e.g. ₹1,00,000.00 or ₹3,333.33).
 */
export function formatINR(amount: number, includeDecimals = true): string {
  const rounded = roundPaise(amount);
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
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
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
        ? roundPaise(profile.daily_budget_override)
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
 * Calculates net spending for a list of transactions using integer paise arithmetic.
 * Treats refunds as spending reductions.
 */
export function calculateTotalSpending(transactions: Transaction[]): number {
  let totalPaise = 0;
  for (const tx of transactions) {
    if (isSpendingExpense(tx)) {
      totalPaise += toPaise(tx.amount);
    } else if (tx.transaction_type === 'refund') {
      totalPaise -= toPaise(tx.amount);
    }
  }
  return fromPaise(Math.max(0, totalPaise));
}

/**
 * Calculates total income for a list of transactions using integer paise arithmetic.
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  let totalPaise = 0;
  for (const tx of transactions) {
    if (tx.transaction_type === 'income') {
      totalPaise += toPaise(tx.amount);
    }
  }
  return fromPaise(Math.max(0, totalPaise));
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
  const variance = subtractMoney(dailyBudget, actualSpending);
  const remainingAllowance = variance;
  const overspending = fromPaise(Math.max(0, toPaise(actualSpending) - toPaise(dailyBudget)));

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
      const curPaise = categoryMap.get(tx.category_id) || 0;
      categoryMap.set(tx.category_id, curPaise + toPaise(tx.amount));
      if (tx.is_unplanned) unplannedCount++;
    }
  }

  let biggestCategory: string | undefined;
  let biggestCategoryPaise = 0;
  for (const [cat, amtPaise] of categoryMap.entries()) {
    if (amtPaise > biggestCategoryPaise) {
      biggestCategory = cat;
      biggestCategoryPaise = amtPaise;
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
    dailyBudget: roundPaise(dailyBudget),
    actualSpending,
    variance,
    remainingAllowance,
    overspending,
    percentUsed,
    status,
    statusLabel,
    biggestCategory,
    biggestCategoryAmount: fromPaise(biggestCategoryPaise),
    transactionCount: todayTransactions.length,
    unplannedCount,
    recentDailyAverage: roundPaise(recentDailyAverage),
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

/**
 * Calculates monthly trends across consecutive months from actual transaction data.
 */
export interface MonthTrendData {
  monthKey: string; // e.g. "2026-10"
  label: string; // e.g. "Oct"
  income: number;
  expense: number;
  isCurrent: boolean;
}

export function calculateMonthlyTrends(
  transactions: Transaction[],
  currentDate = new Date(),
  monthsCount = 6
): MonthTrendData[] {
  const result: MonthTrendData[] = [];
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(curYear, curMonth - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = MONTH_LABELS[d.getMonth()];
    const isCurrent = i === 0;

    let monthIncomePaise = 0;
    let monthExpensePaise = 0;

    for (const tx of transactions) {
      if (tx.transaction_date.startsWith(monthKey)) {
        if (tx.transaction_type === 'income') {
          monthIncomePaise += toPaise(tx.amount);
        } else if (isSpendingExpense(tx)) {
          monthExpensePaise += toPaise(tx.amount);
        } else if (tx.transaction_type === 'refund') {
          monthExpensePaise = Math.max(0, monthExpensePaise - toPaise(tx.amount));
        }
      }
    }

    result.push({
      monthKey,
      label,
      income: fromPaise(monthIncomePaise),
      expense: fromPaise(monthExpensePaise),
      isCurrent,
    });
  }

  return result;
}

/**
 * Advances recurring payment due date to the next cycle based on frequency.
 */
export function advanceNextDueDate(currentDueDateStr: string, frequency: Frequency): string {
  const d = new Date(currentDueDateStr);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().slice(0, 10);
}

// --------------------------------------------------------------------
// Level 04: Analytics - Essential vs Discretionary & Period Comparison
// --------------------------------------------------------------------

export const ESSENTIAL_CATEGORY_IDS = new Set([
  'cat_groceries',
  'cat_bills',
  'cat_rent',
  'cat_healthcare',
  'cat_education',
]);

export interface EssentialDiscretionaryBreakdown {
  essentialTotal: number;
  discretionaryTotal: number;
  totalSpending: number;
  essentialPercentage: number;
  discretionaryPercentage: number;
}

export function calculateEssentialDiscretionarySplit(
  transactions: Transaction[]
): EssentialDiscretionaryBreakdown {
  let essentialPaise = 0;
  let discretionaryPaise = 0;

  for (const tx of transactions) {
    if (isSpendingExpense(tx)) {
      const amtPaise = toPaise(tx.amount);
      if (ESSENTIAL_CATEGORY_IDS.has(tx.category_id)) {
        essentialPaise += amtPaise;
      } else {
        discretionaryPaise += amtPaise;
      }
    } else if (tx.transaction_type === 'refund') {
      const amtPaise = toPaise(tx.amount);
      if (ESSENTIAL_CATEGORY_IDS.has(tx.category_id)) {
        essentialPaise = Math.max(0, essentialPaise - amtPaise);
      } else {
        discretionaryPaise = Math.max(0, discretionaryPaise - amtPaise);
      }
    }
  }

  const totalPaise = essentialPaise + discretionaryPaise;
  const essentialTotal = fromPaise(essentialPaise);
  const discretionaryTotal = fromPaise(discretionaryPaise);

  return {
    essentialTotal,
    discretionaryTotal,
    totalSpending: fromPaise(totalPaise),
    essentialPercentage: totalPaise > 0 ? Math.round((essentialPaise / totalPaise) * 100) : 0,
    discretionaryPercentage: totalPaise > 0 ? Math.round((discretionaryPaise / totalPaise) * 100) : 0,
  };
}

export interface PeriodComparison {
  currentPeriodKey: string;
  previousPeriodKey: string;
  currentSpending: number;
  previousSpending: number;
  deltaAmount: number; // current - previous
  percentageChange: number; // +X% or -X%
  hasPreviousData: boolean;
  categoryDeltas: {
    categoryId: string;
    currentAmount: number;
    previousAmount: number;
    deltaAmount: number;
    percentageChange: number;
  }[];
}

export function compareMonthlySpending(
  transactions: Transaction[],
  targetMonthKey: string // "YYYY-MM"
): PeriodComparison {
  const [yearStr, monthStr] = targetMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Compute previous month
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const currentTxs = transactions.filter(t => t.transaction_date.startsWith(targetMonthKey));
  const prevTxs = transactions.filter(t => t.transaction_date.startsWith(prevMonthKey));

  const currentSpending = calculateTotalSpending(currentTxs);
  const previousSpending = calculateTotalSpending(prevTxs);
  const deltaAmount = subtractMoney(currentSpending, previousSpending);

  const hasPreviousData = previousSpending > 0;
  const percentageChange = hasPreviousData 
    ? Number((((currentSpending - previousSpending) / previousSpending) * 100).toFixed(1))
    : 0;

  // Category-wise comparisons
  const currentCatMap = new Map<string, number>();
  const prevCatMap = new Map<string, number>();

  currentTxs.forEach(t => {
    if (isSpendingExpense(t)) {
      currentCatMap.set(t.category_id, (currentCatMap.get(t.category_id) || 0) + toPaise(t.amount));
    }
  });

  prevTxs.forEach(t => {
    if (isSpendingExpense(t)) {
      prevCatMap.set(t.category_id, (prevCatMap.get(t.category_id) || 0) + toPaise(t.amount));
    }
  });

  const allCatIds = new Set([...Array.from(currentCatMap.keys()), ...Array.from(prevCatMap.keys())]);
  const categoryDeltas = Array.from(allCatIds).map(catId => {
    const curAmt = fromPaise(currentCatMap.get(catId) || 0);
    const prevAmt = fromPaise(prevCatMap.get(catId) || 0);
    const catDelta = subtractMoney(curAmt, prevAmt);
    const catPct = prevAmt > 0 ? Number((((curAmt - prevAmt) / prevAmt) * 100).toFixed(1)) : 0;

    return {
      categoryId: catId,
      currentAmount: curAmt,
      previousAmount: prevAmt,
      deltaAmount: catDelta,
      percentageChange: catPct,
    };
  }).sort((a, b) => Math.abs(b.deltaAmount) - Math.abs(a.deltaAmount));

  return {
    currentPeriodKey: targetMonthKey,
    previousPeriodKey: prevMonthKey,
    currentSpending,
    previousSpending,
    deltaAmount,
    percentageChange,
    hasPreviousData,
    categoryDeltas,
  };
}
