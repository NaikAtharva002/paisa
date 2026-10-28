import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense, getDaysInMonth, calculateDailyIncomeEquivalent } from '../../lib/calculations';
import {
  PieChart as PieIcon,
  Download,
  Calendar,
  TrendingDown,
  TrendingUp,
  Award,
  AlertTriangle,
  Receipt,
  Store,
} from 'lucide-react';

export const MonthlyReportView: React.FC = () => {
  const transactions = store.getTransactions();
  const categories = store.getCategories();
  const profile = store.getProfile();

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

  // Spending by Category
  const catSpendMap = new Map<string, number>();
  const merchantSpendMap = new Map<string, number>();
  const daySpendMap = new Map<string, number>();

  monthTxs.forEach(t => {
    if (isSpendingExpense(t)) {
      // Category
      catSpendMap.set(t.category_id, (catSpendMap.get(t.category_id) || 0) + t.amount);
      // Merchant
      merchantSpendMap.set(t.merchant, (merchantSpendMap.get(t.merchant) || 0) + t.amount);
      // Day
      const dayStr = t.transaction_date.slice(0, 10);
      daySpendMap.set(dayStr, (daySpendMap.get(dayStr) || 0) + t.amount);
    }
  });

  const categoryChartData = Array.from(catSpendMap.entries()).map(([catId, amount]) => {
    const meta = catMap.get(catId);
    return {
      name: meta?.name || 'Other',
      value: amount,
      color: meta?.color || '#94A3B8',
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

  const avgDailySpend = daySpendMap.size > 0 
    ? Number((totalExpense / daySpendMap.size).toFixed(2)) 
    : 0;

  const handleDownloadReport = () => {
    const reportText = `================================================
PAISA — MONTHLY FINANCIAL REALITY REPORT
Month: ${selectedMonth}
================================================
Monthly Take-Home: ${formatINR(totalIncome)}
Total Discretionary Spending: ${formatINR(totalExpense)}
Net Cash Flow / Surplus: ${formatINR(netCashFlow)}
Average Daily Spend: ${formatINR(avgDailySpend)}
Highest Spending Day: ${highestSpendDay.date} (${formatINR(highestSpendDay.amount)})
Days Within Budget: ${daysWithinBudget}
Days Over Budget: ${daysOverBudget}

TOP SPENDING CATEGORIES:
${categoryChartData.map(c => `- ${c.name}: ${formatINR(c.value)}`).join('\n')}

TOP 5 MERCHANTS:
${topMerchants.map(m => `- ${m.merchant}: ${formatINR(m.amount)}`).join('\n')}
================================================`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paisa_monthly_report_${selectedMonth}.txt`;
    a.click();
  };

  return (
    <div className="space-y-5">
      
      {/* Month picker & Download header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Reporting Month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold"
          />
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Summary Report</span>
        </button>
      </div>

      {/* 3 Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Monthly Income</div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono-num mt-1">
            {formatINR(totalIncome)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Salary & cash inflows</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Discretionary Spending</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono-num mt-1">
            {formatINR(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {Math.round((totalExpense / totalIncome) * 100)}% of income used
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Net Cash Flow</div>
          <div className={`text-xl sm:text-2xl font-extrabold font-mono-num mt-1 ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatINR(netCashFlow)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Surplus remaining to save</div>
        </div>
      </div>

      {/* Category Breakdown & Top Merchants side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Category Pie Chart */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Spending by Category</span>
          </h3>

          {categoryChartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500">
              No category data for this month.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatINR(value), 'Spent']}
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category legends */}
              <div className="space-y-1.5 flex-1 w-full">
                {categoryChartData.slice(0, 5).map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-300 font-medium">{c.name}</span>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-100">{formatINR(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Merchants */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Top Spending Merchants</span>
          </h3>

          <div className="space-y-2.5">
            {topMerchants.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                No merchant data logged.
              </div>
            ) : (
              topMerchants.map((m, idx) => (
                <div
                  key={m.merchant}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center font-mono-num">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{m.merchant}</span>
                  </div>
                  <span className="text-xs font-bold font-mono-num text-slate-100">
                    {formatINR(m.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Discipline & Rhythm Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Daily Average</div>
          <div className="text-base font-bold font-mono-num text-slate-100 mt-1">{formatINR(avgDailySpend)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Peak Spend Day</div>
          <div className="text-base font-bold font-mono-num text-amber-400 mt-1">
            {highestSpendDay.amount > 0 ? formatINR(highestSpendDay.amount) : '₹0'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Days Under Budget</div>
          <div className="text-base font-bold font-mono-num text-emerald-400 mt-1">{daysWithinBudget} days</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Days Over Budget</div>
          <div className="text-base font-bold font-mono-num text-red-400 mt-1">{daysOverBudget} days</div>
        </div>
      </div>

    </div>
  );
};
