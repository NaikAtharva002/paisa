import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { store } from '../../lib/storage';
import {
  formatINR,
  isSpendingExpense,
  getDaysInMonth,
  calculateDailyIncomeEquivalent,
  compareMonthlySpending,
  calculateEssentialDiscretionarySplit,
} from '../../lib/calculations';
import { calculateMonthEndForecast } from '../../lib/forecasting';
import { exportTransactionsToCsv } from '../../lib/csvParser';
import {
  Download,
  Calendar,
  TrendingDown,
  TrendingUp,
  Receipt,
  Store,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
} from 'lucide-react';

export const MonthlyReportView: React.FC = () => {
  const transactions = store.getTransactions();
  const categories = store.getCategories();
  const profile = store.getProfile();
  const recurring = store.getRecurringPayments();
  const categoryBudgets = store.getCategoryBudgets();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  const catMap = new Map(categories.map(c => [c.id, { name: c.name, color: c.color }]));

  // Filter transactions for chosen month
  const monthTxs = transactions.filter(t => t.transaction_date.startsWith(selectedMonth));

  // Income & Expense
  const totalIncome = monthTxs
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || profile.monthly_income;

  const totalExpense = monthTxs
    .filter(isSpendingExpense)
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  // Spending by Category & Merchant
  const catSpendMap = new Map<string, number>();
  const merchantSpendMap = new Map<string, number>();
  const daySpendMap = new Map<string, number>();

  monthTxs.forEach(t => {
    if (isSpendingExpense(t)) {
      catSpendMap.set(t.category_id, (catSpendMap.get(t.category_id) || 0) + t.amount);
      merchantSpendMap.set(t.merchant, (merchantSpendMap.get(t.merchant) || 0) + t.amount);
      const dayStr = t.transaction_date.slice(0, 10);
      daySpendMap.set(dayStr, (daySpendMap.get(dayStr) || 0) + t.amount);
    }
  });

  const categoryChartData = Array.from(catSpendMap.entries()).map(([catId, amount]) => {
    const meta = catMap.get(catId);
    return {
      name: meta?.name || 'Other',
      value: amount,
      color: meta?.color || '#D4952B',
    };
  }).sort((a, b) => b.value - a.value);

  const topMerchants = Array.from(merchantSpendMap.entries())
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Highest spending day & Days over/within budget
  const [yearStr, monthStr] = selectedMonth.split('-');
  const daysInMonth = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));
  const dailyTarget = calculateDailyIncomeEquivalent(profile.monthly_income, parseInt(yearStr), parseInt(monthStr));

  let highestSpendDay = { date: 'None', amount: 0 };
  let daysOverBudget = 0;
  let daysWithinBudget = 0;

  daySpendMap.forEach((amt, day) => {
    if (amt > highestSpendDay.amount) {
      highestSpendDay = { date: day, amount: amt };
    }
    if (amt > dailyTarget) {
      daysOverBudget++;
    } else {
      daysWithinBudget++;
    }
  });

  const avgDailySpend = daySpendMap.size > 0 ? totalExpense / daySpendMap.size : 0;

  // 1. Daily Trend Line Chart Data (Day 1 to daysInMonth)
  const dailyTrendData = Array.from({ length: daysInMonth }, (_, idx) => {
    const dayNum = idx + 1;
    const dayStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    return {
      day: `D${dayNum}`,
      spent: daySpendMap.get(dayStr) || 0,
      target: Math.round(dailyTarget),
    };
  });

  // 2. Income vs Expense Bar Data
  const incomeVsExpenseData = [
    { name: 'Income', amount: totalIncome, fill: '#2E8B57' },
    { name: 'Expenses', amount: totalExpense, fill: '#E06D53' },
    { name: 'Net Savings', amount: Math.max(0, netCashFlow), fill: '#3B82F6' },
  ];

  // Month-over-Month Comparison
  const momComparison = compareMonthlySpending(transactions, selectedMonth);

  // Essential vs Discretionary Needs
  const split = calculateEssentialDiscretionarySplit(monthTxs);

  // Active Month Forecast
  const isCurrentActiveMonth = selectedMonth === new Date().toISOString().slice(0, 7);
  const forecast = isCurrentActiveMonth
    ? calculateMonthEndForecast({
        transactions,
        recurringPayments: recurring,
        profile,
        categoryBudgets,
        currentDate: new Date(),
      })
    : null;

  const handleDownloadCsv = () => {
    const csv = exportTransactionsToCsv(monthTxs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paisa_statement_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setMonthOffset = (offsetMonths: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - offsetMonths);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Month Selector & Download Toolbar */}
      <div className="editorial-card p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center text-[#D4952B] shadow-xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="section-title text-[#7F899F]">Statement Period</div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] focus:outline-hidden focus:border-[#181D26]"
                aria-label="Select statement month"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonthOffset(0)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    selectedMonth === new Date().toISOString().slice(0, 7)
                      ? 'bg-[#181D26] text-white border-[#181D26]'
                      : 'bg-white text-[#5E687D] border-[#EDE8E0] hover:bg-[#FAF8F5]'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setMonthOffset(1)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white text-[#5E687D] border-[#EDE8E0] hover:bg-[#FAF8F5] transition-colors"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setMonthOffset(2)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white text-[#5E687D] border-[#EDE8E0] hover:bg-[#FAF8F5] transition-colors"
                >
                  2 Mo Ago
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="btn-primary text-xs px-4 py-2 shrink-0 self-start md:self-auto"
          aria-label="Download statement as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Statement (CSV)</span>
        </button>
      </div>

      {/* Predictive Month-End Forecast Banner (Active Month Only) */}
      {forecast && forecast.status === 'sufficient_data' && (
        <div className="editorial-card p-5 border-l-4 border-l-[#D4952B] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D4952B] uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Month-End Predictive Forecast</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  forecast.riskLevel === 'safe'
                    ? 'bg-[#EBF7EE] text-[#2E8B57]'
                    : forecast.riskLevel === 'moderate'
                    ? 'bg-[#FEF8EA] text-[#D4952B]'
                    : 'bg-[#FDF1EE] text-[#E06D53]'
                }`}
              >
                {forecast.riskLevel.toUpperCase()} RISK
              </span>
            </div>
            <div className="text-sm font-bold text-[#181D26]">
              {forecast.explanatoryMessage}
            </div>
            <div className="text-xs text-[#5E687D]">
              {forecast.methodologyNotes}
            </div>
          </div>

          <div className="flex items-center gap-6 sm:border-l sm:border-[#EDE8E0] sm:pl-6 shrink-0">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Projected Spend</div>
              <div className="text-lg font-black font-mono-num text-[#181D26]">
                {formatINR(forecast.projectedMonthEndSpent)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Daily Run-Rate</div>
              <div className="text-lg font-black font-mono-num text-[#2E8B57]">
                {formatINR(forecast.dailyRunRate)}/d
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="editorial-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="section-title text-[#7F899F]">Total Income</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0F7F3] text-[#2E8B57] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono-num text-[#181D26]">{formatINR(totalIncome)}</div>
          <div className="text-[11px] text-[#7F899F] mt-1 font-medium">Monthly salary & income credits</div>
        </div>

        {/* Total Spends */}
        <div className="editorial-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="section-title text-[#7F899F]">Total Spending</span>
            <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] text-[#E06D53] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono-num text-[#181D26]">{formatINR(totalExpense)}</div>
          <div className="text-[11px] text-[#7F899F] mt-1 font-medium">{monthTxs.filter(isSpendingExpense).length} purchases this month</div>
        </div>

        {/* Net Savings */}
        <div className="editorial-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="section-title text-[#7F899F]">Net Cash Flow</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono-num ${netCashFlow >= 0 ? 'text-[#2E8B57]' : 'text-[#E06D53]'}`}>
            {netCashFlow >= 0 ? formatINR(netCashFlow) : `-${formatINR(Math.abs(netCashFlow))}`}
          </div>
          <div className="text-[11px] text-[#7F899F] mt-1 font-medium">
            {netCashFlow >= 0 ? 'Retained as liquid savings' : 'Budget deficit'}
          </div>
        </div>

        {/* Average Daily Spend */}
        <div className="editorial-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="section-title text-[#7F899F]">Avg. Daily Spend</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#3D4658] flex items-center justify-center border border-[#EDE8E0]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono-num text-[#181D26]">{formatINR(avgDailySpend)}</div>
          <div className="text-[11px] text-[#7F899F] mt-1 font-medium">
            Target allowance: {formatINR(dailyTarget)}/day
          </div>
        </div>
      </div>

      {/* Visual Analytics: Daily Spending Trend & Cash Flow Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending Trend Line Chart */}
        <div className="editorial-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D4952B]" />
              <span>30-Day Daily Spending Trend</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Target: {formatINR(dailyTarget)}/d
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#7F899F' }} stroke="#EDE8E0" />
                <YAxis tick={{ fontSize: 10, fill: '#7F899F' }} stroke="#EDE8E0" tickFormatter={v => `₹${Math.round(v/1000)}k`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-2.5 rounded-xl bg-white border border-[#EDE8E0] text-xs shadow-md">
                          <div className="font-bold text-[#181D26] mb-1">{label}</div>
                          <div className="text-[#E06D53] font-semibold">Spent: {formatINR(Number(payload[0]?.value || 0))}</div>
                          <div className="text-[#7F899F]">Target: {formatINR(Number(payload[1]?.value || 0))}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="spent" stroke="#E06D53" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Spent" />
                <Line type="monotone" dataKey="target" stroke="#7F899F" strokeDasharray="3 3" strokeWidth={1.5} dot={false} name="Daily Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-[#5E687D] pt-2 border-t border-[#EDE8E0]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-[#E06D53]" />
              <span>Actual Daily Spent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 border-t border-dashed border-[#7F899F]" />
              <span>Daily Budget Target</span>
            </div>
          </div>
        </div>

        {/* Income vs Expenses Bar Chart */}
        <div className="editorial-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#2E8B57]" />
              <span>Income vs Expenses vs Savings</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Net: {formatINR(netCashFlow)}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#181D26', fontWeight: 600 }} stroke="#EDE8E0" />
                <YAxis tick={{ fontSize: 10, fill: '#7F899F' }} stroke="#EDE8E0" tickFormatter={v => `₹${Math.round(v/1000)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      return (
                        <div className="p-2.5 rounded-xl bg-white border border-[#EDE8E0] text-xs shadow-md">
                          <span className="font-bold text-[#181D26]">{d.payload.name}: </span>
                          <span className="font-mono-num font-bold text-[#181D26]">{formatINR(Number(d.value))}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {incomeVsExpenseData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-[#EDE8E0]">
            <div>
              <span className="text-[10px] text-[#7F899F] block">Income</span>
              <span className="font-bold text-[#2E8B57]">{formatINR(totalIncome)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7F899F] block">Expenses</span>
              <span className="font-bold text-[#E06D53]">{formatINR(totalExpense)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7F899F] block">Savings</span>
              <span className="font-bold text-[#3B82F6]">{formatINR(Math.max(0, netCashFlow))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Month-over-Month & Needs vs Wants Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Month-over-Month Comparison */}
        <div className="editorial-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                <span>Month-over-Month Trajectory</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {momComparison.previousPeriodKey} vs {momComparison.currentPeriodKey}
              </span>
            </div>

            {momComparison.hasPreviousData ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-between">
                  <span className="text-xs text-[#5E687D] font-medium">Spending Variance</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono-num ${
                        momComparison.deltaAmount > 0 ? 'text-[#E06D53]' : 'text-[#2E8B57]'
                      }`}
                    >
                      {momComparison.deltaAmount > 0 ? `+${formatINR(momComparison.deltaAmount)}` : formatINR(momComparison.deltaAmount)}
                    </span>
                    <span className="text-xs font-bold ml-1.5 text-slate-500">
                      ({momComparison.percentageChange > 0 ? `+${momComparison.percentageChange}%` : `${momComparison.percentageChange}%`})
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#5E687D]">
                  {momComparison.deltaAmount > 0
                    ? `Your expenses increased by ${formatINR(momComparison.deltaAmount)} compared to ${momComparison.previousPeriodKey}.`
                    : `Great discipline! You spent ${formatINR(Math.abs(momComparison.deltaAmount))} less than ${momComparison.previousPeriodKey}.`}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                No recorded transactions found for {momComparison.previousPeriodKey} to compute MoM delta.
              </div>
            )}
          </div>

          {momComparison.categoryDeltas.length > 0 && (
            <div className="pt-3 border-t border-[#EDE8E0] space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Top Category Shift</div>
              {momComparison.categoryDeltas.slice(0, 2).map(cd => {
                const name = catMap.get(cd.categoryId)?.name || cd.categoryId;
                const isUp = cd.deltaAmount > 0;
                return (
                  <div key={cd.categoryId} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#181D26]">{name}</span>
                    <span className={`font-mono-num font-bold ${isUp ? 'text-[#E06D53]' : 'text-[#2E8B57]'}`}>
                      {isUp ? `+${formatINR(cd.deltaAmount)}` : formatINR(cd.deltaAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Essential vs Discretionary Needs */}
        <div className="editorial-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2E8B57]" />
                <span>Needs vs Wants Balance</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Discipline Ratio</span>
            </div>

            <div className="space-y-3">
              {/* Dual Bar */}
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  style={{ width: `${split.essentialPercentage}%` }}
                  className="bg-[#2E8B57] h-full transition-all"
                  title={`Essential Needs: ${split.essentialPercentage}%`}
                />
                <div
                  style={{ width: `${split.discretionaryPercentage}%` }}
                  className="bg-[#D4952B] h-full transition-all"
                  title={`Discretionary Lifestyle: ${split.discretionaryPercentage}%`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F0F7F3] border border-[#CDE5D7]">
                  <div className="font-bold text-[#2E8B57]">Core Needs ({split.essentialPercentage}%)</div>
                  <div className="text-base font-black font-mono-num text-[#181D26] mt-0.5">
                    {formatINR(split.essentialTotal)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Groceries, Bills, Rent, Health</div>
                </div>

                <div className="p-3 rounded-xl bg-[#FEF8EA] border border-[#FCEECB]">
                  <div className="font-bold text-[#D4952B]">Discretionary ({split.discretionaryPercentage}%)</div>
                  <div className="text-base font-black font-mono-num text-[#181D26] mt-0.5">
                    {formatINR(split.discretionaryTotal)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Dining, Shopping, Entertainment</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 pt-3 border-t border-[#EDE8E0]">
            Fintech Standard: Aim for ≤ 50% on essentials, ≤ 30% on discretionary, and ≥ 20% on liquid savings.
          </div>
        </div>
      </div>

      {/* Two Column Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Category Donut & Breakdown */}
        <div className="editorial-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181D26]">Spending by Category</h3>
            <span className="text-[11px] font-mono-num text-[#7F899F] font-semibold">{categoryChartData.length} categories</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <div className="text-xs text-[#7F899F]">No category data recorded for this month</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0];
                        return (
                          <div className="p-2.5 rounded-xl bg-white border border-[#EDE8E0] text-xs shadow-md">
                            <span className="font-bold text-[#181D26]">{d.name}: </span>
                            <span className="font-mono-num font-bold text-[#2E8B57]">{formatINR(Number(d.value))}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pt-3 border-t border-[#EDE8E0]">
            {categoryChartData.map(c => {
              const pct = totalExpense > 0 ? Math.round((c.value / totalExpense) * 100) : 0;
              return (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[#3D4658] font-medium">{c.name}</span>
                  </div>
                  <div className="font-mono-num font-semibold text-[#181D26]">
                    {formatINR(c.value)} <span className="text-[#7F899F] text-[10px] font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Merchants & Budget Discipline */}
        <div className="space-y-6">
          {/* Top Merchants */}
          <div className="editorial-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#181D26] flex items-center gap-2">
                <Store className="w-4 h-4 text-[#D4952B]" />
                <span>Top Spending Merchants</span>
              </h3>
            </div>

            <div className="space-y-2">
              {topMerchants.length === 0 ? (
                <div className="text-xs text-[#7F899F] py-4 text-center">No merchants recorded this month</div>
              ) : (
                topMerchants.map((m, i) => (
                  <div
                    key={m.merchant}
                    className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white border border-[#EDE8E0] text-[#7F899F] text-[11px] font-bold flex items-center justify-center font-mono-num shadow-xs">
                        {i + 1}
                      </span>
                      <span className="text-xs font-bold text-[#181D26]">{m.merchant}</span>
                    </div>
                    <span className="text-xs font-bold font-mono-num text-[#181D26]">
                      {formatINR(m.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Budget Discipline Stats */}
          <div className="editorial-card p-6 grid grid-cols-2 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-[#F0F7F3] border border-[#CDE5D7]">
              <div className="text-xs font-bold text-[#2E8B57] flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Within Daily Target</span>
              </div>
              <div className="text-2xl font-black font-mono-num text-[#1E5C39] mt-1">
                {daysWithinBudget} <span className="text-xs font-normal">days</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F5C7BE]">
              <div className="text-xs font-bold text-[#E06D53] flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Over Daily Target</span>
              </div>
              <div className="text-2xl font-black font-mono-num text-[#A0351E] mt-1">
                {daysOverBudget} <span className="text-xs font-normal">days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
