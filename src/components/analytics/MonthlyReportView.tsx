import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { store } from '../../lib/storage';
import { formatINR, isSpendingExpense, getDaysInMonth, calculateDailyIncomeEquivalent } from '../../lib/calculations';
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

  const handleDownloadReport = () => {
    const reportSummary = `PAISA FINANCIAL MONTHLY REPORT\nMonth: ${selectedMonth}\nGenerated: ${new Date().toISOString()}\n\nSUMMARY\nTotal Income: ₹${totalIncome}\nTotal Expenses: ₹${totalExpense}\nNet Savings: ₹${netCashFlow}\nAverage Daily Spend: ₹${avgDailySpend.toFixed(2)}\nHighest Spend Day: ${highestSpendDay.date} (₹${highestSpendDay.amount})\nDays Within Budget: ${daysWithinBudget}\nDays Over Budget: ${daysOverBudget}\n\nTOP CATEGORIES\n${categoryChartData.map(c => `${c.name}: ₹${c.value}`).join('\n')}\n\nTOP MERCHANTS\n${topMerchants.map(m => `${m.merchant}: ₹${m.amount}`).join('\n')}`;

    const blob = new Blob([reportSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `paisa_monthly_report_${selectedMonth}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Month Selector & Download Toolbar */}
      <div className="editorial-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center text-[#D4952B] shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="section-title text-[#7F899F]">Statement Month</div>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="mt-1 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-bold text-[#181D26] focus:outline-none focus:border-[#181D26]"
            />
          </div>
        </div>

        <button
          onClick={handleDownloadReport}
          className="btn-primary text-xs px-4 py-2"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Statement</span>
        </button>
      </div>

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
