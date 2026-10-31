import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseTransactionsExcel,
  exportTransactionsToExcel,
  parseTransactionsCsv,
  extractCleanMerchant,
  normalizeDateString,
  ParsedCsvRow,
} from '../lib/csvParser';
import { Transaction } from '../types';

describe('PAISA Multi-Format Statement Parsing Suite (Excel & PDF)', () => {
  const dummyExisting: Transaction[] = [
    {
      id: 'tx-existing-1',
      user_id: 'user-1',
      transaction_date: '2026-10-25T10:00:00Z',
      amount: 450,
      merchant: 'Swiggy',
      category_id: 'food',
      transaction_type: 'expense',
      payment_method: 'UPI',
      external_transaction_id: 'UPI-EXISTING-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  describe('1. Merchant Narration Normalization', () => {
    it('should clean complex Indian bank narration strings into readable merchants', () => {
      expect(extractCleanMerchant('UPI-SWIGGY-swiggy@icici-UPI-5283910283')).toBe('Swiggy');
      expect(extractCleanMerchant('UPI/ZOMATO/1283910284/PAYMENT')).toBe('Zomato');
      expect(extractCleanMerchant('POS 412345 AMAZON INDIA MUMBAI')).toBe('Amazon India Mumbai');
      expect(extractCleanMerchant('ACH DR NETFLIX')).toBe('Netflix');
      expect(extractCleanMerchant('SALARY CREDIT ACME CORP')).toBe('Salary Credit Acme Corp');
      expect(extractCleanMerchant('NEFT CR-GOOGLE INDIA-1029384')).toBe('Google India');
    });

    it('should handle dates in multiple Indian bank formats', () => {
      expect(normalizeDateString('28/10/2026')).toBe('2026-10-28');
      expect(normalizeDateString('28-10-2026')).toBe('2026-10-28');
      expect(normalizeDateString('2026-10-28')).toBe('2026-10-28');
      expect(normalizeDateString('28 Oct 2026')).toBe('2026-10-28');
      expect(normalizeDateString('28-OCT-2026')).toBe('2026-10-28');
    });
  });

  describe('2. Excel Statement Import (.xlsx / .xls)', () => {
    it('should parse an Excel workbook with bank metadata preambles', () => {
      const sheetData = [
        ['HDFC BANK LIMITED'],
        ['Account Statement - 50100234567890'],
        ['Customer: Atharva Naik'],
        [],
        ['Date', 'Narration', 'Chq/Ref No', 'Withdrawal Amt', 'Deposit Amt', 'Closing Balance'],
        ['28/10/2026', 'UPI-SWIGGY-swiggy@icici-UPI-5283910283', 'UPI-5283910283', '450.00', '', '48,250.00'],
        ['28/10/2026', 'UPI-BLINKIT-blinkit@axl-UPI-5283910284', 'UPI-5283910284', '600.00', '', '47,650.00'],
        ['27/10/2026', 'SALARY CREDIT ACME CORP', 'SAL-OCT26-001', '', '85000.00', '132,650.00'],
        ['26/10/2026', 'POS 412345 AMAZON INDIA MUMBAI', 'POS-847291', '1299.00', '', '131,351.00'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const result = parseTransactionsExcel(buffer, dummyExisting, 'user-1');

      expect(result.errors.length).toBe(0);
      expect(result.validRows.length).toBe(4);

      // Check row 1: Swiggy expense
      const swiggyRow = result.validRows.find(r => r.merchant === 'Swiggy');
      expect(swiggyRow).toBeDefined();
      expect(swiggyRow?.amount).toBe(450);
      expect(swiggyRow?.type).toBe('expense');
      expect(swiggyRow?.category_id).toBe('cat_food');

      // Check row 3: Salary income
      const salaryRow = result.validRows.find(r => r.merchant.includes('Salary'));
      expect(salaryRow).toBeDefined();
      expect(salaryRow?.amount).toBe(85000);
      expect(salaryRow?.type).toBe('income');
      expect(salaryRow?.category_id).toBe('income');

      // Check row 4: Amazon expense
      const amazonRow = result.validRows.find(r => r.merchant.includes('Amazon'));
      expect(amazonRow).toBeDefined();
      expect(amazonRow?.amount).toBe(1299);
      expect(amazonRow?.type).toBe('expense');
      expect(amazonRow?.category_id).toBe('cat_shopping');
    });

    it('should detect duplicate records against existing transactions', () => {
      const sheetData = [
        ['Date', 'Merchant', 'Amount', 'Payment Method', 'Ref ID'],
        ['2026-10-25', 'Swiggy', '450.00', 'UPI', 'UPI-EXISTING-001'], // Exact ID match
        ['2026-10-28', 'FreshToHome', '350.00', 'UPI', 'UPI-FTH-002'],  // Unique
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const result = parseTransactionsExcel(buffer, dummyExisting, 'user-1');
      expect(result.validRows.length).toBe(2);
      expect(result.duplicatesCount).toBe(1);

      const duplicate = result.validRows.find(r => r.is_duplicate);
      expect(duplicate).toBeDefined();
      expect(duplicate?.merchant).toBe('Swiggy');
    });
  });

  describe('3. Excel Statement Export (.xlsx)', () => {
    it('should export transactions into a valid Excel workbook and read it back', () => {
      const txsToExport: Transaction[] = [
        {
          id: 'tx-exp-1',
          user_id: 'user-1',
          transaction_date: '2026-10-28T12:00:00Z',
          amount: 1500,
          merchant: 'Zomato Dining',
          category_id: 'food',
          transaction_type: 'expense',
          payment_method: 'Credit card',
          created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
        },
        {
          id: 'tx-exp-2',
          user_id: 'user-1',
          transaction_date: '2026-10-27T10:00:00Z',
          amount: 50000,
          merchant: 'Freelance Payout',
          category_id: 'income',
          transaction_type: 'income',
          payment_method: 'Net banking',
          created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
        },
      ];

      const excelBytes = exportTransactionsToExcel(txsToExport);
      expect(excelBytes.length).toBeGreaterThan(0);

      // Verify the generated Excel workbook is valid by re-reading with XLSX
      const wb = XLSX.read(excelBytes, { type: 'array' });
      expect(wb.SheetNames).toContain('Transactions');
      const sheet = wb.Sheets['Transactions'];
      const rows = XLSX.utils.sheet_to_json(sheet) as Array<Record<string, unknown>>;

      expect(rows.length).toBe(2);
      expect(rows[0]['Merchant']).toBe('Zomato Dining');
      expect(rows[0]['Amount (INR)']).toBe(1500);
      expect(rows[1]['Merchant']).toBe('Freelance Payout');
      expect(rows[1]['Amount (INR)']).toBe(50000);
    });
  });

  describe('4. Resilient CSV & Statement Text Parsing', () => {
    it('should parse multi-column bank CSV with Cr/Dr indicators', () => {
      const csv = `Txn Date,Particulars,Amount,Cr/Dr
28/10/2026,SWIGGY BANGALORE,450.00,DR
27/10/2026,SALARY CLIENT,50000.00,CR`;

      const result = parseTransactionsCsv(csv, dummyExisting, 'user-1');
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].type).toBe('expense');
      expect(result.validRows[1].type).toBe('income');
    });

    it('should return helpful error when file contains no valid columns', () => {
      const invalidCsv = `ColA,ColB,ColC\n1,2,3`;
      const result = parseTransactionsCsv(invalidCsv, dummyExisting, 'user-1');
      expect(result.validRows.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
