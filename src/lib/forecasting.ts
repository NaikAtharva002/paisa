/**
 * PAISA Spending Forecasting & Predictive Modeling Engine
 * -------------------------------------------------------
 * Principles:
 * 1. Fully deterministic, transparent statistical run-rate modeling.
 * 2. Strict integer paise precision (zero floating-point drift).
 * 3. Separation of regular daily run-rate from one-time outlier purchases.
 * 4. Integration of pending scheduled recurring bills due before month end.
 * 5. Honest insufficient data safeguards (never hallucinate predictions).
 */

import { Transaction, RecurringPayment, FinancialProfile } from '../types';
import {
  toPaise,
  fromPaise,
  addMoney,
  subtractMoney,
  multiplyMoney,
  roundPaise,
  getDaysInMonth,
  isSpendingExpense,
} from './calculations';

export interface CategoryForecast {
  categoryId: string;
  actualSpent: number;
  projectedMonthEnd: number;
  categoryBudget?: number;
  isOverBudget: boolean;
  projectedVariance: number; // positive = under budget, negative = overrun
  pacingPercentage: number;
}

export type OverrunRiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface MonthEndForecast {
  status: 'sufficient_data' | 'insufficient_data';
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  actualSpentMtd: number;
  projectedMonthEndSpent: number;
  dailyRunRate: number;
  pendingRecurringTotal: number;
  monthlyBudget: number;
  projectedVariance: number;
  projectedSavings: number;
  riskLevel: OverrunRiskLevel;
  projectedExhaustionDay?: number;
  categories: CategoryForecast[];
  explanatoryMessage: string;
  methodologyNotes: string;
}

/**
 * Calculates pending recurring bill commitments due for the remainder of the current month.
 */
export function calculatePendingRecurringBills(
  recurringPayments: RecurringPayment[],
  year: number,
  month: number,
  currentDay: number
): { total: number; pendingBills: RecurringPayment[] } {
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
  const pendingBills: RecurringPayment[] = [];
  let totalPaise = 0;

  for (const bill of recurringPayments) {
    if (!bill.is_active) continue;

    // Check if next due date is within this month and in the future (day > currentDay)
    if (bill.next_due_date.startsWith(currentMonthStr)) {
      const dueDay = parseInt(bill.next_due_date.slice(8, 10), 10);
      if (dueDay > currentDay) {
        pendingBills.push(bill);
        totalPaise += toPaise(bill.amount);
      }
    }
  }

  return {
    total: fromPaise(totalPaise),
    pendingBills,
  };
}

/**
 * Generates an end-of-month spending and budget forecast.
 */
export function calculateMonthEndForecast(params: {
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  profile: FinancialProfile;
  categoryBudgets: Record<string, number>;
  currentDate?: Date;
  outlierThreshold?: number; // Transactions above this are treated as one-time capital purchases
}): MonthEndForecast {
  const now = params.currentDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const daysRemaining = Math.max(0, daysInMonth - day);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const mtdTransactions = params.transactions.filter(
    t => isSpendingExpense(t) && t.transaction_date.startsWith(monthPrefix)
  );

  // Insufficient data safeguard: Need at least 2 days elapsed and at least 2 transactions
  if (day < 2 || mtdTransactions.length < 2) {
    const actualSpentMtd = mtdTransactions.reduce((acc, t) => addMoney(acc, t.amount), 0);
    const budget: number = (params.profile.monthly_spending_target && params.profile.monthly_spending_target > 0)
      ? params.profile.monthly_spending_target
      : params.profile.monthly_income;

    return {
      status: 'insufficient_data',
      daysInMonth,
      daysElapsed: day,
      daysRemaining,
      actualSpentMtd,
      projectedMonthEndSpent: actualSpentMtd,
      dailyRunRate: day > 0 ? fromPaise(Math.round(toPaise(actualSpentMtd) / day)) : 0,
      pendingRecurringTotal: 0,
      monthlyBudget: budget,
      projectedVariance: subtractMoney(budget, actualSpentMtd),
      projectedSavings: Math.max(0, subtractMoney(params.profile.monthly_income, actualSpentMtd)),
      riskLevel: 'safe',
      categories: [],
      explanatoryMessage: `More data needed. Forecasts become reliable after recording transactions across at least 2 calendar days.`,
      methodologyNotes: 'Minimum statistical threshold not met (< 2 days or < 2 transactions).',
    };
  }

  // 1. Calculate actual MTD spending and isolate one-time outliers
  // By default, an expense >= 20% of monthly income or specified threshold is an outlier
  const outlierCutoff = params.outlierThreshold || Math.max(10000, params.profile.monthly_income * 0.2);
  let regularSpendPaise = 0;
  let outlierSpendPaise = 0;
  const categorySpendPaise = new Map<string, { regular: number; total: number }>();

  for (const tx of mtdTransactions) {
    const amtPaise = toPaise(tx.amount);
    const isOutlier = tx.amount >= outlierCutoff;

    if (isOutlier) {
      outlierSpendPaise += amtPaise;
    } else {
      regularSpendPaise += amtPaise;
    }

    const catRecord = categorySpendPaise.get(tx.category_id) || { regular: 0, total: 0 };
    catRecord.total += amtPaise;
    if (!isOutlier) catRecord.regular += amtPaise;
    categorySpendPaise.set(tx.category_id, catRecord);
  }

  const actualSpentMtd = fromPaise(regularSpendPaise + outlierSpendPaise);

  // 2. Compute regular daily run-rate
  const dailyRunRate = fromPaise(Math.round(regularSpendPaise / day));

  // 3. Pending recurring bills scheduled for the rest of the month
  const { total: pendingRecurringTotal, pendingBills } = calculatePendingRecurringBills(
    params.recurringPayments,
    year,
    month,
    day
  );

  // Map pending bills to categories
  const pendingBillsByCat = new Map<string, number>();
  for (const bill of pendingBills) {
    const cur = pendingBillsByCat.get(bill.category_id) || 0;
    pendingBillsByCat.set(bill.category_id, addMoney(cur, bill.amount));
  }

  // 4. Projected Total Month-End Spending
  // Formula: Actual MTD + (Daily Run-Rate * Days Remaining) + Pending Recurring Bills
  const projectedRemainingRegularPaise = toPaise(dailyRunRate) * daysRemaining;
  const projectedMonthEndSpent = fromPaise(
    toPaise(actualSpentMtd) + projectedRemainingRegularPaise + toPaise(pendingRecurringTotal)
  );

  // 5. Budget Variance & Risk Assessment
  const monthlyBudget: number = (params.profile.monthly_spending_target && params.profile.monthly_spending_target > 0)
    ? params.profile.monthly_spending_target
    : (Math.max(0, params.profile.monthly_income - (params.profile.savings_target || 0) - (params.profile.fixed_commitments || 0)) || params.profile.monthly_income);

  const projectedVariance = subtractMoney(monthlyBudget, projectedMonthEndSpent);
  const projectedSavings = Math.max(0, subtractMoney(params.profile.monthly_income, projectedMonthEndSpent));

  // Determine Risk Level
  let riskLevel: OverrunRiskLevel = 'safe';
  let projectedExhaustionDay: number | undefined;

  if (actualSpentMtd >= monthlyBudget) {
    riskLevel = 'critical'; // Already exceeded budget
  } else if (projectedMonthEndSpent > monthlyBudget) {
    const budgetRemainingPaise = toPaise(monthlyBudget) - toPaise(actualSpentMtd);
    const dailyPacePaise = toPaise(dailyRunRate);

    if (dailyPacePaise > 0) {
      const daysUntilExhaustion = Math.floor(budgetRemainingPaise / dailyPacePaise);
      projectedExhaustionDay = Math.min(daysInMonth, day + Math.max(1, daysUntilExhaustion));
      riskLevel = daysUntilExhaustion <= 7 ? 'high' : 'moderate';
    } else {
      riskLevel = 'moderate';
    }
  }

  // 6. Category-level forecasts
  const categories: CategoryForecast[] = [];
  const allCategoryIds = new Set([
    ...Array.from(categorySpendPaise.keys()),
    ...Object.keys(params.categoryBudgets),
  ]);

  for (const catId of allCategoryIds) {
    const catData = categorySpendPaise.get(catId) || { regular: 0, total: 0 };
    const catActual = fromPaise(catData.total);
    const catDailyRegularRate = day > 0 ? catData.regular / day : 0;
    const catPendingRecurring = pendingBillsByCat.get(catId) || 0;

    const catProjected = fromPaise(
      catData.total + Math.round(catDailyRegularRate * daysRemaining) + toPaise(catPendingRecurring)
    );

    const catBudget = params.categoryBudgets[catId];
    const isOver = catBudget !== undefined ? catProjected > catBudget : false;
    const catVariance = catBudget !== undefined ? subtractMoney(catBudget, catProjected) : 0;
    const pacing = catBudget && catBudget > 0 ? Math.round((catProjected / catBudget) * 100) : 0;

    categories.push({
      categoryId: catId,
      actualSpent: catActual,
      projectedMonthEnd: catProjected,
      categoryBudget: catBudget,
      isOverBudget: isOver,
      projectedVariance: catVariance,
      pacingPercentage: pacing,
    });
  }

  categories.sort((a, b) => b.projectedMonthEnd - a.projectedMonthEnd);

  // Explanatory message
  let explanatoryMessage = '';
  if (riskLevel === 'critical') {
    explanatoryMessage = `Monthly budget limit exceeded. You have spent ₹${actualSpentMtd.toLocaleString('en-IN')}, which is ₹${Math.abs(projectedVariance).toLocaleString('en-IN')} over your monthly target.`;
  } else if (riskLevel === 'high') {
    explanatoryMessage = `Early Warning: At your current pacing of ₹${dailyRunRate.toLocaleString('en-IN')}/day, your monthly budget will be exhausted around Day ${projectedExhaustionDay}.`;
  } else if (riskLevel === 'moderate') {
    explanatoryMessage = `Pacing Notice: You are projected to finish the month at ₹${projectedMonthEndSpent.toLocaleString('en-IN')}, slightly exceeding your monthly ceiling of ₹${monthlyBudget.toLocaleString('en-IN')}.`;
  } else {
    explanatoryMessage = `On Track: At your current daily run-rate of ₹${dailyRunRate.toLocaleString('en-IN')}/day, you are projected to save ₹${projectedSavings.toLocaleString('en-IN')} by month-end.`;
  }

  return {
    status: 'sufficient_data',
    daysInMonth,
    daysElapsed: day,
    daysRemaining,
    actualSpentMtd,
    projectedMonthEndSpent,
    dailyRunRate,
    pendingRecurringTotal,
    monthlyBudget,
    projectedVariance,
    projectedSavings,
    riskLevel,
    projectedExhaustionDay,
    categories,
    explanatoryMessage,
    methodologyNotes: `Daily run-rate (₹${dailyRunRate}/day) × ${daysRemaining} days remaining + ₹${pendingRecurringTotal} pending auto-debits + ₹${outlierSpendPaise > 0 ? fromPaise(outlierSpendPaise) : 0} one-time purchases.`,
  };
}
