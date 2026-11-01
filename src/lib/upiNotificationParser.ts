import { Transaction } from '../types';
import { roundPaise, toPaise, fromPaise, formatINR } from './calculations';
import { analyzeAndCategorizeTransaction, PersonEntity } from './transactionIntelligence';
import { store } from './storage';

export interface RawNotificationPayload {
  packageName?: string;
  title: string;
  text: string;
  subText?: string;
  timestamp?: number | string;
}

export type NotificationStatus =
  | 'success'
  | 'ignored_otp'
  | 'ignored_unrelated'
  | 'failed_transaction'
  | 'pending_transaction'
  | 'duplicate_detected';

export interface ParsedNotificationResult {
  isSensitive: boolean;
  isFinancial: boolean;
  status: NotificationStatus;
  reason?: string;
  sourceApp: string;
  extracted?: {
    amount: number;
    direction: 'expense' | 'income' | 'refund' | 'transfer';
    merchant: string;
    vpa?: string;
    refId?: string;
    date: string;
    rawDescription: string;
    confidenceTier: 'high' | 'medium' | 'low' | 'needs_review';
    categoryId: string;
    categoryName: string;
  };
  isDuplicate?: boolean;
  duplicateReason?: string;
  matchedExistingTxId?: string;
  isPotentialDuplicate?: boolean;
}

// ----------------------------------------------------------------------
// 1. Security Filter: Strictly reject OTPs, passwords, and sensitive codes
// ----------------------------------------------------------------------
const SENSITIVE_KEYWORDS = [
  'otp',
  'one-time password',
  'one time password',
  'verification code',
  'secret code',
  'security code',
  'do not share',
  'never share',
  'atm pin',
  'upi pin',
  'cvv',
  'login code',
];

export function isSensitiveNotification(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some(k => lower.includes(k));
}

// ----------------------------------------------------------------------
// 2. Package to Human-Readable App Name
// ----------------------------------------------------------------------
export function identifySourceApp(packageName?: string, title = ''): string {
  if (!packageName) {
    const t = title.toLowerCase();
    if (t.includes('google pay') || t.includes('gpay')) return 'Google Pay';
    if (t.includes('phonepe')) return 'PhonePe';
    if (t.includes('paytm')) return 'Paytm';
    if (t.includes('bhim')) return 'BHIM';
    if (t.includes('cred')) return 'CRED';
    return 'Android Notification';
  }

  const pkg = packageName.toLowerCase();
  if (pkg.includes('nbu.paisa') || pkg.includes('gpay')) return 'Google Pay';
  if (pkg.includes('phonepe')) return 'PhonePe';
  if (pkg.includes('paytm')) return 'Paytm';
  if (pkg.includes('npci.upiapp') || pkg.includes('bhim')) return 'BHIM';
  if (pkg.includes('dreamplug') || pkg.includes('cred')) return 'CRED';
  if (pkg.includes('amazon')) return 'Amazon Pay';
  if (pkg.includes('hdfc')) return 'HDFC Bank';
  if (pkg.includes('sbi')) return 'SBI';
  if (pkg.includes('icici')) return 'ICICI Bank';
  if (pkg.includes('axis')) return 'Axis Bank';
  if (pkg.includes('kbank') || pkg.includes('kotak')) return 'Kotak Bank';
  if (pkg.includes('messaging')) return 'Bank SMS Alert';

  return 'Android Notification';
}

// ----------------------------------------------------------------------
// 3. Amount Extraction Regex
// ----------------------------------------------------------------------
// Handles ₹250, ₹ 250.50, INR 1,500.00, Rs. 450, Rs 120, etc.
const AMOUNT_REGEX = /(?:₹|INR|Rs\.?|INR\s*|₹\s*)\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_FALLBACK_REGEX = /(?:paid|debited|credited|sent|received|spent|refund of)\s+(?:for\s+)?(?:₹|INR|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i;

export function extractAmount(text: string): number | null {
  const match = text.match(AMOUNT_REGEX) || text.match(AMOUNT_FALLBACK_REGEX);
  if (!match || !match[1]) return null;

  const cleanNumStr = match[1].replace(/,/g, '');
  const parsed = parseFloat(cleanNumStr);
  return isNaN(parsed) || parsed <= 0 ? null : roundPaise(parsed);
}

// ----------------------------------------------------------------------
// 4. Reference ID & VPA Extraction Regex
// ----------------------------------------------------------------------
const REF_ID_PATTERNS = [
  /(?:UPI\s+)?transaction\s*ID[: -]*([0-9A-Za-z]{8,22})/i,
  /UPI\s*Ref(?:\s*No)?[: -]*([0-9]{12})/i,
  /Ref(?:\s*No)?[: -]*([0-9A-Za-z]{8,18})/i,
  /UTR[: -]*([0-9]{12})/i,
  /UPI\/[A-Z0-9]*\/([0-9]{12})\//i,
  /Txn(?:\s*ID)?[: -]*([0-9A-Za-z]{8,22})/i,
  /RRN[: -]*([0-9]{12})/i,
];

export function extractReferenceId(text: string): string | undefined {
  for (const regex of REF_ID_PATTERNS) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

const VPA_REGEX = /([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,64})/i;

export function extractVpa(text: string): string | undefined {
  const match = text.match(VPA_REGEX);
  return match && match[1] ? match[1].toLowerCase().replace(/[.:;,-]+$/, '').trim() : undefined;
}

// ----------------------------------------------------------------------
// 5. Direction & Status Classifier
// ----------------------------------------------------------------------
export function detectDirectionAndStatus(text: string): {
  direction: 'expense' | 'income' | 'refund' | 'transfer';
  status: NotificationStatus;
} {
  const lower = text.toLowerCase();

  // 1. Failed Transactions
  if (
    lower.includes('failed') ||
    lower.includes('declined') ||
    lower.includes('unsuccessful') ||
    lower.includes('cancelled')
  ) {
    return { direction: 'expense', status: 'failed_transaction' };
  }

  // 2. Pending Transactions
  if (lower.includes('pending') || lower.includes('in progress') || lower.includes('processing')) {
    return { direction: 'expense', status: 'pending_transaction' };
  }

  // 3. Refunds & Reversals (Must not be treated as income!)
  if (
    lower.includes('refund') ||
    lower.includes('refunded') ||
    lower.includes('reversal') ||
    lower.includes('reversed') ||
    lower.includes('cashback')
  ) {
    return { direction: 'refund', status: 'success' };
  }

  // 4. Money In (Credits)
  if (
    lower.includes('received from') ||
    lower.includes('credited to') ||
    lower.includes('credited with') ||
    lower.includes('credited by') ||
    lower.includes('credited for') ||
    lower.includes('credited') ||
    lower.includes('received rs') ||
    lower.includes('received ₹') ||
    lower.includes('deposited')
  ) {
    return { direction: 'income', status: 'success' };
  }

  // 5. Internal Transfers between own accounts
  if (lower.includes('self transfer') || lower.includes('transfer to own')) {
    return { direction: 'transfer', status: 'success' };
  }

  // 6. Default: Money Out (Debits & Payments)
  return { direction: 'expense', status: 'success' };
}

// ----------------------------------------------------------------------
// 6. Merchant / Counterparty Extraction
// ----------------------------------------------------------------------
const NOISE_WORDS = [
  'was successful',
  'successful',
  'completed',
  'using upi',
  'via upi',
  'via google pay',
  'via phonepe',
  'on paytm',
  'bank a/c',
  'linked to upi',
];

export function extractMerchant(text: string, title = ''): string {
  const combined = `${title} ${text}`.trim();

  // Pattern 0: Refund from [Merchant]
  const refundMatch = text.match(/refund\s+(?:of\s+)?(?:₹|INR|Rs\.?)\s*[\d,.]*\s+from\s+([^.\n]+?)(?:\s+(?:has|credited|to|was|ref|utr|\.|\$))/i);
  if (refundMatch && refundMatch[1]) {
    const clean = cleanExtractedName(refundMatch[1]);
    if (clean) return clean;
  }

  // Pattern 1: Bank SMS debit "by UPI: [Merchant]" or "by UPI to [Merchant]"
  const bankUpiMatch = text.match(/by\s+UPI(?::|\s+to)?\s*([^.\n]+?)(?:\s+(?:Ref|Bal|on|Avail|\.|\$))/i);
  if (bankUpiMatch && bankUpiMatch[1]) {
    const clean = cleanExtractedName(bankUpiMatch[1]);
    if (clean) return clean;
  }

  // Pattern 2: Bank transfer "transfer from [Sender]"
  const transferFromMatch = text.match(/transfer\s+from\s+([^.\n]+?)(?:\s+(?:Ref|No|Bal|\.|\$))/i);
  if (transferFromMatch && transferFromMatch[1]) {
    const clean = cleanExtractedName(transferFromMatch[1]);
    if (clean) return clean;
  }

  // Pattern 3: "Paid/Sent/Payment of ₹X to [Recipient]"
  const paidToMatch = text.match(/(?:paid|sent|payment(?:\s+of)?)\s+(?:₹|INR|Rs\.?)\s*[\d,.]*\s+to\s+([^.\n]+?)(?:\s+(?:was\s+successful|successful|via|using|upi|ref|utr|rrn|txn|bal|\.|\$))/i);
  if (paidToMatch && paidToMatch[1]) {
    const clean = cleanExtractedName(paidToMatch[1]);
    if (clean) return clean;
  }

  // Fallback pattern 3b: "Paid to [Recipient]" without amount in between
  const paidToDirectMatch = text.match(/(?:paid|sent|payment\s+to)\s+([A-Za-z0-9 &._-]{2,30}?)(?:\s+(?:was\s+successful|successful|via|using|upi|ref|utr|\.|\$))/i);
  if (paidToDirectMatch && paidToDirectMatch[1]) {
    const clean = cleanExtractedName(paidToDirectMatch[1]);
    if (clean) return clean;
  }

  // Pattern 4: "Received ₹X from [Sender]"
  const receivedFromMatch = text.match(/(?:received|credited)\s+(?:₹|INR|Rs\.?)\s*[\d,.]*\s+from\s+([^.\n]+?)(?:\s+[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+|\s+(?:using|via|ref|utr|at|credited|\.|\$)|$)/i);
  if (receivedFromMatch && receivedFromMatch[1]) {
    const clean = cleanExtractedName(receivedFromMatch[1]);
    if (clean) return clean;
  }

  // Pattern 5: "Paid to [Recipient]" in Title (e.g. Google Pay title "Paid to Swiggy")
  if (title) {
    const titlePaidMatch = title.match(/paid\s+to\s+([^.\n]+)/i);
    if (titlePaidMatch && titlePaidMatch[1]) {
      const clean = cleanExtractedName(titlePaidMatch[1]);
      if (clean) return clean;
    }
  }

  // Try Bank Narration pattern: "UPI/[Merchant]/..."
  const upiNarrationMatch = text.match(/UPI\/(?:CR|DR)?\/?(?:[0-9]+\/)?([A-Za-z0-9 ._-]{3,30})\//i);
  if (upiNarrationMatch && upiNarrationMatch[1]) {
    return upiNarrationMatch[1].replace(/[_-]/g, ' ').trim();
  }

  // Check Title if informative
  if (title && !title.toLowerCase().includes('transaction') && !title.toLowerCase().includes('alert') && !title.toLowerCase().includes('payment')) {
    const cleanTitle = cleanExtractedName(title.replace(/(payment|successful|debited|credited|google pay|phonepe|paytm)/gi, ''));
    if (cleanTitle) {
      return cleanTitle;
    }
  }

  return 'Unknown Merchant';
}

function cleanExtractedName(raw: string): string {
  let cleaned = raw.trim();
  // Strip trailing VPAs like "blinkit@hdfcbank"
  cleaned = cleaned.replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+/g, '').trim();
  // Strip noise words
  NOISE_WORDS.forEach(noise => {
    cleaned = cleaned.replace(new RegExp(`\\b${noise}\\b`, 'gi'), '');
  });
  // Strip special suffixes like ". UTR" or ": "
  cleaned = cleaned.replace(/[.:;,-]+$/g, '').trim();
  if (cleaned.length >= 2 && !cleaned.toLowerCase().startsWith('rs') && !cleaned.toLowerCase().startsWith('inr')) {
    return cleaned;
  }
  return '';
}

// ----------------------------------------------------------------------
// 7. Multi-Factor Duplicate Detection Engine (Section 6)
// ----------------------------------------------------------------------
export function detectNotificationDuplicate(
  candidate: {
    amount: number;
    direction: 'expense' | 'income' | 'refund' | 'transfer';
    merchant: string;
    refId?: string;
    date: string; // YYYY-MM-DD
    timestampMs?: number;
    sourceApp: string;
  },
  existingTransactions: Transaction[]
): {
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedId?: string;
  isPotentialDuplicate?: boolean;
} {
  const candPaise = toPaise(candidate.amount);

  for (const existing of existingTransactions) {
    const existPaise = toPaise(existing.amount);

    // Rule 1: Exact Reference Match (100% Match)
    // E.g. Bank SMS and GPay alert share identical 12-digit UPI UTR
    if (
      candidate.refId &&
      existing.external_transaction_id &&
      candidate.refId === existing.external_transaction_id
    ) {
      return {
        isDuplicate: true,
        duplicateReason: `Exact transaction reference ID matched (${candidate.refId}) from ${candidate.sourceApp}.`,
        matchedId: existing.id,
      };
    }

    // Rule 2: Multi-Factor Pairing (Same Amount + Same Calendar Date + Similar Merchant/Source)
    const existDate = existing.transaction_date.slice(0, 10);
    const sameDate = existDate === candidate.date;
    const sameAmount = candPaise === existPaise;

    if (sameDate && sameAmount) {
      // Check time window if ISO timestamp available (within 15 minutes / 900,000 ms)
      let withinTimeWindow = true;
      if (candidate.timestampMs && existing.created_at) {
        const existMs = new Date(existing.created_at).getTime();
        const diffMs = Math.abs(candidate.timestampMs - existMs);
        withinTimeWindow = diffMs <= 15 * 60 * 1000;
      }

      const candNorm = candidate.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existNorm = existing.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
      const merchantOverlap =
        candNorm.length > 2 &&
        existNorm.length > 2 &&
        (candNorm.includes(existNorm) || existNorm.includes(candNorm));

      // If different external transaction IDs exist, they are distinct transactions
      if (candidate.refId && existing.external_transaction_id && candidate.refId !== existing.external_transaction_id) {
        continue;
      }

      if (withinTimeWindow && merchantOverlap) {
        return {
          isDuplicate: true,
          duplicateReason: `Identical UPI payment of ${formatINR(candidate.amount)} to ${existing.merchant} on ${candidate.date} already recorded.`,
          matchedId: existing.id,
        };
      }

      // Potential match requiring review (same amount and date, but different merchant)
      if (withinTimeWindow) {
        return {
          isDuplicate: false,
          isPotentialDuplicate: true,
          duplicateReason: `Similar amount (${formatINR(candidate.amount)}) found on ${candidate.date}. Flagged for review.`,
          matchedId: existing.id,
        };
      }
    }
  }

  return { isDuplicate: false };
}

// ----------------------------------------------------------------------
// 8. Master Notification Processing Pipeline
// ----------------------------------------------------------------------
export function parseUpiNotification(
  payload: RawNotificationPayload,
  existingTransactions: Transaction[] = [],
  peopleDirectory: PersonEntity[] = []
): ParsedNotificationResult {
  const combinedText = `${payload.title || ''} ${payload.text || ''} ${payload.subText || ''}`.trim();
  const sourceApp = identifySourceApp(payload.packageName, payload.title);

  // 1. Privacy & Security Check: Ignore OTPs, PINs, Passwords
  if (isSensitiveNotification(combinedText)) {
    return {
      isSensitive: true,
      isFinancial: false,
      status: 'ignored_otp',
      reason: 'Security Filter: Ignored notification containing OTP or authentication credentials.',
      sourceApp,
    };
  }

  // 1b. Promotional Marketing Filter
  const lowerCombined = combinedText.toLowerCase();
  const isMarketingPromo =
    (lowerCombined.includes('discount') ||
     lowerCombined.includes('coupon') ||
     lowerCombined.includes('promo') ||
     lowerCombined.includes('exclusive offer') ||
     lowerCombined.includes('cashback offer') ||
     lowerCombined.includes('flat rs') ||
     lowerCombined.includes('% off')) &&
    !lowerCombined.includes('debited') &&
    !lowerCombined.includes('credited') &&
    !lowerCombined.includes('paid ₹') &&
    !lowerCombined.includes('sent rs') &&
    !lowerCombined.includes('refund');

  if (isMarketingPromo) {
    return {
      isSensitive: false,
      isFinancial: false,
      status: 'ignored_unrelated',
      reason: 'Promotional marketing offer discarded.',
      sourceApp,
    };
  }

  // 2. Financial Indicator Check: Must contain amount or currency
  const extractedAmt = extractAmount(combinedText);
  if (!extractedAmt) {
    return {
      isSensitive: false,
      isFinancial: false,
      status: 'ignored_unrelated',
      reason: 'Notification does not contain financial transaction information.',
      sourceApp,
    };
  }

  // 3. Direction & Status
  const { direction, status } = detectDirectionAndStatus(combinedText);
  if (status === 'failed_transaction') {
    return {
      isSensitive: false,
      isFinancial: true,
      status: 'failed_transaction',
      reason: 'Transaction was marked as failed or declined by payment provider.',
      sourceApp,
      extracted: {
        amount: extractedAmt,
        direction,
        merchant: extractMerchant(payload.text, payload.title),
        date: new Date().toISOString().slice(0, 10),
        rawDescription: combinedText,
        confidenceTier: 'needs_review',
        categoryId: 'cat_other',
        categoryName: 'Other',
      },
    };
  }

  // 4. Counterparty, Reference ID, VPA
  const rawMerchant = extractMerchant(payload.text, payload.title);
  const vpa = extractVpa(combinedText);
  const refId = extractReferenceId(combinedText);

  // 5. Intelligent Categorization
  const userRules = store.getUserCategoryRules();
  const analysis = analyzeAndCategorizeTransaction(rawMerchant, combinedText, peopleDirectory, userRules);

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.slice(0, 10);
  const timestampMs = typeof payload.timestamp === 'number'
    ? payload.timestamp
    : (payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now());

  // 6. Duplicate Detection Check
  const dedupResult = detectNotificationDuplicate(
    {
      amount: extractedAmt,
      direction,
      merchant: analysis.extractedMerchant || rawMerchant,
      refId,
      date: dateStr,
      timestampMs,
      sourceApp,
    },
    existingTransactions
  );

  return {
    isSensitive: false,
    isFinancial: true,
    status: dedupResult.isDuplicate ? 'duplicate_detected' : status,
    sourceApp,
    isDuplicate: dedupResult.isDuplicate,
    duplicateReason: dedupResult.duplicateReason,
    matchedExistingTxId: dedupResult.matchedId,
    isPotentialDuplicate: dedupResult.isPotentialDuplicate,
    extracted: {
      amount: extractedAmt,
      direction,
      merchant: analysis.extractedMerchant || rawMerchant,
      vpa: vpa || analysis.vpaAddress,
      refId,
      date: dateStr,
      rawDescription: combinedText,
      confidenceTier: analysis.confidenceTier,
      categoryId: analysis.categoryId,
      categoryName: analysis.categoryName,
    },
  };
}
