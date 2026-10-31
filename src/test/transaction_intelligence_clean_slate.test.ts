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
import { store, CLEAN_USER, CLEAN_PROFILE } from '../lib/storage';
import {
  analyzeAndCategorizeTransaction,
  generateFinancialIntelligenceReport,
  answerFinancialQuestion,
  PersonEntity,
} from '../lib/transactionIntelligence';
import { Transaction } from '../types';
import { roundPaise } from '../lib/calculations';

describe('PAISA Transaction Intelligence & Clean Slate Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    store.initializeCleanSlate();
  });

  describe('1. Clean Slate Absolute Zero Initialization', () => {
    it('initializes a fresh user with zero demo records across all entities', () => {
      const user = store.getUser();
      const profile = store.getProfile();
      const transactions = store.getTransactions();
      const accounts = store.getAccounts();
      const budgets = store.getCategoryBudgets();
      const goals = store.getSavingsGoals();
      const recurring = store.getRecurringPayments();
      const people = store.getPeople();

      expect(user.display_name).toBe(CLEAN_USER.display_name);
      expect(profile.monthly_income).toBe(0);
      expect(profile.savings_target).toBe(0);
      expect(profile.fixed_commitments).toBe(0);
      expect(transactions.length).toBe(0);
      expect(accounts.length).toBe(0);
      expect(Object.keys(budgets).length).toBe(0);
      expect(goals.length).toBe(0);
      expect(recurring.length).toBe(0);
      expect(people.length).toBe(0);
    });

    it('calculates total balance as exactly ₹0 when no accounts exist', () => {
      const accounts = store.getAccounts();
      const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
      expect(totalBalance).toBe(0);
    });
  });

  describe('2. Multi-Layer Transaction Categorization (20+ Indian Bank Scenarios)', () => {
    it('categorizes Swiggy and Zomato UPI payments into Food & Dining', () => {
      const res1 = analyzeAndCategorizeTransaction('UPI-SWIGGY-swiggy@icici-UPI-5283910283');
      expect(res1.categoryId).toBe('cat_food');
      expect(res1.confidenceTier).toBe('high');
      expect(res1.direction).toBe('debit');

      const res2 = analyzeAndCategorizeTransaction('UPI/ZOMATO/1283910284/PAYMENT');
      expect(res2.categoryId).toBe('cat_food');
      expect(res2.confidenceTier).toBe('high');
    });

    it('categorizes quick commerce (Blinkit, Zepto, Instamart) into Groceries', () => {
      const res1 = analyzeAndCategorizeTransaction('UPI/Blinkit/blinkit@axl/Order 9283');
      expect(res1.categoryId).toBe('cat_groceries');
      expect(res1.confidenceTier).toBe('high');

      const res2 = analyzeAndCategorizeTransaction('ZEPTO GROCERY MUMBAI IN');
      expect(res2.categoryId).toBe('cat_groceries');
      expect(res2.confidenceTier).toBe('high');
    });

    it('categorizes ride hailing (Uber, Ola, Rapido) into Transport', () => {
      const res1 = analyzeAndCategorizeTransaction('UBER INDIA SYSTEMS PVT LTD BANGALORE');
      expect(res1.categoryId).toBe('cat_transport');
      expect(res1.confidenceTier).toBe('high');

      const res2 = analyzeAndCategorizeTransaction('RAPIDO AUTO RIDE');
      expect(res2.categoryId).toBe('cat_transport');
      expect(res2.confidenceTier).toBe('high');
    });

    it('categorizes e-commerce shopping (Amazon, Flipkart, Myntra) into Shopping', () => {
      const res1 = analyzeAndCategorizeTransaction('POS 412345 AMAZON INDIA MUMBAI');
      expect(res1.categoryId).toBe('cat_shopping');
      expect(res1.confidenceTier).toBe('high');

      const res2 = analyzeAndCategorizeTransaction('FLIPKART INTERNET PVT LTD');
      expect(res2.categoryId).toBe('cat_shopping');
      expect(res2.confidenceTier).toBe('high');
    });

    it('detects corporate salary credits and assigns cat_income with credit direction', () => {
      const res = analyzeAndCategorizeTransaction('NEFT CR-SALARY CREDIT INFOSYS LTD-1029384');
      expect(res.categoryId).toBe('cat_income');
      expect(res.isSalary).toBe(true);
      expect(res.direction).toBe('credit');
      expect(res.confidenceTier).toBe('high');
    });

    it('detects refunds and chargebacks with credit direction', () => {
      const res = analyzeAndCategorizeTransaction('REV-AMAZON SELLER REFUND-91823');
      expect(res.categoryId).toBe('cat_income');
      expect(res.isRefund).toBe(true);
      expect(res.direction).toBe('credit');
    });

    it('detects credit card payments via CRED or settlements and flags isCreditCardPayment', () => {
      const res = analyzeAndCategorizeTransaction('CRED CLUB BBPS PAYMENT HDFC CARD');
      expect(res.categoryId).toBe('cat_transfers');
      expect(res.isCreditCardPayment).toBe(true);
      expect(res.isInternalTransfer).toBe(true);
    });

    it('detects investments (Zerodha, Groww) into Investments', () => {
      const res = analyzeAndCategorizeTransaction('ZERODHA BROKING LTD FUNDS ADDED');
      expect(res.categoryId).toBe('cat_investments');
      expect(res.confidenceTier).toBe('high');
    });

    it('detects digital subscriptions (Netflix, Spotify) into Subscriptions', () => {
      const res = analyzeAndCategorizeTransaction('ACH DR NETFLIX ENTERTAINMENT');
      expect(res.categoryId).toBe('cat_subscriptions');
      expect(res.isRecurringCandidate).toBe(true);
    });

    it('falls back safely to cat_other with needs_review for unknown merchants', () => {
      const res = analyzeAndCategorizeTransaction('RAMESH TRADERS LATUR MAHARASHTRA');
      expect(res.categoryId).toBe('cat_other');
      expect(res.confidenceTier).toBe('needs_review');
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  describe('3. People & Merchants Directory with User Control', () => {
    it('starts 100% empty and allows adding custom identity with relationship', () => {
      expect(store.getPeople().length).toBe(0);

      const landlord = store.addPerson({
        display_name: 'Sharma Ji',
        relationship: 'landlord',
        default_category_id: 'cat_rent',
        aliases: ['Sharma House Rent', 'Sharma Landlord', 'sharmaji@oksbi'],
        upi_vpa: 'sharmaji@oksbi',
        user_id: 'usr_me',
      });

      expect(landlord.id).toBeDefined();
      expect(store.getPeople().length).toBe(1);

      // Now test that Layer 1 matches with 100% confidence
      const analysis = analyzeAndCategorizeTransaction(
        'UPI-Sharma Ji-sharmaji@oksbi-RENT-OCT',
        '',
        store.getPeople()
      );

      expect(analysis.categoryId).toBe('cat_rent');
      expect(analysis.classificationSource).toBe('person_directory');
      expect(analysis.confidence).toBe(1.0);
      expect(analysis.confidenceTier).toBe('high');
    });

    it('allows deleting and updating person records safely', () => {
      const friend = store.addPerson({
        display_name: 'Rohan Trip Share',
        relationship: 'friend',
        default_category_id: 'cat_transfers',
        aliases: ['rohan@axl'],
        user_id: 'usr_me',
      });

      store.updatePerson(friend.id, { display_name: 'Rohan Sharma' });
      const updated = store.getPeople().find(p => p.id === friend.id);
      expect(updated?.display_name).toBe('Rohan Sharma');

      store.deletePerson(friend.id);
      expect(store.getPeople().length).toBe(0);
    });
  });

  describe('4. Time-Based Financial Analysis & Integer Paise Arithmetic', () => {
    it('aggregates multi-year totals with zero rounding drift', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          user_id: 'usr_me',
          transaction_date: '2025-01-15T10:00:00Z',
          merchant: 'Swiggy',
          amount: 450.25,
          category_id: 'cat_food',
          transaction_type: 'expense',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx-2',
          user_id: 'usr_me',
          transaction_date: '2025-06-20T10:00:00Z',
          merchant: 'Salary',
          amount: 85000.00,
          category_id: 'cat_income',
          transaction_type: 'income',
          payment_method: 'Net banking',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tx-3',
          user_id: 'usr_me',
          transaction_date: '2026-10-28T10:00:00Z',
          merchant: 'Blinkit',
          amount: 600.50,
          category_id: 'cat_groceries',
          transaction_type: 'expense',
          payment_method: 'UPI',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const report = generateFinancialIntelligenceReport(txs);
      expect(report.totalRecords).toBe(3);
      expect(report.totalIncomeRupees).toBe(85000.00);
      expect(report.totalExpenseRupees).toBe(1050.75); // 450.25 + 600.50 exactly
      expect(report.netSavingsRupees).toBe(83949.25);
    });
  });

  describe('5. Natural-Language Financial Inquiry Engine', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-10',
        user_id: 'usr_me',
        transaction_date: '2026-10-01T10:00:00Z',
        merchant: 'Salary Credit',
        amount: 100000,
        category_id: 'cat_income',
        transaction_type: 'income',
        payment_method: 'Net banking',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tx-11',
        user_id: 'usr_me',
        transaction_date: '2026-10-05T10:00:00Z',
        merchant: 'Swiggy',
        amount: 2500,
        category_id: 'cat_food',
        transaction_type: 'expense',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tx-12',
        user_id: 'usr_me',
        transaction_date: '2026-10-10T10:00:00Z',
        merchant: 'Zomato',
        amount: 1500,
        category_id: 'cat_food',
        transaction_type: 'expense',
        payment_method: 'UPI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('answers "How much did I spend on food?" with exact verified math', () => {
      const answer = answerFinancialQuestion('How much did I spend on food?', txs);
      expect(answer.answerText).toContain('4,000'); // 2500 + 1500
      expect(answer.answerText).toContain('Food & Dining');
      expect(answer.answerText).toContain('2 transactions');
      expect(answer.calculatedValuePaise).toBe(400000);
    });

    it('answers "What is my total income?" accurately', () => {
      const answer = answerFinancialQuestion('What is my total income?', txs);
      expect(answer.answerText).toContain('1,00,000');
      expect(answer.calculatedValuePaise).toBe(10000000);
    });

    it('handles queries with zero transactions gracefully without hallucinations', () => {
      const answer = answerFinancialQuestion('How much did I spend on travel?', txs);
      expect(answer.answerText).toContain('No transactions found matching');
      expect(answer.calculatedValuePaise).toBe(0);
    });
  });
});
