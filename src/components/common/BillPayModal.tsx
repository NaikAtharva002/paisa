import React, { useState } from 'react';
import { RecurringPayment } from '../../types';
import { formatINR, advanceNextDueDate } from '../../lib/calculations';
import { store } from '../../lib/storage';
import { showToast } from './Toast';
import {
  X,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Copy,
  QrCode,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

interface BillPayModalProps {
  bill: RecurringPayment | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const BillPayModal: React.FC<BillPayModalProps> = ({
  bill,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const profile = store.getProfile();

  if (!isOpen || !bill) return null;

  // Generate UPI payment deep link
  // e.g. upi://pay?pa=paisa.pay@okhdfcbank&pn=JioFiber&am=499.00&cu=INR
  const merchantUpiId = `${bill.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(
    bill.name
  )}&am=${bill.amount.toFixed(2)}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(merchantUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmPaid = () => {
    // 1. Add expense transaction
    store.addTransaction({
      user_id: profile.user_id,
      transaction_date: new Date().toISOString(),
      merchant: bill.name,
      amount: bill.amount,
      transaction_type: 'expense',
      category_id: bill.category_id,
      payment_method: 'UPI',
      is_recurring: true,
      notes: `Bill payment confirmed (${bill.frequency}) via UPI flow`,
    });

    // 2. Advance due date so it's not overdue
    const nextDue = advanceNextDueDate(bill.next_due_date, bill.frequency);
    store.updateRecurringPayment(bill.id, { next_due_date: nextDue });

    showToast({
      type: 'success',
      title: `Payment Recorded for ${bill.name}!`,
      message: `Next due cycle advanced to ${nextDue}.`,
    });

    onPaymentSuccess?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181D26]/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#EDE8E0] shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#181D26]">Pay Recurring Bill</h3>
            <p className="text-[11px] text-[#7F899F]">Instant UPI Deep Link or Settlement</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close bill payment dialog"
            className="p-1.5 rounded-lg text-[#7F899F] hover:text-[#181D26] hover:bg-[#FAF8F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-[#181D26]">{bill.name}</div>
            <div className="text-[11px] text-[#7F899F] capitalize">
              {bill.frequency} billing • Due {bill.next_due_date}
            </div>
          </div>
          <div className="text-2xl font-black font-mono-num text-[#181D26]">
            {formatINR(bill.amount)}
          </div>
        </div>

        {/* Option 1: Mobile Instant UPI Deep Link */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#181D26] flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#D4952B]" /> Option A: Open Any UPI App (Mobile)
          </div>
          <a
            href={upiDeepLink}
            className="w-full py-3 px-4 rounded-xl bg-[#181D26] hover:bg-[#2A3241] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <span>Open Google Pay / PhonePe / Paytm</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className="text-[10px] text-[#7F899F] text-center">
            Launches installed UPI apps with amount pre-filled.
          </p>
        </div>

        {/* Option 2: Copy Merchant VPA / Manual Pay */}
        <div className="space-y-2 pt-2 border-t border-[#EDE8E0]">
          <div className="text-xs font-bold text-[#181D26] flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-[#3B82F6]" /> Option B: Pay via UPI ID / NetBanking
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={merchantUpiId}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] font-mono font-medium text-[#181D26] outline-none"
            />
            <button
              onClick={handleCopyUpi}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1"
            >
              {copiedUpi ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2E8B57]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="pt-3 border-t border-[#EDE8E0] space-y-2">
          <button
            type="button"
            onClick={handleConfirmPaid}
            className="w-full py-3 px-4 rounded-xl bg-[#2E8B57] hover:bg-[#257347] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark as Paid & Advance Schedule</span>
          </button>
          <div className="flex items-center justify-center gap-1 text-[10px] text-[#7F899F]">
            <ShieldCheck className="w-3 h-3 text-[#2E8B57]" />
            <span>Zero banking passwords required • Client-side calculation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
