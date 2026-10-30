import React from 'react';
import { RecurringPayment } from '../../types';
import { formatINR } from '../../lib/calculations';
import { Calendar, ArrowRight } from 'lucide-react';

interface UpcomingBillsCardProps {
  recurringPayments: RecurringPayment[];
  onViewAll: () => void;
}

export const UpcomingBillsCard: React.FC<UpcomingBillsCardProps> = ({
  recurringPayments,
  onViewAll,
}) => {
  const activeBills = recurringPayments.filter(r => r.is_active);

  return (
    <div className="p-6 rounded-2xl bg-[#0D1426] border border-white/[0.08] shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Upcoming Bills & Subscriptions</span>
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="space-y-2.5">
        {activeBills.slice(0, 3).map(bill => {
          const dueDate = new Date(bill.next_due_date);
          const formattedDue = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(dueDate);

          return (
            <div
              key={bill.id}
              className="p-3.5 rounded-xl bg-[#06091A] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-100">{bill.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="text-amber-400/90 font-medium">Due {formattedDue}</span>
                  <span>•</span>
                  <span className="capitalize">{bill.frequency}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100 font-mono-num">
                  {formatINR(bill.amount)}
                </div>
                <div className="text-[10px] text-slate-500 capitalize mt-0.5">
                  {bill.auto_record ? 'Auto-tracked' : 'Manual reminder'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
