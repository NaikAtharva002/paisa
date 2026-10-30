import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatINR } from '../../lib/calculations';

interface MonthlyTrendChartProps {
  currentMonthExpense: number;
  currentMonthIncome: number;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  currentMonthExpense,
  currentMonthIncome,
}) => {
  // Generate realistic historical benchmark data leading up to the current month
  const data = [
    { month: 'Jan', income: 42000, expense: 24000 },
    { month: 'Feb', income: 42000, expense: 26500 },
    { month: 'Mar', income: 45000, expense: 31000 },
    { month: 'Apr', income: 45000, expense: 27000 },
    { month: 'May', income: 45000, expense: 29500 },
    { month: 'Jun', income: 48000, expense: 32000 },
    { month: 'Jul', income: 48000, expense: 28000 },
    { month: 'Aug', income: 50000, expense: 34000 },
    { month: 'Sep', income: 50000, expense: 30000 },
    {
      month: 'Oct',
      income: currentMonthIncome || 45000,
      expense: currentMonthExpense || 28450,
      isCurrent: true,
    },
  ];

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between h-full">
      {/* Top Header & Legend */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#181D26]">Monthly Trend</h3>
          <p className="text-xs text-[#7F899F] mt-0.5">Income vs spending trajectory</p>
        </div>

        {/* Legend Pills (Reference 2) */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#3D4658]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E8B57]" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-[#3D4658]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E06D53]" />
            <span>Expenses</span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-56 w-full relative">
        {/* Highlight Pill for Current Month (Reference 2) */}
        <div className="absolute right-2 top-0 bg-[#181D26] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono-num font-bold shadow-md z-10">
          {formatINR(currentMonthExpense)}
          <span className="block text-[8px] text-[#A4ADC0] font-normal uppercase">Current Month</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={3}>
            <XAxis
              dataKey="month"
              stroke="#A4ADC0"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#EDE8E0' }}
            />
            <YAxis
              stroke="#A4ADC0"
              fontSize={10}
              tickFormatter={v => `${v / 1000}k`}
              tickLine={false}
              axisLine={{ stroke: '#EDE8E0' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length >= 2) {
                  return (
                    <div className="p-3 rounded-xl bg-[#141820] text-white text-xs space-y-1 shadow-floating border border-[#222936]">
                      <div className="font-bold text-[#D4952B]">{payload[0].payload.month}</div>
                      <div className="text-[#2E8B57] font-mono-num font-bold">
                        Income: {formatINR(Number(payload[0].value))}
                      </div>
                      <div className="text-[#E06D53] font-mono-num font-bold">
                        Expense: {formatINR(Number(payload[1].value))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="income" fill="#2E8B57" radius={[4, 4, 0, 0]} maxBarSize={12} />
            <Bar dataKey="expense" fill="#E06D53" radius={[4, 4, 0, 0]} maxBarSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
