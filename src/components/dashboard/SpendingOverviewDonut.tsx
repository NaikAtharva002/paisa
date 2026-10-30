import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { store } from '../../lib/storage';

interface SpendingOverviewDonutProps {
  totalSpent?: number;
  categorySpends?: Array<{
    name: string;
    amount: number;
    color: string;
    percentage: number;
  }>;
}

export const SpendingOverviewDonut: React.FC<SpendingOverviewDonutProps> = () => {
  const [activeTab, setActiveTab] = useState<'month' | 'quarter' | 'year'>('month');

  const transactions = store.getTransactions();
  const categories = store.getCategories();
  const catMap = new Map(categories.map(c => [c.id, { name: c.name, color: c.color }]));

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const yearPrefix = `${currentYear}-`;
  const ninetyDaysAgoIso = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

  // Filter transactions according to selected tab
  const relevantTxs = transactions.filter(t => {
    if (!isSpendingExpense(t)) return false;
    const dateStr = t.transaction_date.slice(0, 10);
    if (activeTab === 'month') return t.transaction_date.startsWith(monthPrefix);
    if (activeTab === 'quarter') return dateStr >= ninetyDaysAgoIso;
    if (activeTab === 'year') return t.transaction_date.startsWith(yearPrefix);
    return true;
  });

  const catAmountMap = new Map<string, number>();
  let totalPeriodSpent = 0;

  relevantTxs.forEach(t => {
    catAmountMap.set(t.category_id, (catAmountMap.get(t.category_id) || 0) + t.amount);
    totalPeriodSpent += t.amount;
  });

  const fallbackColors = ['#E06D53', '#D4952B', '#2E8B57', '#3B82F6', '#8B5CF6', '#A4ADC0'];

  const chartData = Array.from(catAmountMap.entries())
    .map(([catId, amount], idx) => {
      const meta = catMap.get(catId);
      const percentage = totalPeriodSpent > 0 ? Math.round((amount / totalPeriodSpent) * 100) : 0;
      return {
        name: meta?.name || 'General',
        amount,
        color: meta?.color || fallbackColors[idx % fallbackColors.length],
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between h-full">
      {/* Top Header & Range Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#181D26]">Spending Overview</h3>
          <p className="text-xs text-[#7F899F] mt-0.5">Category distribution</p>
        </div>

        {/* Time Tabs (Reference 2) */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EDE8E0] text-[11px] font-semibold text-[#5E687D] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('month')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === 'month' ? 'bg-white text-[#181D26] shadow-sm font-bold' : 'hover:text-[#181D26]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setActiveTab('quarter')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === 'quarter' ? 'bg-white text-[#181D26] shadow-sm font-bold' : 'hover:text-[#181D26]'
            }`}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setActiveTab('year')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === 'year' ? 'bg-white text-[#181D26] shadow-sm font-bold' : 'hover:text-[#181D26]'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Donut Chart & Category Table Grid */}
      {chartData.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#7F899F]">
          No expenses recorded for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Left Donut */}
          <div className="sm:col-span-5 relative flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || fallbackColors[index % fallbackColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      return (
                        <div className="p-2.5 rounded-xl bg-[#141820] text-white text-xs shadow-floating border border-[#222936]">
                          <span className="font-bold text-[#D4952B]">{d.name}: </span>
                          <span className="font-mono-num font-bold text-white">{formatINR(Number(d.value))}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] font-mono-num font-extrabold text-[#181D26]">
                {formatINR(totalPeriodSpent, false)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#7F899F] font-semibold">
                Total Spent
              </span>
            </div>
          </div>

          {/* Right Category Breakdown Table */}
          <div className="sm:col-span-7 space-y-2 max-h-48 overflow-y-auto pr-1">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#3D4658] font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono-num font-bold text-[#181D26] flex-shrink-0">
                  <span className="text-[11px] text-[#7F899F] font-normal w-7 text-right">
                    {item.percentage}%
                  </span>
                  <span className="w-16 text-right">{formatINR(item.amount, false)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
