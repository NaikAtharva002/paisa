import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Transaction } from '../../types';
import { formatINR, isSpendingExpense } from '../../lib/calculations';
import { TrendingUp } from 'lucide-react';

interface CumulativeSpendingChartProps {
  transactions: Transaction[];
  dailyBudget: number;
}

export const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
  transactions,
  dailyBudget,
}) => {
  const todayExpenses = transactions
    .filter(isSpendingExpense)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  // Build cumulative chart points starting from morning 8:00 AM (0 spend)
  let cumulative = 0;
  const data = [
    { time: '08:00', spent: 0, merchant: 'Start of Day' },
    ...todayExpenses.map(tx => {
      cumulative += tx.amount;
      const t = new Date(tx.transaction_date);
      const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      return {
        time: timeStr,
        spent: cumulative,
        merchant: tx.merchant,
        singleAmount: tx.amount,
      };
    })
  ];

  const maxSpend = Math.max(dailyBudget * 1.25, cumulative * 1.15, 1000);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Cumulative Spending Velocity</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Spending trajectory vs. your ₹{Math.round(dailyBudget).toLocaleString('en-IN')} daily ceiling
          </p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cumulative > dailyBudget ? '#EF4444' : '#10B981'} stopOpacity={0.4} />
                <stop offset="95%" stopColor={cumulative > dailyBudget ? '#EF4444' : '#10B981'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              domain={[0, Math.ceil(maxSpend)]}
              tickFormatter={val => `₹${val}`}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1">
                      <div className="font-bold text-slate-200">{pt.time} — {pt.merchant}</div>
                      <div className="text-emerald-400 font-mono-num font-bold">
                        Total Spent: {formatINR(pt.spent)}
                      </div>
                      {pt.singleAmount && (
                        <div className="text-slate-400 text-[11px]">
                          Txn: {formatINR(pt.singleAmount)}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={dailyBudget}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              label={{
                value: `Limit: ${formatINR(dailyBudget, false)}`,
                fill: '#F59E0B',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Area
              type="monotone"
              dataKey="spent"
              stroke={cumulative > dailyBudget ? '#EF4444' : '#10B981'}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#spendGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
