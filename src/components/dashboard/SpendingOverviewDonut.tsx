import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatINR } from '../../lib/calculations';
import { store } from '../../lib/storage';

interface SpendingOverviewDonutProps {
  totalSpent: number;
  categorySpends: Array<{
    name: string;
    amount: number;
    color: string;
    percentage: number;
  }>;
}

export const SpendingOverviewDonut: React.FC<SpendingOverviewDonutProps> = ({
  totalSpent,
  categorySpends,
}) => {
  const [activeTab, setActiveTab] = useState<'month' | 'quarter' | 'year'>('month');

  // Palette corresponding directly to Reference 2
  const fallbackColors = ['#E06D53', '#D4952B', '#2E8B57', '#3B82F6', '#8B5CF6', '#A4ADC0'];

  const chartData = categorySpends.length > 0 ? categorySpends : [
    { name: 'Food & Dining', amount: 9104, color: '#E06D53', percentage: 32 },
    { name: 'Shopping', amount: 5116, color: '#D4952B', percentage: 18 },
    { name: 'Transport', amount: 3408, color: '#2E8B57', percentage: 12 },
    { name: 'Bills & Utilities', amount: 2845, color: '#3B82F6', percentage: 10 },
    { name: 'Entertainment', amount: 2276, color: '#8B5CF6', percentage: 8 },
    { name: 'Others', amount: 5701, color: '#A4ADC0', percentage: 20 },
  ];

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
                      <div className="p-2 rounded-xl bg-[#141820] text-white text-xs border border-[#222936] shadow-floating">
                        <span className="font-bold">{d.name}: </span>
                        <span className="font-mono-num text-[#D4952B] font-bold">
                          {formatINR(Number(d.value))}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center readout (Reference 2) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-base sm:text-lg font-black font-mono-num text-[#181D26] leading-none">
              {formatINR(totalSpent)}
            </span>
            <span className="text-[10px] text-[#7F899F] font-semibold mt-0.5">Total Spent</span>
          </div>
        </div>

        {/* Right Category Legend Table (Reference 2) */}
        <div className="sm:col-span-7 space-y-2 text-xs">
          {chartData.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.color || fallbackColors[i % fallbackColors.length] }}
                />
                <span className="text-[#3D4658] font-medium truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono-num flex-shrink-0">
                <span className="text-[#7F899F] text-[11px]">{c.percentage}%</span>
                <span className="text-[#181D26] font-bold text-right w-16">
                  {formatINR(c.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
