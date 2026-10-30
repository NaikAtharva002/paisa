import { Transaction, PaymentMethod, TransactionType } from '../types';
import { suggestCategory, MerchantRule } from './categorization';
import { sanitizeCsvCell } from './security';

export interface ParsedCsvRow {
  rowNumber: number;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  payment_method: PaymentMethod;
  external_transaction_id?: string;
  is_credit_card_payment?: boolean;
  is_duplicate?: boolean;
  duplicate_reason?: string;
  raw: Record<string, string>;
}

/**
 * Normalizes a merchant name string for duplicate comparison.
 */
function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Parses CSV text into transaction records with duplicate detection.
 */
export function parseTransactionsCsv(
  csvContent: string,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): { validRows: ParsedCsvRow[]; duplicatesCount: number; errors: string[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    return { validRows: [], duplicatesCount: 0, errors: ['CSV file is empty or missing data rows.'] };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('txn date') || h.includes('time'));
  const merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('party') || h.includes('payee') || h.includes('to'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('particular') || h.includes('detail'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('withdrawal') || h.includes('value'));
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('cr/dr'));
  const paymentMethodIdx = headers.findIndex(h => h.includes('method') || h.includes('mode') || h.includes('channel'));
  const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('id') || h.includes('utr') || h.includes('txn id'));

  if (amountIdx === -1) {
    return { validRows: [], duplicatesCount: 0, errors: ['Could not find an "Amount" or "Debit" column in CSV header.'] };
  }

  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];
  let duplicatesCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i]);
    if (rawCols.length < 2) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] || '';
    });

    // Extract amount
    const rawAmountStr = (amountIdx !== -1 ? rawCols[amountIdx] : '').replace(/[^\d.-]/g, '');
    const amount = Math.abs(parseFloat(rawAmountStr));

    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: Invalid or zero amount "${rawCols[amountIdx]}"`);
      continue;
    }

    // Extract date
    let dateStr = dateIdx !== -1 ? rawCols[dateIdx].trim() : '';
    dateStr = normalizeDateString(dateStr);

    // Extract merchant & description
    const merchant = merchantIdx !== -1 && rawCols[merchantIdx] ? rawCols[merchantIdx].trim() : 'Unknown Merchant';
    const description = descIdx !== -1 && rawCols[descIdx] ? rawCols[descIdx].trim() : '';
    const externalId = refIdx !== -1 && rawCols[refIdx] ? rawCols[refIdx].trim() : undefined;

    // Detect payment method
    let method: PaymentMethod = 'UPI';
    const rawMethod = paymentMethodIdx !== -1 ? rawCols[paymentMethodIdx].toLowerCase() : '';
    if (rawMethod.includes('card') || rawMethod.includes('debit')) method = 'Debit card';
    else if (rawMethod.includes('credit')) method = 'Credit card';
    else if (rawMethod.includes('cash')) method = 'Cash';
    else if (rawMethod.includes('net') || rawMethod.includes('neft') || rawMethod.includes('rtgs')) method = 'Net banking';
    else if (rawMethod.includes('wallet')) method = 'Wallet';
    else if (rawMethod.includes('upi') || description.toLowerCase().includes('upi/')) method = 'UPI';

    // Categorization using learned custom rules + dictionary
    const catResult = suggestCategory(merchant, description, customRules);

    // Duplicate detection check
    const isDuplicate = checkDuplicate(
      { date: dateStr, amount, merchant, externalId },
      existingTransactions,
      validRows
    );

    if (isDuplicate.duplicate) {
      duplicatesCount++;
    }

    validRows.push({
      rowNumber: i + 1,
      date: dateStr,
      merchant,
      description,
      amount,
      type: 'expense',
      category_id: catResult.categoryId,
      payment_method: method,
      external_transaction_id: externalId,
      is_credit_card_payment: catResult.isCreditCardPayment,
      is_duplicate: isDuplicate.duplicate,
      duplicate_reason: isDuplicate.reason,
      raw: rowObj,
    });
  }

  return { validRows, duplicatesCount, errors };
}

/**
 * Checks if a transaction is already present in existing transactions or current batch.
 */
function checkDuplicate(
  candidate: { date: string; amount: number; merchant: string; externalId?: string },
  existing: Transaction[],
  currentBatch: ParsedCsvRow[]
): { duplicate: boolean; reason?: string } {
  // 1. Exact External Transaction ID match
  if (candidate.externalId) {
    const existingById = existing.find(t => t.external_transaction_id && t.external_transaction_id === candidate.externalId);
    if (existingById) {
      return { duplicate: true, reason: `Matches existing transaction ID: ${candidate.externalId}` };
    }
    const batchById = currentBatch.find(r => r.external_transaction_id && r.external_transaction_id === candidate.externalId);
    if (batchById) {
      return { duplicate: true, reason: `Duplicate transaction ID in CSV: ${candidate.externalId}` };
    }
  }

  // 2. Fuzzy match: Same Date + Exact Amount + Similar Merchant
  const normMerchant = normalizeString(candidate.merchant);
  for (const t of existing) {
    if (t.transaction_date.slice(0, 10) === candidate.date.slice(0, 10) && Math.abs(t.amount - candidate.amount) < 0.01) {
      const existingNorm = normalizeString(t.merchant);
      if (normMerchant === existingNorm || normMerchant.includes(existingNorm) || existingNorm.includes(normMerchant)) {
        return { duplicate: true, reason: `Exact date (${candidate.date}) and amount (₹${candidate.amount}) for "${candidate.merchant}" already exists.` };
      }
    }
  }

  // Check current batch for identical rows
  for (const b of currentBatch) {
    if (b.date.slice(0, 10) === candidate.date.slice(0, 10) && Math.abs(b.amount - candidate.amount) < 0.01) {
      const batchNorm = normalizeString(b.merchant);
      if (normMerchant === batchNorm) {
        return { duplicate: true, reason: `Repeated identical row in CSV.` };
      }
    }
  }

  return { duplicate: false };
}

/**
 * Normalizes different date strings (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) to YYYY-MM-DD.
 */
function normalizeDateString(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString().slice(0, 10);
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Splits a CSV line respecting quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Exports transactions to standard CSV format.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Merchant',
    'Description',
    'Category ID',
    'Amount (INR)',
    'Transaction Type',
    'Payment Method',
    'Is Unplanned',
    'External Reference ID',
    'Notes'
  ];

  const rows = transactions.map(t => [
    t.transaction_date,
    `"${sanitizeCsvCell(t.merchant || '').replace(/"/g, '""')}"`,
    `"${sanitizeCsvCell(t.description || '').replace(/"/g, '""')}"`,
    t.category_id,
    t.amount.toFixed(2),
    t.transaction_type,
    t.payment_method,
    t.is_unplanned ? 'YES' : 'NO',
    `"${sanitizeCsvCell(t.external_transaction_id || '').replace(/"/g, '""')}"`,
    `"${sanitizeCsvCell(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
