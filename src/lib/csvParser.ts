import { Transaction, PaymentMethod, TransactionType } from '../types';
import { suggestCategory, MerchantRule } from './categorization';
import { sanitizeCsvCell } from './security';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

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

export interface StatementParseResult {
  validRows: ParsedCsvRow[];
  duplicatesCount: number;
  errors: string[];
  requiresPassword?: boolean;
}

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB safety limit
export const MAX_IMPORT_ROWS = 5000;

// Set PDF.js worker path for browser & PWA environments
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch {
    // Fallback if workerSrc cannot be set statically
  }
}

/**
 * Normalizes a merchant name string for duplicate comparison.
 */
function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Cleans raw Indian bank statement narration strings to extract human-readable merchant names.
 * e.g., "UPI-SWIGGY-swiggy@icici-UPI-5283910283" -> "Swiggy"
 * e.g., "POS 412345 AMAZON INDIA MUMBAI" -> "Amazon India Mumbai"
 * e.g., "ACH DR NETFLIX" -> "Netflix"
 */
export function extractCleanMerchant(raw: string): string {
  if (!raw) return 'Unknown Merchant';
  let str = raw.trim();

  // Strip prefixes like UPI/, IMPS/, NEFT/, POS 412345, ACH DR, etc.
  str = str.replace(/^(?:UPI|IMPS|NEFT|RTGS|ACH|POS(?:\s+\d+)?|ATM|ECOM|INF|INB)[\s\/:_-]+/i, '');
  str = str.replace(/^(?:DR|CR)[\s\/:_-]+/i, '');

  // Strip VPA handles e.g. "SWIGGY-swiggy@icici" or "swiggy@icici" -> "Swiggy"
  if (str.includes('@')) {
    const parts = str.split(/[-_@/]/);
    if (parts[0] && parts[0].length > 1) {
      str = parts[0];
    }
  }

  // Strip trailing transaction IDs / reference numbers
  str = str.replace(/[\/_-](?:UPI|IMPS|NEFT|RTGS)?[\s\/:_-]*\d{6,}[\w\d\-_]*/gi, '');
  str = str.replace(/[\/](?:payment|pay|transfer|bill)[\/]?/gi, '');

  // Capitalize properly if all uppercase
  if (str === str.toUpperCase() && str.length > 2) {
    str = str
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return str.trim() || raw.trim();
}

/**
 * Splits a CSV line respecting quotes.
 */
export function parseCsvLine(line: string): string[] {
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
 * Normalizes different date strings (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 28 Oct 2026) to YYYY-MM-DD.
 */
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString().slice(0, 10);
  }

  const clean = dateStr.trim();

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Handle DD-Mon-YYYY or DD Mon YYYY e.g. 28-Oct-2026 or 28 Oct 2026
  const monMatch = clean.match(/^(\d{1,2})[-/\s]+([A-Za-z]{3})[-/\s]+(\d{4})/);
  if (monMatch) {
    const day = monMatch[1].padStart(2, '0');
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthNames[monMatch[2].toLowerCase()] || '01';
    const year = monMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
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
      return { duplicate: true, reason: `Duplicate transaction ID in batch: ${candidate.externalId}` };
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
        return { duplicate: true, reason: `Repeated identical row in batch.` };
      }
    }
  }

  return { duplicate: false };
}

/**
 * Parses CSV text into transaction records with duplicate detection.
 * Automatically handles bank statements with top metadata preambles.
 */
export function parseTransactionsCsv(
  csvContent: string,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): StatementParseResult {
  const rawLines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (rawLines.length < 2) {
    return { validRows: [], duplicatesCount: 0, errors: ['Statement file is empty or missing data rows.'] };
  }

  // Detect header line index (skips bank preambles like "HDFC BANK LIMITED", "Account Statement", etc.)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawLines.length, 30); i++) {
    const l = rawLines[i].toLowerCase();
    const hasDate = l.includes('date') || l.includes('txn dt') || l.includes('value dt') || l.includes('time');
    const hasAmountOrDesc =
      l.includes('amount') ||
      l.includes('debit') ||
      l.includes('withdrawal') ||
      l.includes('deposit') ||
      l.includes('credit') ||
      l.includes('particular') ||
      l.includes('narration') ||
      l.includes('desc');

    if (hasDate && hasAmountOrDesc) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // Fall back to first line if no clear header was detected
    headerIndex = 0;
  }

  const headerLine = rawLines[headerIndex];
  const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('txn dt') || h.includes('value dt') || h.includes('time'));
  const merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('party') || h.includes('payee') || h.includes('to'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('particular') || h.includes('detail'));
  
  // Debit / Withdrawal and Credit / Deposit detection
  const withdrawalIdx = headers.findIndex(h => h.includes('withdrawal') || h.includes('debit') || h === 'dr');
  const depositIdx = headers.findIndex(h => h.includes('deposit') || h.includes('credit') || h === 'cr');
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('value'));
  
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('cr/dr') || h === 'd/c');
  const paymentMethodIdx = headers.findIndex(h => h.includes('method') || h.includes('mode') || h.includes('channel'));
  const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('id') || h.includes('utr') || h.includes('txn id') || h.includes('chq'));

  if (amountIdx === -1 && withdrawalIdx === -1 && depositIdx === -1) {
    return { validRows: [], duplicatesCount: 0, errors: ['Could not find an "Amount", "Withdrawal/Debit", or "Deposit/Credit" column in statement header.'] };
  }

  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];
  let duplicatesCount = 0;

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const rawCols = parseCsvLine(rawLines[i]);
    if (rawCols.length < 2) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] || '';
    });

    let amount = 0;
    let txType: TransactionType = 'expense';

    // Separate Debit/Credit columns check
    const withdrawalStr = withdrawalIdx !== -1 && rawCols[withdrawalIdx] ? rawCols[withdrawalIdx].replace(/[^\d.-]/g, '') : '';
    const depositStr = depositIdx !== -1 && rawCols[depositIdx] ? rawCols[depositIdx].replace(/[^\d.-]/g, '') : '';
    const withdrawalVal = withdrawalStr ? parseFloat(withdrawalStr) : 0;
    const depositVal = depositStr ? parseFloat(depositStr) : 0;

    if (withdrawalVal > 0) {
      amount = withdrawalVal;
      txType = 'expense';
    } else if (depositVal > 0) {
      amount = depositVal;
      txType = 'income';
    } else if (amountIdx !== -1 && rawCols[amountIdx]) {
      const rawAmt = rawCols[amountIdx].replace(/[^\d.-]/g, '');
      const parsedAmt = parseFloat(rawAmt);
      if (!isNaN(parsedAmt) && parsedAmt !== 0) {
        amount = Math.abs(parsedAmt);
        if (parsedAmt < 0) {
          txType = 'expense';
        }
      }
    }

    // Check Type / Cr/Dr indicator column
    if (typeIdx !== -1 && rawCols[typeIdx]) {
      const tVal = rawCols[typeIdx].toLowerCase().trim();
      if (tVal.includes('cr') || tVal.includes('credit') || tVal.includes('income') || tVal.includes('deposit')) {
        txType = 'income';
      } else if (tVal.includes('dr') || tVal.includes('debit') || tVal.includes('expense') || tVal.includes('withdrawal')) {
        txType = 'expense';
      }
    }

    if (isNaN(amount) || amount <= 0) {
      continue; // Skip summary/closing balance rows or zero rows
    }

    // Extract date
    let dateStr = dateIdx !== -1 ? rawCols[dateIdx].trim() : '';
    dateStr = normalizeDateString(dateStr);

    // Extract merchant & description
    const rawMerchant = merchantIdx !== -1 && rawCols[merchantIdx] ? rawCols[merchantIdx].trim() : '';
    const rawDesc = descIdx !== -1 && rawCols[descIdx] ? rawCols[descIdx].trim() : '';
    const externalId = refIdx !== -1 && rawCols[refIdx] ? rawCols[refIdx].trim() : undefined;

    const chosenNarr = rawMerchant || rawDesc || 'Bank Transaction';
    const merchant = extractCleanMerchant(chosenNarr);
    const description = rawDesc || rawMerchant || '';

    // Detect payment method
    let method: PaymentMethod = 'UPI';
    const rawMethod = paymentMethodIdx !== -1 ? rawCols[paymentMethodIdx].toLowerCase() : '';
    const combinedText = `${rawMethod} ${description} ${merchant}`.toLowerCase();

    if (combinedText.includes('debit card') || combinedText.includes('pos ') || combinedText.includes('ecom')) method = 'Debit card';
    else if (combinedText.includes('credit card')) method = 'Credit card';
    else if (combinedText.includes('cash') || combinedText.includes('atm')) method = 'Cash';
    else if (combinedText.includes('net') || combinedText.includes('neft') || combinedText.includes('rtgs') || combinedText.includes('inb') || combinedText.includes('inf')) method = 'Net banking';
    else if (combinedText.includes('wallet') || combinedText.includes('paytm wallet')) method = 'Wallet';
    else if (combinedText.includes('upi')) method = 'UPI';

    // Categorization
    const catResult = suggestCategory(merchant, description, customRules);
    const categoryId = txType === 'income' ? 'income' : catResult.categoryId;

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
      type: txType,
      category_id: categoryId,
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
 * Parses structured JSON transaction exports.
 */
export function parseTransactionsJson(
  jsonContent: string,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): StatementParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return { validRows: [], duplicatesCount: 0, errors: ['Invalid JSON format: could not parse file.'] };
  }

  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'transactions' in parsed && Array.isArray((parsed as Record<string, unknown>).transactions)
    ? ((parsed as Record<string, unknown>).transactions as unknown[])
    : [];

  if (items.length === 0) {
    return { validRows: [], duplicatesCount: 0, errors: ['JSON file contains no transaction records or arrays.'] };
  }

  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];
  let duplicatesCount = 0;

  items.slice(0, MAX_IMPORT_ROWS).forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Record ${idx + 1}: Malformed transaction object.`);
      return;
    }

    const row = item as Record<string, unknown>;
    const rawAmount = parseFloat(String(row.amount || row.value || row.debit || '0').replace(/[^\d.-]/g, ''));
    if (isNaN(rawAmount) || rawAmount <= 0) {
      errors.push(`Record ${idx + 1}: Invalid or zero amount "${row.amount}".`);
      return;
    }

    const dateStr = normalizeDateString(String(row.date || row.transaction_date || row.timestamp || new Date().toISOString()));
    const rawMerchant = String(row.merchant || row.payee || row.narration || row.description || 'Unknown Merchant').trim();
    const merchant = extractCleanMerchant(rawMerchant);
    const description = String(row.description || row.narration || '').trim();
    const externalId = row.external_transaction_id || row.ref || row.reference_id || row.id
      ? String(row.external_transaction_id || row.ref || row.reference_id || row.id)
      : undefined;

    const isIncome = row.type === 'income' || String(row.type).toLowerCase() === 'cr';
    const txType: TransactionType = isIncome ? 'income' : 'expense';

    const catResult = suggestCategory(merchant, description, customRules);
    const categoryId = txType === 'income' ? 'income' : String(row.category_id || catResult.categoryId);

    const isDuplicate = checkDuplicate(
      { date: dateStr, amount: rawAmount, merchant, externalId },
      existingTransactions,
      validRows
    );

    if (isDuplicate.duplicate) duplicatesCount++;

    validRows.push({
      rowNumber: idx + 1,
      date: dateStr,
      merchant,
      description,
      amount: rawAmount,
      type: txType,
      category_id: categoryId,
      payment_method: (row.payment_method || 'UPI') as PaymentMethod,
      external_transaction_id: externalId,
      is_credit_card_payment: catResult.isCreditCardPayment,
      is_duplicate: isDuplicate.duplicate,
      duplicate_reason: isDuplicate.reason,
      raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)])),
    });
  });

  return { validRows, duplicatesCount, errors };
}

/**
 * Parses Excel (.xlsx, .xls) statements using SheetJS (XLSX).
 */
export function parseTransactionsExcel(
  buffer: ArrayBuffer | Uint8Array,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): StatementParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { validRows: [], duplicatesCount: 0, errors: ['Excel workbook does not contain any sheets.'] };
    }

    // Pick first non-empty sheet
    let chosenSheet: XLSX.WorkSheet | null = null;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!ref']) {
        chosenSheet = sheet;
        break;
      }
    }

    if (!chosenSheet) {
      return { validRows: [], duplicatesCount: 0, errors: ['Excel sheet contains no data.'] };
    }

    // Convert sheet to CSV format with proper cell stringification
    const csvContent = XLSX.utils.sheet_to_csv(chosenSheet);
    return parseTransactionsCsv(csvContent, existingTransactions, userId, customRules);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { validRows: [], duplicatesCount: 0, errors: [`Failed to parse Excel statement: ${msg}`] };
  }
}

/**
 * Parses PDF bank statements on-device using PDF.js.
 * Handles encrypted/password-protected PDFs gracefully.
 */
export async function parseTransactionsPdf(
  buffer: ArrayBuffer | Uint8Array,
  password: string | undefined,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): Promise<StatementParseResult> {
  try {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      password: password || undefined,
    });

    let pdfDoc;
    try {
      pdfDoc = await loadingTask.promise;
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (
        e?.name === 'PasswordException' ||
        e?.name === 'PasswordResponses' ||
        e?.message?.toLowerCase().includes('password')
      ) {
        return {
          validRows: [],
          duplicatesCount: 0,
          errors: ['PDF statement is password protected. Enter password to unlock.'],
          requiresPassword: true,
        };
      }
      throw err;
    }

    const lines: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      interface TextItem {
        str: string;
        x: number;
        y: number;
      }
      const items: TextItem[] = [];

      for (const rawItem of textContent.items) {
        if ('str' in rawItem && rawItem.str.trim()) {
          items.push({
            str: rawItem.str,
            x: rawItem.transform[4],
            y: rawItem.transform[5],
          });
        }
      }

      // Group items on roughly the same horizontal line (within 3.5 points Y tolerance)
      const lineMap: Map<number, TextItem[]> = new Map();
      for (const item of items) {
        const roundedY = Math.round(item.y / 3.5) * 3.5;
        if (!lineMap.has(roundedY)) {
          lineMap.set(roundedY, []);
        }
        lineMap.get(roundedY)!.push(item);
      }

      // Sort lines top to bottom (Y descending in PDF coordinates)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const y of sortedYs) {
        const rowItems = lineMap.get(y)!;
        // Sort items left to right
        rowItems.sort((a, b) => a.x - b.x);
        const lineStr = rowItems.map(it => it.str.trim()).join('   ');
        if (lineStr.trim()) {
          lines.push(lineStr.trim());
        }
      }
    }

    if (lines.length === 0) {
      return {
        validRows: [],
        duplicatesCount: 0,
        errors: ['Could not extract readable text from this PDF. It may be a scanned image statement.'],
      };
    }

    return parsePdfTextLines(lines, existingTransactions, userId, customRules);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      validRows: [],
      duplicatesCount: 0,
      errors: [`Failed to parse PDF statement: ${msg}`],
    };
  }
}

/**
 * Extracts transactions from sorted text lines of an Indian bank PDF statement.
 */
function parsePdfTextLines(
  lines: string[],
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): StatementParseResult {
  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];
  let duplicatesCount = 0;

  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b|\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;
  const amountRegex = /\b(?:\d{1,3}(?:,\d{2,3})*|\d+)\.\d{2}\b/g;

  lines.forEach((line, idx) => {
    // Check if line contains a date
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) return;

    // Check for amounts (must have decimal point .00)
    const amounts = line.match(amountRegex);
    if (!amounts || amounts.length === 0) return;

    const dateStr = normalizeDateString(dateMatch[0]);

    // Parse amounts: if multiple amounts exist (e.g. Withdrawal, Deposit, Balance)
    const parsedAmounts = amounts.map(a => parseFloat(a.replace(/,/g, '')));
    const txAmount = parsedAmounts[0];
    if (isNaN(txAmount) || txAmount <= 0) return;

    // Determine transaction type
    const isIncome = /\b(CR|Credit|Deposit|Refund|Salary)\b/i.test(line);
    const txType: TransactionType = isIncome ? 'income' : 'expense';

    // Remove date and amount strings from line to isolate narration
    let cleanLine = line.replace(dateMatch[0], '');
    amounts.forEach(a => {
      cleanLine = cleanLine.replace(a, '');
    });
    // Remove balance/ref indicator keywords
    cleanLine = cleanLine.replace(/\b(?:CR|DR|INR|Rs\.?|Closing\s+Balance|Balance)\b/gi, '').trim();

    const merchant = extractCleanMerchant(cleanLine);
    const description = cleanLine;

    // Method detection
    let method: PaymentMethod = 'UPI';
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('debit') || lowerLine.includes('pos')) method = 'Debit card';
    else if (lowerLine.includes('credit card')) method = 'Credit card';
    else if (lowerLine.includes('cash') || lowerLine.includes('atm')) method = 'Cash';
    else if (lowerLine.includes('neft') || lowerLine.includes('rtgs') || lowerLine.includes('net')) method = 'Net banking';
    else if (lowerLine.includes('wallet')) method = 'Wallet';
    else if (lowerLine.includes('upi')) method = 'UPI';

    const catResult = suggestCategory(merchant, description, customRules);
    const categoryId = txType === 'income' ? 'income' : catResult.categoryId;

    const isDuplicate = checkDuplicate(
      { date: dateStr, amount: txAmount, merchant },
      existingTransactions,
      validRows
    );

    if (isDuplicate.duplicate) duplicatesCount++;

    validRows.push({
      rowNumber: idx + 1,
      date: dateStr,
      merchant,
      description,
      amount: txAmount,
      type: txType,
      category_id: categoryId,
      payment_method: method,
      is_credit_card_payment: catResult.isCreditCardPayment,
      is_duplicate: isDuplicate.duplicate,
      duplicate_reason: isDuplicate.reason,
      raw: { line },
    });
  });

  if (validRows.length === 0) {
    errors.push('No transactions detected in statement. Verify that statement is not an image-based scan.');
  }

  return { validRows, duplicatesCount, errors };
}

/**
 * Universal async statement parser supporting CSV, JSON, Excel (.xlsx, .xls), and PDF (.pdf).
 */
export async function parseStatementFileAsync(
  file: File,
  password: string | undefined,
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): Promise<StatementParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    return parseTransactionsExcel(arrayBuffer, existingTransactions, userId, customRules);
  }

  if (fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    return parseTransactionsPdf(arrayBuffer, password, existingTransactions, userId, customRules);
  }

  const text = await file.text();
  if (fileName.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    return parseTransactionsJson(text, existingTransactions, userId, customRules);
  }

  return parseTransactionsCsv(text, existingTransactions, userId, customRules);
}

/**
 * Legacy synchronous wrapper for CSV and JSON backward compatibility.
 */
export function parseStatementFile(
  content: string,
  fileFormat: 'csv' | 'json',
  existingTransactions: Transaction[],
  userId: string,
  customRules: MerchantRule[] = []
): StatementParseResult {
  if (fileFormat === 'json') {
    return parseTransactionsJson(content, existingTransactions, userId, customRules);
  }
  return parseTransactionsCsv(content, existingTransactions, userId, customRules);
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
    'Notes',
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

/**
 * Exports transactions to formatted Excel (.xlsx) workbook.
 */
export function exportTransactionsToExcel(transactions: Transaction[]): Uint8Array {
  const data = transactions.map(t => ({
    'Date': t.transaction_date.slice(0, 10),
    'Merchant': t.merchant,
    'Description': t.description || '',
    'Category': t.category_id,
    'Amount (INR)': t.amount,
    'Type': t.transaction_type,
    'Payment Method': t.payment_method,
    'Is Unplanned': t.is_unplanned ? 'Yes' : 'No',
    'Reference ID': t.external_transaction_id || '',
    'Notes': t.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}
