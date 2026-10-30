import {
  User,
  FinancialProfile,
  Account,
  Category,
  Transaction,
  Budget,
  RecurringPayment,
  SavingsGoal,
  NotificationPreference,
  BankConsent,
} from '../types';
import { DEFAULT_CATEGORIES } from './categorization';
import { sanitizeString } from './security';
import { auditLogger } from './auditLogger';
import { authService } from './authService';

const STORAGE_KEYS = {
  USER: 'paisa_user',
  PROFILE: 'paisa_financial_profile',
  ACCOUNTS: 'paisa_accounts',
  CATEGORIES: 'paisa_categories',
  TRANSACTIONS: 'paisa_transactions',
  BUDGETS: 'paisa_budgets',
  RECURRING: 'paisa_recurring_payments',
  SAVINGS: 'paisa_savings_goals',
  NOTIFICATIONS: 'paisa_notification_prefs',
  CONSENTS: 'paisa_bank_consents',
  ONBOARDED: 'paisa_is_onboarded',
};

// Listeners for reactive updates
type StorageListener = () => void;
const listeners = new Set<StorageListener>();

export function subscribeToStore(listener: StorageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Error in store listener:', e);
    }
  });
}

// ----------------------------------------------------------------------
// Initial Demo Data
// ----------------------------------------------------------------------
const DEFAULT_USER: User = {
  id: 'usr_paisa_demo_1',
  display_name: 'Atharva',
  email: 'atharva@example.com',
  preferred_currency: 'INR',
  timezone: 'Asia/Kolkata',
  created_at: new Date().toISOString(),
};

const DEFAULT_PROFILE: FinancialProfile = {
  user_id: 'usr_paisa_demo_1',
  monthly_income: 100000,
  salary_credit_day: 1,
  budgeting_mode: 'income_equivalent',
  savings_target: 20000,
  fixed_commitments: 25000,
  daily_budget_override: 0,
  monthly_spending_target: 55000,
};

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc_hdfc_1',
    user_id: 'usr_paisa_demo_1',
    account_name: 'HDFC Salary Account',
    account_type: 'savings',
    provider: 'HDFC Bank',
    account_number_mask: '••4921',
    balance: 78500,
    connection_status: 'connected',
    last_synced_at: new Date().toISOString(),
    is_demo: true,
  },
  {
    id: 'acc_icici_1',
    user_id: 'usr_paisa_demo_1',
    account_name: 'ICICI Emergency Fund',
    account_type: 'savings',
    provider: 'ICICI Bank',
    account_number_mask: '••8112',
    balance: 185000,
    connection_status: 'connected',
    last_synced_at: new Date().toISOString(),
    is_demo: true,
  },
  {
    id: 'acc_sbi_cc',
    user_id: 'usr_paisa_demo_1',
    account_name: 'SBI SimplyCLICK Card',
    account_type: 'credit_card',
    provider: 'SBI Card',
    account_number_mask: '••3302',
    balance: -8450,
    connection_status: 'connected',
    last_synced_at: new Date().toISOString(),
    is_demo: true,
  },
];

const todayIso = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);

const DEFAULT_TRANSACTIONS: Transaction[] = [
  // Today's transactions (Matching the exact product vision scenario: ₹2,500 total)
  {
    id: 'tx_today_1',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${todayIso}T09:15:00`,
    merchant: 'Blue Tokai Coffee',
    description: 'Cold brew and croissant',
    amount: 250,
    transaction_type: 'expense',
    category_id: 'cat_food',
    payment_method: 'UPI',
    is_unplanned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_today_2',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${todayIso}T11:30:00`,
    merchant: 'Blinkit',
    description: 'Oat milk, bananas, Greek yogurt',
    amount: 600,
    transaction_type: 'expense',
    category_id: 'cat_groceries',
    payment_method: 'UPI',
    is_unplanned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_today_3',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${todayIso}T13:15:00`,
    merchant: 'Zepto',
    description: 'Work afternoon snacks',
    amount: 400,
    transaction_type: 'expense',
    category_id: 'cat_groceries',
    payment_method: 'UPI',
    is_unplanned: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_today_4',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${todayIso}T15:00:00`,
    merchant: 'Swiggy',
    description: 'Meghana Foods Biryani lunch box',
    amount: 500,
    transaction_type: 'expense',
    category_id: 'cat_food',
    payment_method: 'UPI',
    is_unplanned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_today_5',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${todayIso}T18:30:00`,
    merchant: 'Amazon Shopping',
    description: 'Wireless ergonomic mouse pad & cable',
    amount: 750,
    transaction_type: 'expense',
    category_id: 'cat_shopping',
    payment_method: 'UPI',
    is_unplanned: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Yesterday's transactions
  {
    id: 'tx_yest_1',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${yesterday}T08:45:00`,
    merchant: 'Uber Auto',
    description: 'Ride to Koramangala tech park',
    amount: 180,
    transaction_type: 'expense',
    category_id: 'cat_transport',
    payment_method: 'UPI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_yest_2',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${yesterday}T14:10:00`,
    merchant: 'Third Wave Coffee',
    description: 'Latte meeting',
    amount: 280,
    transaction_type: 'expense',
    category_id: 'cat_food',
    payment_method: 'Debit card',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_yest_3',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${yesterday}T20:25:00`,
    merchant: 'Zomato',
    description: 'Dinner delivery',
    amount: 620,
    transaction_type: 'expense',
    category_id: 'cat_food',
    payment_method: 'UPI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Earlier this month
  {
    id: 'tx_cc_pay',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${threeDaysAgo}T12:00:00`,
    merchant: 'CRED HDFC Credit Card Bill',
    description: 'Monthly card statement payoff',
    amount: 14500,
    transaction_type: 'expense',
    category_id: 'cat_transfers',
    payment_method: 'Net banking',
    is_credit_card_payment: true,
    notes: 'Credit Card Bill Settlement — Excluded from daily discretionary spending to avoid double counting.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_sub_netflix',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_sbi_cc',
    transaction_date: `${fiveDaysAgo}T06:00:00`,
    merchant: 'Netflix India',
    description: 'Monthly subscription auto-debit',
    amount: 649,
    transaction_type: 'expense',
    category_id: 'cat_subscriptions',
    payment_method: 'Credit card',
    is_recurring: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_electricity',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${fiveDaysAgo}T10:15:00`,
    merchant: 'Bescom Electricity',
    description: 'Electricity bill for flat',
    amount: 1850,
    transaction_type: 'expense',
    category_id: 'cat_bills',
    payment_method: 'UPI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx_salary_in',
    user_id: 'usr_paisa_demo_1',
    account_id: 'acc_hdfc_1',
    transaction_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01T09:00:00`,
    merchant: 'Acme Technologies Pvt Ltd',
    description: 'Salary Credit - Current Month',
    amount: 100000,
    transaction_type: 'income',
    category_id: 'cat_other',
    payment_method: 'Net banking',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_RECURRING: RecurringPayment[] = [
  {
    id: 'rec_rent',
    user_id: 'usr_paisa_demo_1',
    name: 'Apartment Rent',
    amount: 22000,
    frequency: 'monthly',
    next_due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2).padStart(2, '0')}-01`,
    category_id: 'cat_rent',
    auto_record: false,
    merchant: 'Landlord Transfer',
    is_active: true,
  },
  {
    id: 'rec_netflix',
    user_id: 'usr_paisa_demo_1',
    name: 'Netflix Premium (4K)',
    amount: 649,
    frequency: 'monthly',
    next_due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2).padStart(2, '0')}-05`,
    category_id: 'cat_subscriptions',
    auto_record: true,
    merchant: 'Netflix',
    is_active: true,
  },
  {
    id: 'rec_spotify',
    user_id: 'usr_paisa_demo_1',
    name: 'Spotify Premium Family',
    amount: 179,
    frequency: 'monthly',
    next_due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2).padStart(2, '0')}-12`,
    category_id: 'cat_subscriptions',
    auto_record: true,
    merchant: 'Spotify',
    is_active: true,
  },
  {
    id: 'rec_broadband',
    user_id: 'usr_paisa_demo_1',
    name: 'ACT Fibernet Gigabit',
    amount: 1150,
    frequency: 'monthly',
    next_due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2).padStart(2, '0')}-02`,
    category_id: 'cat_bills',
    auto_record: false,
    merchant: 'ACT Fibernet',
    is_active: true,
  },
  {
    id: 'rec_cult',
    user_id: 'usr_paisa_demo_1',
    name: 'Cult.fit Gym & Fitness',
    amount: 1800,
    frequency: 'monthly',
    next_due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2).padStart(2, '0')}-15`,
    category_id: 'cat_personal_care',
    auto_record: false,
    merchant: 'Cult.fit',
    is_active: true,
  },
];

const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal_emergency',
    user_id: 'usr_paisa_demo_1',
    name: '6-Month Emergency Cushion',
    target_amount: 300000,
    current_amount: 185000,
    target_date: '2026-12-31',
    icon: 'ShieldCheck',
    category: 'emergency_fund',
  },
  {
    id: 'goal_goa',
    user_id: 'usr_paisa_demo_1',
    name: 'Goa Friends Retreat',
    target_amount: 30000,
    current_amount: 22500,
    target_date: '2026-11-20',
    icon: 'Palmtree',
    category: 'purchase',
  },
  {
    id: 'goal_macbook',
    user_id: 'usr_paisa_demo_1',
    name: 'M-Series Pro Laptop Upgrade',
    target_amount: 140000,
    current_amount: 98000,
    target_date: '2027-03-31',
    icon: 'Laptop',
    category: 'purchase',
  },
  {
    id: 'goal_challenge',
    user_id: 'usr_paisa_demo_1',
    name: '30-Day Zero Food Delivery Challenge',
    target_amount: 8000,
    current_amount: 6400,
    target_date: '2026-10-31',
    icon: 'Flame',
    category: 'challenge',
  },
];

const DEFAULT_NOTIFICATIONS: NotificationPreference = {
  user_id: 'usr_paisa_demo_1',
  morning_reminder: true,
  morning_reminder_time: '08:30',
  evening_summary: true,
  evening_summary_time: '21:30',
  warning_threshold: 75,
  quiet_hours_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  preferred_tone: 'friendly',
  browser_push_enabled: false,
};

const DEFAULT_CONSENTS: BankConsent[] = [
  {
    id: 'consent_setu_001',
    user_id: 'usr_paisa_demo_1',
    provider: 'Setu AA',
    consent_reference: 'SETU-CONSENT-2026-IN-4982',
    status: 'ACTIVE',
    data_range_from: '2026-08-01',
    data_range_to: '2027-08-01',
    expiry_date: '2027-08-01',
    accounts_linked: ['acc_hdfc_1', 'acc_icici_1'],
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {
  cat_food: 12000,
  cat_groceries: 15000,
  cat_shopping: 8000,
  cat_transport: 5000,
  cat_entertainment: 3500,
  cat_bills: 6000,
};

// ----------------------------------------------------------------------
// Storage Helpers
// ----------------------------------------------------------------------
function getStored<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// ----------------------------------------------------------------------
// Store API
// ----------------------------------------------------------------------
export const store = {
  // Initialization check
  init() {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_KEYS.ONBOARDED)) {
      this.resetToDemoData();
    }
  },

  resetToDemoData() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    }
    setStored(STORAGE_KEYS.USER, DEFAULT_USER);
    setStored(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    setStored(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
    setStored(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    setStored(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
    setStored(STORAGE_KEYS.RECURRING, DEFAULT_RECURRING);
    setStored(STORAGE_KEYS.SAVINGS, DEFAULT_SAVINGS_GOALS);
    setStored(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
    setStored(STORAGE_KEYS.CONSENTS, DEFAULT_CONSENTS);
    setStored(STORAGE_KEYS.BUDGETS, DEFAULT_CATEGORY_BUDGETS);
    notifyListeners();
  },

  clearAllData() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    notifyListeners();
  },

  // Onboarding
  isOnboarded(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  },

  setOnboarded(value: boolean) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, value ? 'true' : 'false');
    }
    notifyListeners();
  },

  // Active Session & Tenant ID
  getActiveUserId(): string {
    const authUser = authService.getCurrentUser();
    if (authUser) return authUser.id;
    return this.getUser().id;
  },

  // User
  getUser(): User {
    return getStored<User>(STORAGE_KEYS.USER, DEFAULT_USER);
  },

  updateUser(user: Partial<User>) {
    const current = this.getUser();
    setStored(STORAGE_KEYS.USER, {
      ...current,
      ...user,
      display_name: user.display_name ? sanitizeString(user.display_name) : current.display_name,
    });
  },

  // Financial Profile
  getProfile(): FinancialProfile {
    return getStored<FinancialProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  },

  updateProfile(profile: Partial<FinancialProfile>) {
    const current = this.getProfile();
    setStored(STORAGE_KEYS.PROFILE, { ...current, ...profile });
  },

  // Transactions (Multi-tenant isolated)
  getAllRawTransactions(): Transaction[] {
    return getStored<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  },

  getTransactions(userId?: string): Transaction[] {
    const targetUserId = userId || this.getActiveUserId();
    const all = this.getAllRawTransactions();
    return all.filter(t => t.user_id === targetUserId);
  },

  addTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Transaction {
    const activeUserId = tx.user_id || this.getActiveUserId();
    const newTx: Transaction = {
      ...tx,
      user_id: activeUserId,
      merchant: sanitizeString(tx.merchant),
      description: sanitizeString(tx.description),
      notes: sanitizeString(tx.notes),
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = [newTx, ...this.getAllRawTransactions()];
    setStored(STORAGE_KEYS.TRANSACTIONS, list);
    return newTx;
  },

  updateTransaction(id: string, updates: Partial<Transaction>, requestingUserId?: string): Transaction | null {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawTransactions();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return null;

    // Tenant Isolation Guard
    if (all[idx].user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to modify transaction ${id} owned by ${all[idx].user_id}`,
        success: false,
      });
      return null;
    }

    const updated: Transaction = {
      ...all[idx],
      ...updates,
      merchant: updates.merchant !== undefined ? sanitizeString(updates.merchant) : all[idx].merchant,
      description: updates.description !== undefined ? sanitizeString(updates.description) : all[idx].description,
      notes: updates.notes !== undefined ? sanitizeString(updates.notes) : all[idx].notes,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    setStored(STORAGE_KEYS.TRANSACTIONS, all);
    return updated;
  },

  deleteTransaction(id: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawTransactions();
    const target = all.find(t => t.id === id);
    if (!target) return false;

    // Tenant Isolation Guard
    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete transaction ${id} owned by ${target.user_id}`,
        success: false,
      });
      return false;
    }

    const filtered = all.filter(t => t.id !== id);
    setStored(STORAGE_KEYS.TRANSACTIONS, filtered);
    return true;
  },

  addTransactionsBulk(newTxs: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]): number {
    const activeUserId = this.getActiveUserId();
    const toAdd: Transaction[] = newTxs.map(tx => ({
      ...tx,
      user_id: tx.user_id || activeUserId,
      merchant: sanitizeString(tx.merchant),
      description: sanitizeString(tx.description),
      notes: sanitizeString(tx.notes),
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const combined = [...toAdd, ...this.getAllRawTransactions()];
    setStored(STORAGE_KEYS.TRANSACTIONS, combined);
    return toAdd.length;
  },

  // Budgets
  getCategoryBudgets(): Record<string, number> {
    return getStored<Record<string, number>>(STORAGE_KEYS.BUDGETS, DEFAULT_CATEGORY_BUDGETS);
  },

  updateCategoryBudget(categoryId: string, limit: number): void {
    const current = this.getCategoryBudgets();
    const updated = { ...current, [categoryId]: Math.max(0, limit) };
    setStored(STORAGE_KEYS.BUDGETS, updated);
  },

  setCategoryBudgets(budgets: Record<string, number>): void {
    setStored(STORAGE_KEYS.BUDGETS, budgets);
  },

  // Categories
  getCategories(): Category[] {
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  addCategory(category: Category) {
    const list = [...this.getCategories(), {
      ...category,
      name: sanitizeString(category.name),
    }];
    setStored(STORAGE_KEYS.CATEGORIES, list);
  },

  // Accounts (Multi-tenant isolated)
  getAllRawAccounts(): Account[] {
    return getStored<Account[]>(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
  },

  getAccounts(userId?: string): Account[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawAccounts().filter(a => a.user_id === activeUserId);
  },

  updateAccount(id: string, updates: Partial<Account>, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawAccounts();
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return;

    if (all[idx].user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to modify account ${id} owned by ${all[idx].user_id}`,
        success: false,
      });
      return;
    }

    all[idx] = {
      ...all[idx],
      ...updates,
      account_name: updates.account_name ? sanitizeString(updates.account_name) : all[idx].account_name,
    };
    setStored(STORAGE_KEYS.ACCOUNTS, all);
  },

  addAccount(account: Account) {
    const activeUserId = account.user_id || this.getActiveUserId();
    const newAcc = {
      ...account,
      user_id: activeUserId,
      account_name: sanitizeString(account.account_name),
    };
    const list = [...this.getAllRawAccounts(), newAcc];
    setStored(STORAGE_KEYS.ACCOUNTS, list);
  },

  disconnectAccount(id: string, requestingUserId?: string) {
    this.updateAccount(id, { connection_status: 'disconnected' }, requestingUserId);
  },

  deleteAccount(id: string, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawAccounts();
    const target = all.find(a => a.id === id);
    if (!target) return;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete account ${id} owned by ${target.user_id}`,
        success: false,
      });
      return;
    }

    const list = all.filter(a => a.id !== id);
    setStored(STORAGE_KEYS.ACCOUNTS, list);
  },

  // Recurring Payments (Multi-tenant isolated)
  getAllRawRecurringPayments(): RecurringPayment[] {
    return getStored<RecurringPayment[]>(STORAGE_KEYS.RECURRING, DEFAULT_RECURRING);
  },

  getRecurringPayments(userId?: string): RecurringPayment[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawRecurringPayments().filter(r => r.user_id === activeUserId);
  },

  addRecurringPayment(item: RecurringPayment) {
    const activeUserId = item.user_id || this.getActiveUserId();
    const newItem = {
      ...item,
      user_id: activeUserId,
      name: sanitizeString(item.name),
    };
    const list = [...this.getAllRawRecurringPayments(), newItem];
    setStored(STORAGE_KEYS.RECURRING, list);
  },

  updateRecurringPayment(id: string, updates: Partial<RecurringPayment>, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawRecurringPayments();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;

    if (all[idx].user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to update recurring bill ${id} owned by ${all[idx].user_id}`,
        success: false,
      });
      return;
    }

    all[idx] = {
      ...all[idx],
      ...updates,
      name: updates.name ? sanitizeString(updates.name) : all[idx].name,
    };
    setStored(STORAGE_KEYS.RECURRING, all);
  },

  deleteRecurringPayment(id: string, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawRecurringPayments();
    const target = all.find(r => r.id === id);
    if (!target) return;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete recurring bill ${id} owned by ${target.user_id}`,
        success: false,
      });
      return;
    }

    const list = all.filter(r => r.id !== id);
    setStored(STORAGE_KEYS.RECURRING, list);
  },

  // Savings Goals (Multi-tenant isolated)
  getAllRawSavingsGoals(): SavingsGoal[] {
    return getStored<SavingsGoal[]>(STORAGE_KEYS.SAVINGS, DEFAULT_SAVINGS_GOALS);
  },

  getSavingsGoals(userId?: string): SavingsGoal[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawSavingsGoals().filter(g => g.user_id === activeUserId);
  },

  addSavingsGoal(goal: SavingsGoal) {
    const activeUserId = goal.user_id || this.getActiveUserId();
    const newGoal = {
      ...goal,
      user_id: activeUserId,
      name: sanitizeString(goal.name),
    };
    const list = [...this.getAllRawSavingsGoals(), newGoal];
    setStored(STORAGE_KEYS.SAVINGS, list);
  },

  updateSavingsGoal(id: string, updates: Partial<SavingsGoal>, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawSavingsGoals();
    const idx = all.findIndex(g => g.id === id);
    if (idx === -1) return;

    if (all[idx].user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to update savings goal ${id} owned by ${all[idx].user_id}`,
        success: false,
      });
      return;
    }

    all[idx] = {
      ...all[idx],
      ...updates,
      name: updates.name ? sanitizeString(updates.name) : all[idx].name,
    };
    setStored(STORAGE_KEYS.SAVINGS, all);
  },

  deleteSavingsGoal(id: string, requestingUserId?: string) {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawSavingsGoals();
    const target = all.find(g => g.id === id);
    if (!target) return;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete savings goal ${id} owned by ${target.user_id}`,
        success: false,
      });
      return;
    }

    const list = all.filter(g => g.id !== id);
    setStored(STORAGE_KEYS.SAVINGS, list);
  },

  // Notification Preferences
  getNotificationPreferences(): NotificationPreference {
    return getStored<NotificationPreference>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  },

  updateNotificationPreferences(prefs: Partial<NotificationPreference>) {
    const current = this.getNotificationPreferences();
    setStored(STORAGE_KEYS.NOTIFICATIONS, { ...current, ...prefs });
  },

  // Bank Consents
  getBankConsents(): BankConsent[] {
    return getStored<BankConsent[]>(STORAGE_KEYS.CONSENTS, DEFAULT_CONSENTS);
  },

  addBankConsent(consent: BankConsent) {
    const list = [...this.getBankConsents(), consent];
    setStored(STORAGE_KEYS.CONSENTS, list);
  },

  revokeBankConsent(id: string) {
    const list = this.getBankConsents().map(c => c.id === id ? { ...c, status: 'REVOKED' as const } : c);
    setStored(STORAGE_KEYS.CONSENTS, list);
  },

  // Export full user data package (DPDP Act / GDPR)
  exportFullDataBackup(): string {
    const dump = {
      user: this.getUser(),
      financialProfile: this.getProfile(),
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      recurring: this.getRecurringPayments(),
      savingsGoals: this.getSavingsGoals(),
      notificationPreferences: this.getNotificationPreferences(),
      bankConsents: this.getBankConsents(),
      exportedAt: new Date().toISOString(),
      app: 'Paisa — Your Daily Money Reality Check',
    };
    return JSON.stringify(dump, null, 2);
  }
};

// Initialize store on first module load
store.init();
