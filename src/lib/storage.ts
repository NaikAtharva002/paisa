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
  ImportRecord,
} from '../types';
import { DEFAULT_CATEGORIES, MerchantRule } from './categorization';
import { PersonEntity } from './transactionIntelligence';
import { sanitizeString } from './security';
import { roundPaise } from './calculations';
import { auditLogger } from './auditLogger';
import { authService } from './authService';
import { recordLocalStoreMutation } from './sync/syncBridge';

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
  MERCHANT_RULES: 'paisa_merchant_rules',
  DISMISSED_INSIGHTS: 'paisa_dismissed_insights',
  AI_INSIGHTS_ENABLED: 'paisa_ai_insights_enabled',
  IMPORT_HISTORY: 'paisa_import_history',
  PEOPLE_DIRECTORY: 'paisa_people_directory',
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

export const CLEAN_USER: User = {
  id: 'usr_me',
  display_name: '',
  email: '',
  preferred_currency: 'INR',
  timezone: 'Asia/Kolkata',
  created_at: new Date().toISOString(),
};

export const CLEAN_PROFILE: FinancialProfile = {
  user_id: 'usr_me',
  monthly_income: 0,
  salary_credit_day: 1,
  budgeting_mode: 'income_equivalent',
  savings_target: 0,
  fixed_commitments: 0,
  daily_budget_override: 0,
  monthly_spending_target: 0,
};

export const DEFAULT_NOTIFICATIONS: NotificationPreference = {
  user_id: 'usr_me',
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

export const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {};

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
  // Initialization check with Clean Slate Auto-Migration
  init() {
    if (typeof localStorage !== 'undefined') {
      const isCleanSlateEnforcedV9 = localStorage.getItem('paisa_clean_slate_v9_enforced');
      const rawUser = localStorage.getItem(STORAGE_KEYS.USER) || '';
      const rawAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS) || '';
      const rawTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '';
      const rawBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS) || '';

      const containsDemoArtifacts =
        rawUser.includes('usr_paisa_demo_1') ||
        rawUser.includes('atharva@example.com') ||
        rawAccounts.includes('acc_hdfc_1') ||
        rawAccounts.includes('acc_icici_1') ||
        rawAccounts.includes('acc_sbi_cc') ||
        rawAccounts.includes('SBI SimplyCLICK') ||
        rawAccounts.includes('is_demo') ||
        rawTxs.includes('tx_today_1') ||
        rawTxs.includes('Blue Tokai') ||
        rawTxs.includes('usr_paisa_demo_1') ||
        rawBudgets.includes('12000');

      if (containsDemoArtifacts) {
        this.initializeCleanSlate(false);
        localStorage.removeItem('paisa_auth_session');
        localStorage.removeItem('paisa_clean_slate_enforced_v3');
        localStorage.setItem('paisa_clean_slate_v9_enforced', 'true');
      } else if (!isCleanSlateEnforcedV9 && !localStorage.getItem(STORAGE_KEYS.ONBOARDED)) {
        this.initializeCleanSlate(false);
        localStorage.setItem('paisa_clean_slate_v9_enforced', 'true');
      }
    }
  },

  initializeCleanSlate(markOnboarded = false) {
    if (typeof localStorage !== 'undefined') {
      if (markOnboarded) {
        localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
      }
    }
    setStored(STORAGE_KEYS.USER, CLEAN_USER);
    setStored(STORAGE_KEYS.PROFILE, CLEAN_PROFILE);
    setStored(STORAGE_KEYS.ACCOUNTS, []);
    setStored(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    setStored(STORAGE_KEYS.TRANSACTIONS, []);
    setStored(STORAGE_KEYS.RECURRING, []);
    setStored(STORAGE_KEYS.SAVINGS, []);
    setStored(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
    setStored(STORAGE_KEYS.CONSENTS, []);
    setStored(STORAGE_KEYS.BUDGETS, {});
    setStored(STORAGE_KEYS.PEOPLE_DIRECTORY, []);
    notifyListeners();
  },

  seedDemoDataForTesting() {
    this.initializeCleanSlate(true);
  },

  // People & Merchants Directory
  getPeople(): PersonEntity[] {
    return getStored<PersonEntity[]>(STORAGE_KEYS.PEOPLE_DIRECTORY, []);
  },

  addPerson(person: Omit<PersonEntity, 'id' | 'created_at' | 'updated_at'>): PersonEntity {
    const activeUserId = person.user_id || this.getActiveUserId();
    const newPerson: PersonEntity = {
      ...person,
      id: `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      display_name: sanitizeString(person.display_name),
      aliases: (person.aliases || []).map(a => sanitizeString(a)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = [...this.getPeople(), newPerson];
    setStored(STORAGE_KEYS.PEOPLE_DIRECTORY, list);
    return newPerson;
  },

  updatePerson(id: string, updates: Partial<PersonEntity>): PersonEntity | null {
    const list = this.getPeople();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    list[idx] = updated;
    setStored(STORAGE_KEYS.PEOPLE_DIRECTORY, list);
    return updated;
  },

  deletePerson(id: string): boolean {
    const list = this.getPeople();
    const filtered = list.filter(p => p.id !== id);
    setStored(STORAGE_KEYS.PEOPLE_DIRECTORY, filtered);
    return true;
  },

  resetToDemoData() {
    this.initializeCleanSlate(true);
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
    return getStored<User>(STORAGE_KEYS.USER, CLEAN_USER);
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
    return getStored<FinancialProfile>(STORAGE_KEYS.PROFILE, CLEAN_PROFILE);
  },

  updateProfile(profile: Partial<FinancialProfile>) {
    const current = this.getProfile();
    setStored(STORAGE_KEYS.PROFILE, { ...current, ...profile });
  },

  // Transactions (Multi-tenant isolated)
  getAllRawTransactions(): Transaction[] {
    return getStored<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  },

  getTransactions(userId?: string): Transaction[] {
    const targetUserId = userId || this.getActiveUserId();
    const all = this.getAllRawTransactions();
    return all.filter(t => t.user_id === targetUserId);
  },

  addTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Transaction {
    const activeUserId = tx.user_id || this.getActiveUserId();
    const sanitizedAmount = roundPaise(Math.abs(Number(tx.amount) || 0));
    const newTx: Transaction = {
      ...tx,
      amount: sanitizedAmount,
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
    recordLocalStoreMutation('transactions', 'insert', newTx.id, activeUserId, newTx as unknown as Record<string, unknown>);
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
      amount: updates.amount !== undefined ? roundPaise(Math.abs(Number(updates.amount) || 0)) : all[idx].amount,
      merchant: updates.merchant !== undefined ? sanitizeString(updates.merchant) : all[idx].merchant,
      description: updates.description !== undefined ? sanitizeString(updates.description) : all[idx].description,
      notes: updates.notes !== undefined ? sanitizeString(updates.notes) : all[idx].notes,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    setStored(STORAGE_KEYS.TRANSACTIONS, all);
    recordLocalStoreMutation('transactions', 'update', updated.id, activeUserId, updated as unknown as Record<string, unknown>);
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
    recordLocalStoreMutation('transactions', 'delete', id, activeUserId, { id, user_id: activeUserId });
    return true;
  },

  addTransactionsBulk(newTxs: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]): number {
    const activeUserId = this.getActiveUserId();
    const toAdd: Transaction[] = newTxs.map(tx => ({
      ...tx,
      amount: roundPaise(Math.abs(Number(tx.amount) || 0)),
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
    const raw = getStored<Record<string, number>>(STORAGE_KEYS.BUDGETS, {});
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && v > 0) {
        clean[k] = v;
      }
    }
    return clean;
  },

  updateCategoryBudget(categoryId: string, limit: number): void {
    const current = getStored<Record<string, number>>(STORAGE_KEYS.BUDGETS, {});
    if (isNaN(limit) || limit <= 0) {
      const updated = { ...current };
      delete updated[categoryId];
      setStored(STORAGE_KEYS.BUDGETS, updated);
      return;
    }
    const updated = { ...current, [categoryId]: Math.round(limit) };
    setStored(STORAGE_KEYS.BUDGETS, updated);
  },

  deleteCategoryBudget(categoryId: string): void {
    const current = getStored<Record<string, number>>(STORAGE_KEYS.BUDGETS, {});
    const updated = { ...current };
    delete updated[categoryId];
    setStored(STORAGE_KEYS.BUDGETS, updated);
  },

  setCategoryBudgets(budgets: Record<string, number>): void {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(budgets)) {
      if (typeof v === 'number' && v > 0) {
        clean[k] = Math.round(v);
      }
    }
    setStored(STORAGE_KEYS.BUDGETS, clean);
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
    return getStored<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
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

  addAccount(account: Account | (Omit<Account, 'id' | 'user_id'> & { user_id?: string }), requestingUserId?: string): Account {
    const activeUserId = requestingUserId || account.user_id || this.getActiveUserId();
    const newAcc: Account = {
      ...(account as any),
      id: (account as any).id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      account_name: sanitizeString(account.account_name),
    };
    const list = [...this.getAllRawAccounts(), newAcc];
    setStored(STORAGE_KEYS.ACCOUNTS, list);
    recordLocalStoreMutation('accounts', 'insert', newAcc.id, activeUserId, newAcc as unknown as Record<string, unknown>);
    return newAcc;
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
    recordLocalStoreMutation('accounts', 'delete', id, activeUserId, { id, user_id: activeUserId });
  },

  // Recurring Payments (Multi-tenant isolated)
  getAllRawRecurringPayments(): RecurringPayment[] {
    return getStored<RecurringPayment[]>(STORAGE_KEYS.RECURRING, []);
  },

  getRecurringPayments(userId?: string): RecurringPayment[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawRecurringPayments().filter(r => r.user_id === activeUserId);
  },

  addRecurringPayment(
    item: RecurringPayment | (Omit<RecurringPayment, 'id' | 'user_id'> & { id?: string; user_id?: string }),
    requestingUserId?: string
  ): RecurringPayment {
    const activeUserId = requestingUserId || item.user_id || this.getActiveUserId();
    const newItem: RecurringPayment = {
      ...item,
      id: item.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      name: sanitizeString(item.name),
    };
    const list = [...this.getAllRawRecurringPayments(), newItem];
    setStored(STORAGE_KEYS.RECURRING, list);
    return newItem;
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

  deleteRecurringPayment(id: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawRecurringPayments();
    const target = all.find(r => r.id === id);
    if (!target) return false;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete recurring bill ${id} owned by ${target.user_id}`,
        success: false,
      });
      return false;
    }

    const list = all.filter(r => r.id !== id);
    setStored(STORAGE_KEYS.RECURRING, list);
    return true;
  },

  // Savings Goals (Multi-tenant isolated)
  getAllRawSavingsGoals(): SavingsGoal[] {
    return getStored<SavingsGoal[]>(STORAGE_KEYS.SAVINGS, []);
  },

  getSavingsGoals(userId?: string): SavingsGoal[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawSavingsGoals().filter(g => g.user_id === activeUserId);
  },

  addSavingsGoal(
    goal: SavingsGoal | (Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }),
    requestingUserId?: string
  ): SavingsGoal {
    const activeUserId = requestingUserId || goal.user_id || this.getActiveUserId();
    const newGoal: SavingsGoal = {
      ...goal,
      id: goal.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      name: sanitizeString(goal.name),
    };
    const list = [...this.getAllRawSavingsGoals(), newGoal];
    setStored(STORAGE_KEYS.SAVINGS, list);
    return newGoal;
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

  deleteSavingsGoal(id: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawSavingsGoals();
    const target = all.find(g => g.id === id);
    if (!target) return false;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete savings goal ${id} owned by ${target.user_id}`,
        success: false,
      });
      return false;
    }

    const list = all.filter(g => g.id !== id);
    setStored(STORAGE_KEYS.SAVINGS, list);
    return true;
  },

  // Notification Preferences
  getNotificationPreferences(): NotificationPreference {
    return getStored<NotificationPreference>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  },

  updateNotificationPreferences(prefs: Partial<NotificationPreference>) {
    const current = this.getNotificationPreferences();
    setStored(STORAGE_KEYS.NOTIFICATIONS, { ...current, ...prefs });
  },

  // Bank Consents (Multi-tenant isolated)
  getAllRawBankConsents(): BankConsent[] {
    return getStored<BankConsent[]>(STORAGE_KEYS.CONSENTS, []);
  },

  getBankConsents(userId?: string): BankConsent[] {
    const activeUserId = userId || this.getActiveUserId();
    return this.getAllRawBankConsents().filter(c => c.user_id === activeUserId);
  },

  addBankConsent(consent: BankConsent) {
    const activeUserId = consent.user_id || this.getActiveUserId();
    const newConsent = { ...consent, user_id: activeUserId };
    const list = [...this.getAllRawBankConsents(), newConsent];
    setStored(STORAGE_KEYS.CONSENTS, list);
  },

  revokeBankConsent(id: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const all = this.getAllRawBankConsents();
    const target = all.find(c => c.id === id);
    if (!target) return false;

    if (target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to revoke bank consent ${id} owned by ${target.user_id}`,
        success: false,
      });
      return false;
    }

    const updated = all.map(c => c.id === id ? { ...c, status: 'REVOKED' as const } : c);
    setStored(STORAGE_KEYS.CONSENTS, updated);

    // Also update associated accounts to disconnected status
    const accounts = this.getAllRawAccounts();
    const updatedAccounts = accounts.map(a => {
      if (a.user_id === activeUserId && target.accounts_linked.includes(a.provider)) {
        return { ...a, connection_status: 'disconnected' as const };
      }
      return a;
    });
    setStored(STORAGE_KEYS.ACCOUNTS, updatedAccounts);

    auditLogger.log({
      userId: activeUserId,
      eventType: 'AUTH_LOGOUT',
      details: `Bank consent ${id} (${target.provider}) revoked by user. Future synchronization halted.`,
    });

    return true;
  },

  // --------------------------------------------------------------------
  // Level 05: Transaction Statement Import History & Rollback
  // --------------------------------------------------------------------
  getImportHistory(userId?: string): ImportRecord[] {
    const activeUserId = userId || this.getActiveUserId();
    const list = getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, []);
    return list.filter(r => r.user_id === activeUserId);
  },

  recordImport(record: Omit<ImportRecord, 'id' | 'created_at' | 'user_id'> & { user_id?: string }, requestingUserId?: string): ImportRecord {
    const activeUserId = record.user_id || requestingUserId || this.getActiveUserId();
    const newRecord: ImportRecord = {
      ...record,
      id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      file_name: sanitizeString(record.file_name),
      created_at: new Date().toISOString(),
    };
    const list = [newRecord, ...getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, [])];
    setStored(STORAGE_KEYS.IMPORT_HISTORY, list);

    auditLogger.log({
      userId: activeUserId,
      eventType: 'DATA_EXPORT',
      details: `Imported ${newRecord.imported_count} transactions from ${newRecord.file_name} (${newRecord.duplicates_skipped} duplicates skipped).`,
    });

    return newRecord;
  },

  rollbackImport(importId: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const history = this.getImportHistory(activeUserId);
    const target = history.find(r => r.id === importId);
    if (!target) return false;

    // Delete all transactions that were created by this import batch
    const allTxs = this.getAllRawTransactions();
    const remainingTxs = allTxs.filter(t => !target.transaction_ids.includes(t.id));
    setStored(STORAGE_KEYS.TRANSACTIONS, remainingTxs);

    // Remove the import history record
    const allHistory = getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, []);
    const remainingHistory = allHistory.filter(r => r.id !== importId);
    setStored(STORAGE_KEYS.IMPORT_HISTORY, remainingHistory);

    auditLogger.log({
      userId: activeUserId,
      eventType: 'DATA_RESET',
      details: `Rolled back import ${importId} (${target.file_name}), removing ${target.transaction_ids.length} transactions.`,
    });

    return true;
  },

  // --------------------------------------------------------------------
  // Level 04: Intelligence & Custom Categorization Learning Rules
  // --------------------------------------------------------------------
  getUserCategoryRules(userId?: string): MerchantRule[] {
    const activeUserId = userId || this.getActiveUserId();
    const rules = getStored<MerchantRule[]>(STORAGE_KEYS.MERCHANT_RULES, []);
    return rules.filter(r => !r.user_id || r.user_id === activeUserId);
  },

  saveUserCategoryRule(rule: Omit<MerchantRule, 'id'>, requestingUserId?: string): MerchantRule {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const currentRules = getStored<MerchantRule[]>(STORAGE_KEYS.MERCHANT_RULES, []);
    
    // Check if an existing rule exists for these keywords
    const sanitizedKeywords = rule.keywords.map(kw => sanitizeString(kw.toLowerCase().trim())).filter(Boolean);
    const existingIdx = currentRules.findIndex(
      r => (r.user_id === activeUserId || !r.user_id) && 
           r.keywords.some(k => sanitizedKeywords.includes(k.toLowerCase()))
    );

    const newRule: MerchantRule = {
      ...rule,
      id: existingIdx !== -1 ? currentRules[existingIdx].id : `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId,
      keywords: sanitizedKeywords,
    };

    if (existingIdx !== -1) {
      currentRules[existingIdx] = newRule;
    } else {
      currentRules.push(newRule);
    }

    setStored(STORAGE_KEYS.MERCHANT_RULES, currentRules);
    return newRule;
  },

  deleteUserCategoryRule(ruleId: string, requestingUserId?: string): boolean {
    const activeUserId = requestingUserId || this.getActiveUserId();
    const currentRules = getStored<MerchantRule[]>(STORAGE_KEYS.MERCHANT_RULES, []);
    const target = currentRules.find(r => r.id === ruleId);
    if (!target) return false;

    if (target.user_id && target.user_id !== activeUserId) {
      auditLogger.log({
        userId: activeUserId,
        eventType: 'CROSS_TENANT_VIOLATION_ATTEMPT',
        details: `Blocked attempt to delete merchant rule ${ruleId} owned by ${target.user_id}`,
        success: false,
      });
      return false;
    }

    const filtered = currentRules.filter(r => r.id !== ruleId);
    setStored(STORAGE_KEYS.MERCHANT_RULES, filtered);
    return true;
  },

  // --------------------------------------------------------------------
  // Level 04: AI Insights Controls (Dismissal & Opt-in/Opt-out)
  // --------------------------------------------------------------------
  getDismissedInsights(): string[] {
    return getStored<string[]>(STORAGE_KEYS.DISMISSED_INSIGHTS, []);
  },

  dismissInsight(insightId: string): void {
    const current = this.getDismissedInsights();
    if (!current.includes(insightId)) {
      setStored(STORAGE_KEYS.DISMISSED_INSIGHTS, [...current, insightId]);
    }
  },

  clearDismissedInsights(): void {
    setStored(STORAGE_KEYS.DISMISSED_INSIGHTS, []);
  },

  getAIInsightsEnabled(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(STORAGE_KEYS.AI_INSIGHTS_ENABLED);
    return raw !== null ? raw === 'true' : true;
  },

  setAIInsightsEnabled(enabled: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AI_INSIGHTS_ENABLED, enabled ? 'true' : 'false');
    }
    notifyListeners();
  },

  // Export full user data package (DPDP Act / GDPR)
  exportFullDataBackup(userId?: string): string {
    const activeUserId = userId || this.getActiveUserId();
    const dump = {
      user: this.getUser(),
      financialProfile: this.getProfile(),
      accounts: this.getAccounts(activeUserId),
      categories: this.getCategories(),
      transactions: this.getTransactions(activeUserId),
      recurring: this.getRecurringPayments(activeUserId),
      savingsGoals: this.getSavingsGoals(activeUserId),
      notificationPreferences: this.getNotificationPreferences(),
      bankConsents: this.getBankConsents(activeUserId),
      exportedAt: new Date().toISOString(),
      app: 'Paisa — Your Daily Money Reality Check',
    };
    return JSON.stringify(dump, null, 2);
  },

  // Import full user data backup (Restore)
  importFullDataBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (typeof localStorage === 'undefined') return false;
      if (data.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      if (data.financialProfile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.financialProfile));
      if (data.accounts) localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
      if (data.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
      if (data.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      if (data.recurring) localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(data.recurring));
      if (data.savingsGoals) localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(data.savingsGoals));
      if (data.notificationPreferences) localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(data.notificationPreferences));
      if (data.bankConsents) localStorage.setItem(STORAGE_KEYS.CONSENTS, JSON.stringify(data.bankConsents));
      notifyListeners();
      return true;
    } catch (e) {
      console.error('Failed to parse and import backup:', e);
      return false;
    }
  }
};

// Initialize store on first module load
store.init();
