export type BudgetingMode = 'income_equivalent' | 'spendable_income' | 'custom_limit';

export type PaymentMethod = 
  | 'UPI' 
  | 'Debit card' 
  | 'Credit card' 
  | 'Cash' 
  | 'Net banking' 
  | 'Wallet' 
  | 'Other';

export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund';

export type RealityTone = 'friendly' | 'sarcastic' | 'straightforward' | 'encouraging';

export type AccountType = 'savings' | 'current' | 'credit_card' | 'wallet';

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface User {
  id: string;
  display_name: string;
  email?: string;
  preferred_currency: string;
  timezone: string;
  created_at: string;
}

export interface FinancialProfile {
  user_id: string;
  monthly_income: number;
  salary_credit_day: number;
  budgeting_mode: BudgetingMode;
  savings_target: number;
  fixed_commitments: number;
  daily_budget_override: number;
  monthly_spending_target?: number;
}

export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: AccountType;
  provider: string; // e.g. "HDFC Bank", "ICICI Bank", "SBI", "Razorpay Mock"
  account_number_mask?: string; // e.g. "••4921"
  balance: number;
  connection_status: 'connected' | 'disconnected' | 'sync_error' | 'consent_pending';
  last_synced_at?: string;
  is_demo: boolean;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon: string;
  color: string;
  category_type: 'expense' | 'income' | 'transfer' | 'investment' | 'savings';
  is_default?: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id?: string;
  transaction_date: string; // YYYY-MM-DD or ISO string
  merchant: string;
  description?: string;
  amount: number;
  transaction_type: TransactionType;
  category_id: string;
  payment_method: PaymentMethod;
  external_transaction_id?: string;
  is_recurring?: boolean;
  is_unplanned?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Metadata to prevent duplicate counting
  is_credit_card_payment?: boolean;
  is_internal_transfer?: boolean;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id?: string; // If undefined, applies to overall spending
  period: 'monthly' | 'weekly' | 'custom';
  limit_amount: number;
  start_date: string;
  end_date: string;
}

export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  next_due_date: string; // YYYY-MM-DD
  category_id: string;
  auto_record: boolean;
  merchant?: string;
  is_active: boolean;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string; // YYYY-MM-DD
  icon: string;
  category: 'emergency_fund' | 'purchase' | 'investment' | 'challenge' | 'general';
}

export interface NotificationPreference {
  user_id: string;
  morning_reminder: boolean;
  morning_reminder_time: string; // HH:mm (e.g. "08:30")
  evening_summary: boolean;
  evening_summary_time: string; // HH:mm (e.g. "21:30")
  warning_threshold: number; // percentage (e.g. 80)
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // e.g. "22:00"
  quiet_hours_end: string; // e.g. "07:00"
  preferred_tone: RealityTone;
  browser_push_enabled: boolean;
}

export interface BankConsent {
  id: string;
  user_id: string;
  provider: 'Setu AA' | 'Finvu' | 'OneMoney' | 'Anumati' | 'Demo AA Gateway';
  consent_reference: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'PAUSED';
  data_range_from: string;
  data_range_to: string;
  expiry_date: string;
  accounts_linked: string[];
  created_at: string;
}

export type BudgetStatus = 'comfortable' | 'getting_close' | 'budget_reached' | 'overspent';

export interface DailySpendingReport {
  date: string;
  dailyBudget: number;
  actualSpending: number;
  variance: number; // dailyBudget - actualSpending
  remainingAllowance: number;
  overspending: number;
  percentUsed: number;
  status: BudgetStatus;
  statusLabel: string;
  biggestCategory?: string;
  biggestCategoryAmount?: number;
  transactionCount: number;
  unplannedCount: number;
  recentDailyAverage: number;
  hasTransactions: boolean;
  message: string;
  actionSuggestion: string;
}
