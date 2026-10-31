import React from 'react';
import { RecurringPayment } from '../../types';
import { formatINR } from '../../lib/calculations';
import { ArrowRight } from 'lucide-react';

interface UpcomingBillsCardProps {
  recurringPayments: RecurringPayment[];
  onViewAll: () => void;
  onPayBill?: (bill: RecurringPayment) => void;
}

export const UpcomingBillsCard: React.FC<UpcomingBillsCardProps> = ({
  recurringPayments,
  onViewAll,
  onPayBill,
}) => {
  const activeBills = recurringPayments.filter(r => r.is_active);

  // Helper for brand colors & logos (Reference 2)
  const getBrandLogo = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('jio')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#0F288E] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          Jio
        </div>
      );
    }
    if (lower.includes('spotify')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#1DB954] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          ♫
        </div>
      );
    }
    if (lower.includes('netflix')) {
      return (
        <div className="w-8 h-8 rounded-full bg-black text-[#E50914] text-[13px] font-black flex items-center justify-center flex-shrink-0 shadow-sm border border-black/10">
          N
        </div>
      );
    }
    if (lower.includes('google')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#4285F4] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
          1
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#EDE8E0] text-[#D4952B] text-xs font-bold flex items-center justify-center flex-shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#EDE8E0] shadow-card flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#181D26]">Upcoming Bills</h3>
          <p className="text-xs text-[#7F899F] mt-0.5">Recurring commitments</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#D4952B] hover:text-[#B87D1E] font-bold flex items-center gap-1 group transition-colors"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {activeBills.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#7F899F] space-y-2">
          <p>No upcoming bills or recurring commitments.</p>
          <button
            onClick={onViewAll}
            className="text-[11px] font-bold text-[#D4952B] hover:underline"
          >
            + Add recurring bill
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBills.slice(0, 3).map(bill => {
            const dueDate = new Date(bill.next_due_date);
            const daysLeft = Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <div
                key={bill.id}
                className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] hover:border-[#DFD7C7] transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getBrandLogo(bill.name)}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#181D26] truncate">{bill.name}</div>
                    <div className="text-[11px] text-[#7F899F] mt-0.5 font-mono-num flex items-center gap-1.5">
                      <span className="font-bold text-[#181D26]">{formatINR(bill.amount)}</span>
                      <span>•</span>
                      <span className="text-[#D4952B] font-semibold">Due in {daysLeft} days</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onPayBill?.(bill)}
                  className="px-3 py-1 rounded-full bg-white border border-[#EDE8E0] hover:border-[#D4952B] hover:text-[#D4952B] text-xs font-bold text-[#262D3B] transition-colors shadow-sm"
                >
                  Pay
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
