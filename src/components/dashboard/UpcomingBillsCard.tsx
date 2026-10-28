import React from 'react';
import { RecurringPayment } from '../../types';
import { formatINR } from '../../lib/calculations';
import { Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Upcoming Bills & Subscriptions</span>
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {activeBills.slice(0, 3).map(bill => (
          <div
            key={bill.id}
            className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-200">{bill.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Due {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(bill.next_due_date))} • {bill.frequency}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-100 font-mono-num">
                {formatINR(bill.amount)}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {bill.auto_record ? 'Auto-track on' : 'Manual reminder'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
