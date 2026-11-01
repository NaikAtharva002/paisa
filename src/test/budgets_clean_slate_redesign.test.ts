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
import { isSpendingExpense, toPaise, fromPaise, formatINR } from '../lib/calculations';
import { Transaction } from '../types';

describe('PAISA Budgets Clean Slate & Redesign Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    store.initializeCleanSlate(true);
  });

  // Scenario 1: Brand-new user with no budgets
  it('Scenario 1: Brand-new user starts with 0 budgets, 0 allocated, and no pre-assigned limits', () => {
    const budgets = store.getCategoryBudgets();
    expect(Object.keys(budgets).length).toBe(0);

    const categories = store.getCategories();
    expect(categories.length).toBeGreaterThan(0);

    // No auto-allocated limits for Food, Groceries, Shopping, etc.
    expect(budgets['cat_food']).toBeUndefined();
    expect(budgets['cat_groceries']).toBeUndefined();
    expect(budgets['cat_shopping']).toBeUndefined();
    expect(budgets['cat_transport']).toBeUndefined();
  });

  // Scenario 2: User with one manually created budget
  it('Scenario 2: User manually creates one budget and totals calculate accurately', () => {
    store.updateCategoryBudget('cat_food', 8000);
    const budgets = store.getCategoryBudgets();

    expect(Object.keys(budgets).length).toBe(1);
    expect(budgets['cat_food']).toBe(8000);

    const totalAllocated = Object.values(budgets).reduce((a, b) => a + b, 0);
    expect(totalAllocated).toBe(8000);
  });

  // Scenario 3: User with multiple budgets
  it('Scenario 3: User sets multiple category budgets with integer sum', () => {
    store.updateCategoryBudget('cat_food', 10000);
    store.updateCategoryBudget('cat_groceries', 12000);
    store.updateCategoryBudget('cat_bills', 5000);

    const budgets = store.getCategoryBudgets();
    expect(Object.keys(budgets).length).toBe(3);

    const totalAllocated = Object.values(budgets).reduce((a, b) => a + b, 0);
    expect(totalAllocated).toBe(27000);
  });

  // Scenario 4: Transactions imported from statement contribute to matching budget
  it('Scenario 4: Categorised expenses contribute to matching budget limit', () => {
    store.updateCategoryBudget('cat_food', 5000);

    store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-05T12:00:00`,
      merchant: 'Swiggy',
      amount: 450.50,
      transaction_type: 'expense',
      category_id: 'cat_food',
      payment_method: 'UPI',
    });

    store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-06T19:30:00`,
      merchant: 'Zomato',
      amount: 620.25,
      transaction_type: 'expense',
      category_id: 'cat_food',
      payment_method: 'UPI',
    });

    const txs = store.getTransactions();
    const foodSpentPaise = txs
      .filter(t => t.category_id === 'cat_food' && isSpendingExpense(t))
      .reduce((sum, t) => sum + toPaise(t.amount), 0);

    expect(foodSpentPaise).toBe(107075);
    expect(fromPaise(foodSpentPaise)).toBe(1070.75);

    const remaining = 5000 - fromPaise(foodSpentPaise);
    expect(remaining).toBe(3929.25);
  });

  // Scenario 5: Transaction categorisation changed updates budget calculations
  it('Scenario 5: Changing transaction category immediately shifts spending between budgets', () => {
    store.updateCategoryBudget('cat_food', 5000);
    store.updateCategoryBudget('cat_groceries', 6000);

    const tx = store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-05T12:00:00`,
      merchant: 'Store',
      amount: 800,
      transaction_type: 'expense',
      category_id: 'cat_food',
      payment_method: 'UPI',
    });

    let foodTxs = store.getTransactions().filter(t => t.category_id === 'cat_food');
    expect(foodTxs.length).toBe(1);

    // Re-categorize to groceries
    store.updateTransaction(tx.id, { category_id: 'cat_groceries' });

    foodTxs = store.getTransactions().filter(t => t.category_id === 'cat_food');
    const groceriesTxs = store.getTransactions().filter(t => t.category_id === 'cat_groceries');

    expect(foodTxs.length).toBe(0);
    expect(groceriesTxs.length).toBe(1);
    expect(groceriesTxs[0].amount).toBe(800);
  });

  // Scenario 6: Transaction refund subtracts from spending
  it('Scenario 6: Refunds subtract from category spending rather than inflating expenses', () => {
    store.updateCategoryBudget('cat_shopping', 10000);

    store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-05T12:00:00`,
      merchant: 'Amazon',
      amount: 2500,
      transaction_type: 'expense',
      category_id: 'cat_shopping',
      payment_method: 'Credit card',
    });

    store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-08T15:00:00`,
      merchant: 'Amazon Refund',
      amount: 1000,
      transaction_type: 'refund',
      category_id: 'cat_shopping',
      payment_method: 'Credit card',
    });

    const txs = store.getTransactions().filter(t => t.category_id === 'cat_shopping');
    let netPaise = 0;
    for (const t of txs) {
      if (isSpendingExpense(t)) netPaise += toPaise(t.amount);
      else if (t.transaction_type === 'refund') netPaise -= toPaise(t.amount);
    }

    expect(fromPaise(netPaise)).toBe(1500);
  });

  // Scenario 7: Internal account transfers are excluded from spending
  it('Scenario 7: Internal transfers between own accounts are excluded from budget spending', () => {
    store.updateCategoryBudget('cat_transfers', 5000);

    store.addTransaction({
      user_id: 'usr_me',
      transaction_date: `${new Date().toISOString().slice(0, 7)}-05T12:00:00`,
      merchant: 'Self Transfer HDFC to ICICI',
      amount: 20000,
      transaction_type: 'transfer',
      is_internal_transfer: true,
      category_id: 'cat_transfers',
      payment_method: 'Net banking',
    });

    const txs = store.getTransactions().filter(t => t.category_id === 'cat_transfers');
    const spentTxs = txs.filter(t => isSpendingExpense(t));
    expect(spentTxs.length).toBe(0);
  });

  // Scenario 8: Budget edited or deleted
  it('Scenario 8: Budget limit can be edited and deleted cleanly without leftover zeros', () => {
    store.updateCategoryBudget('cat_food', 5000);
    expect(store.getCategoryBudgets()['cat_food']).toBe(5000);

    // Edit
    store.updateCategoryBudget('cat_food', 7500);
    expect(store.getCategoryBudgets()['cat_food']).toBe(7500);

    // Delete
    store.deleteCategoryBudget('cat_food');
    expect(store.getCategoryBudgets()['cat_food']).toBeUndefined();
    expect(Object.keys(store.getCategoryBudgets()).length).toBe(0);
  });

  // Scenario 9: Custom category creation
  it('Scenario 9: Users can add custom categories and set budgets against them', () => {
    const customCat = {
      id: 'cat_fitness_gym',
      name: 'Gym & Crossfit',
      icon: 'Activity',
      color: '#06B6D4',
      category_type: 'expense' as const,
    };
    store.addCategory(customCat);

    const categories = store.getCategories();
    expect(categories.some(c => c.id === 'cat_fitness_gym')).toBe(true);

    store.updateCategoryBudget('cat_fitness_gym', 3500);
    expect(store.getCategoryBudgets()['cat_fitness_gym']).toBe(3500);
  });

  // Scenario 10: Genuine user budgets are preserved across init
  it('Scenario 10: Genuine user budgets are preserved across init calls', () => {
    store.updateCategoryBudget('cat_food', 9250);
    store.updateCategoryBudget('cat_groceries', 14500);

    store.init();

    const budgets = store.getCategoryBudgets();
    expect(budgets['cat_food']).toBe(9250);
    expect(budgets['cat_groceries']).toBe(14500);
    expect(Object.keys(budgets).length).toBe(2);
  });
});
