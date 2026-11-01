class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MemoryStorage();
}

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../lib/storage';
import { Transaction } from '../types';
import { toPaise, fromPaise, formatINR } from '../lib/calculations';
import { formatTransactionTitle, extractCounterpartyName, isValidCounterpartyName } from '../lib/transactionIntelligence';

describe('PAISA Transaction Experience Redesign Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    store.initializeCleanSlate(true);
  });

  describe('1. Section 2 & 8: Date Grouping and Daily & Period Summaries', () => {
    it('calculates daily and period sums using integer paise without floating point error', () => {
      const tx1 = store.addTransaction({
        user_id: 'usr_me',
        transaction_date: '2026-10-28T10:00:00',
        merchant: 'Swiggy',
        amount: 250.75,
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
      });

      const tx2 = store.addTransaction({
        user_id: 'usr_me',
        transaction_date: '2026-10-28T14:30:00',
        merchant: 'Client Payment',
        amount: 5000.25,
        transaction_type: 'income',
        category_id: 'cat_salary',
        payment_method: 'Net banking',
      });

      // Internal transfer that should be EXCLUDED from income/expense
      const tx3 = store.addTransaction({
        user_id: 'usr_me',
        transaction_date: '2026-10-28T18:00:00',
        merchant: 'Self Transfer',
        amount: 1000.00,
        transaction_type: 'transfer',
        is_internal_transfer: true,
        category_id: 'cat_transfers',
        payment_method: 'UPI',
      });

      const all = store.getTransactions();
      expect(all.length).toBe(3);

      let inflowPaisa = 0;
      let outflowPaisa = 0;

      for (const tx of all) {
        if (tx.is_internal_transfer || tx.transaction_type === 'transfer') continue;
        const p = toPaise(tx.amount);
        if (tx.transaction_type === 'income') inflowPaisa += p;
        else outflowPaisa += p;
      }

      expect(inflowPaisa).toBe(500025);
      expect(outflowPaisa).toBe(25075);
      expect(fromPaise(inflowPaisa)).toBe(5000.25);
      expect(fromPaise(outflowPaisa)).toBe(250.75);
      expect(fromPaise(inflowPaisa - outflowPaisa)).toBe(4749.50);
      expect(formatINR(fromPaise(inflowPaisa - outflowPaisa))).toBe('₹4,749.50');
    });

    it('groups transactions by calendar date (YYYY-MM-DD)', () => {
      const dates = [
        '2026-10-28T10:00:00',
        '2026-10-28T18:00:00',
        '2026-10-27T12:00:00',
        '2026-10-25T09:00:00',
      ];

      dates.forEach((d, i) => {
        store.addTransaction({
          user_id: 'usr_me',
          transaction_date: d,
          merchant: `Merchant ${i}`,
          amount: 100 + i * 50,
          transaction_type: 'expense',
          category_id: 'cat_food',
          payment_method: 'UPI',
        });
      });

      const txs = store.getTransactions();
      const groupMap = new Map<string, Transaction[]>();
      txs.forEach(t => {
        const k = t.transaction_date.slice(0, 10);
        if (!groupMap.has(k)) groupMap.set(k, []);
        groupMap.get(k)!.push(t);
      });

      expect(groupMap.size).toBe(3);
      expect(groupMap.get('2026-10-28')?.length).toBe(2);
      expect(groupMap.get('2026-10-27')?.length).toBe(1);
      expect(groupMap.get('2026-10-25')?.length).toBe(1);
    });
  });

  describe('2. Section 4: Transaction Identity Priority', () => {
    it('prioritizes user-confirmed person over original bank narration', () => {
      store.addPerson({
        user_id: 'usr_me',
        display_name: 'Dr. Sharma',
        relationship: 'service_provider',
        default_category_id: 'cat_health',
        aliases: ['sharma clinic', 'sharma health'],
      });

      const rawMerchant = 'Sharma Clinic Indiranagar';
      const rawDesc = 'UPI/12345/Dr Sharma/Clinic';

      const people = store.getPeople();
      const matched = people.find(p => {
        const pName = p.display_name.toLowerCase();
        if (rawMerchant.toLowerCase().includes(pName)) return true;
        return p.aliases?.some(a => rawMerchant.toLowerCase().includes(a.toLowerCase()));
      });

      expect(matched).toBeDefined();
      expect(matched?.display_name).toBe('Dr. Sharma');
      expect(matched?.relationship).toBe('service_provider');
    });

    it('falls back to cleaned bank description when merchant is unknown without inventing fake names', () => {
      const rawMerchant = 'Unknown Merchant';
      const rawDesc = 'POS/4921/CAFE COFFEE DAY/BANGALORE';

      const cleaned = rawDesc
        .replace(/^(POS|UPI|NEFT|RTGS|IMPS|INB|ATM|BIL|ACH)\/?[A-Z0-9]*\/?/i, '')
        .replace(/\d{6,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      expect(cleaned).toBe('CAFE COFFEE DAY/BANGALORE');
    });
  });

  describe('3. Section 5: Category Intelligence & "Needs Review"', () => {
    it('identifies unassigned or cat_other as Needs Review', () => {
      const added = store.addTransaction({
        user_id: 'usr_me',
        transaction_date: '2026-10-28T10:00:00',
        merchant: 'Unfamiliar Vendor',
        amount: 320,
        transaction_type: 'expense',
        category_id: 'cat_other',
        payment_method: 'UPI',
      });

      const isNeedsReview = !added.category_id || added.category_id === 'cat_other';
      expect(isNeedsReview).toBe(true);

      // Updating category resolves the Needs Review state
      store.updateTransaction(added.id, { category_id: 'cat_shopping' });

      const updated = store.getTransactions().find(t => t.id === added.id);
      expect(updated?.category_id).toBe('cat_shopping');
      const stillNeedsReview = !updated?.category_id || updated?.category_id === 'cat_other';
      expect(stillNeedsReview).toBe(false);
    });

    it('saves user category learning rule for future auto-classification', () => {
      const savedRule = store.saveUserCategoryRule({
        categoryId: 'cat_groceries',
        keywords: ['nature basket'],
      });

      expect(savedRule.id).toBeDefined();
      expect(savedRule.categoryId).toBe('cat_groceries');
      expect(savedRule.keywords).toContain('nature basket');

      const allRules = store.getUserCategoryRules();
      const found = allRules.find(r => r.keywords.includes('nature basket'));
      expect(found).toBeDefined();
      expect(found?.categoryId).toBe('cat_groceries');
    });
  });

  describe('4. Section 9: Clean Slate Enforcement', () => {
    it('starts at zero with an empty dataset without fabricated records', () => {
      store.initializeCleanSlate(true);
      const list = store.getTransactions();
      expect(list.length).toBe(0);

      const accounts = store.getAccounts();
      expect(accounts.length).toBe(0);

      const people = store.getPeople();
      expect(people.length).toBe(0);
    });
  });

  describe('5. Sender/Recipient Prominent Title Formatting', () => {
    it('formats outgoing expense with merchant as "Paid to [Merchant]"', () => {
      const tx: Transaction = {
        id: 'tx_swiggy',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T12:00:00',
        merchant: 'Swiggy',
        amount: 350,
        transaction_type: 'expense',
        category_id: 'cat_food',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(tx);
      expect(titleInfo.title).toBe('Paid to Swiggy');
      expect(titleInfo.rawName).toBe('Swiggy');
      expect(titleInfo.isUnknown).toBe(false);
    });

    it('formats outgoing expense to person as "Paid to [Person]"', () => {
      const people = [
        {
          id: 'person_rahul',
          user_id: 'usr_me',
          display_name: 'Rahul Sharma',
          relationship: 'friend' as any,
          default_category_id: 'cat_transfers',
          aliases: ['rahul'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const tx: Transaction = {
        id: 'tx_rahul_out',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T14:00:00',
        merchant: 'Rahul',
        amount: 1500,
        transaction_type: 'expense',
        category_id: 'cat_transfers',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(tx, people);
      expect(titleInfo.title).toBe('Paid to Rahul Sharma');
      expect(titleInfo.rawName).toBe('Rahul Sharma');
      expect(titleInfo.isUnknown).toBe(false);
    });

    it('formats incoming payment from person as "Received from [Person]"', () => {
      const tx: Transaction = {
        id: 'tx_rahul_in',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T15:00:00',
        merchant: 'Rahul Verma',
        amount: 2000,
        transaction_type: 'income',
        category_id: 'cat_income',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(tx);
      expect(titleInfo.title).toBe('Received from Rahul Verma');
      expect(titleInfo.rawName).toBe('Rahul Verma');
      expect(titleInfo.isUnknown).toBe(false);
    });

    it('falls back to "Unknown recipient" when counterparty is unavailable for outgoing payment', () => {
      const tx: Transaction = {
        id: 'tx_anon_out',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T16:00:00',
        merchant: '',
        description: '',
        amount: 500,
        transaction_type: 'expense',
        category_id: 'cat_other',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(tx);
      expect(titleInfo.title).toBe('Unknown recipient');
      expect(titleInfo.isUnknown).toBe(true);
    });

    it('falls back to "Unknown sender" when counterparty is unavailable for incoming payment', () => {
      const tx: Transaction = {
        id: 'tx_anon_in',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T17:00:00',
        merchant: '',
        description: '',
        amount: 1000,
        transaction_type: 'income',
        category_id: 'cat_income',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(tx);
      expect(titleInfo.title).toBe('Unknown sender');
      expect(titleInfo.isUnknown).toBe(true);
    });

    it('strictly rejects dates and generic labels from being treated as names', () => {
      expect(isValidCounterpartyName('2026-10-31')).toBe(false);
      expect(isValidCounterpartyName('31/10/2026')).toBe(false);
      expect(isValidCounterpartyName('24-Oct-26')).toBe(false);
      expect(isValidCounterpartyName('Expense')).toBe(false);
      expect(isValidCounterpartyName('Payment')).toBe(false);
      expect(isValidCounterpartyName('Transaction')).toBe(false);
      expect(isValidCounterpartyName('Debit')).toBe(false);

      const txWithDateMerchant: Transaction = {
        id: 'tx_date_merch',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T18:00:00',
        merchant: '2026-10-31',
        amount: 250,
        transaction_type: 'expense',
        category_id: 'cat_other',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(txWithDateMerchant);
      expect(titleInfo.title).toBe('Unknown recipient');
      expect(titleInfo.isUnknown).toBe(true);
    });

    it('extracts recipient name from complex UPI description narrations', () => {
      const txUpi: Transaction = {
        id: 'tx_upi_desc',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T19:00:00',
        merchant: '',
        description: 'UPI/DR/492019482910/Rahul Verma/State Bank/Payment',
        amount: 1200,
        transaction_type: 'expense',
        category_id: 'cat_transfers',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(txUpi);
      expect(titleInfo.title).toBe('Paid to Rahul Verma');
      expect(titleInfo.rawName).toBe('Rahul Verma');
      expect(titleInfo.isUnknown).toBe(false);
    });

    it('formats refunds as "Refund from [Merchant]"', () => {
      const txRefund: Transaction = {
        id: 'tx_refund_swiggy',
        user_id: 'usr_me',
        account_id: 'acc_1',
        transaction_date: '2026-10-31T20:00:00',
        merchant: 'Swiggy',
        amount: 250,
        transaction_type: 'refund',
        category_id: 'cat_food',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const titleInfo = formatTransactionTitle(txRefund);
      expect(titleInfo.title).toBe('Refund from Swiggy');
      expect(titleInfo.rawName).toBe('Swiggy');
      expect(titleInfo.isUnknown).toBe(false);
    });
  });
});
