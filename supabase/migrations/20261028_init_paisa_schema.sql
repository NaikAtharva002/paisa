-- ==============================================================================
-- PAISA — Schema & Row Level Security (RLS) Migrations
-- Designed for Supabase / PostgreSQL 15+
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS PROFILE TABLE
-- Extends Supabase auth.users with app-specific profile data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  preferred_currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. FINANCIAL PROFILES
CREATE TABLE IF NOT EXISTS public.financial_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  monthly_income NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (monthly_income >= 0),
  salary_credit_day SMALLINT DEFAULT 1 NOT NULL CHECK (salary_credit_day BETWEEN 1 AND 31),
  budgeting_mode VARCHAR(30) DEFAULT 'income_equivalent' NOT NULL CHECK (budgeting_mode IN ('income_equivalent', 'spendable_income', 'custom_limit')),
  savings_target NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (savings_target >= 0),
  fixed_commitments NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (fixed_commitments >= 0),
  daily_budget_override NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (daily_budget_override >= 0),
  monthly_spending_target NUMERIC(14, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('savings', 'current', 'credit_card', 'wallet')),
  provider TEXT NOT NULL,
  account_number_mask VARCHAR(10),
  balance NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
  connection_status VARCHAR(30) DEFAULT 'connected' NOT NULL CHECK (connection_status IN ('connected', 'disconnected', 'sync_error', 'consent_pending')),
  last_synced_at TIMESTAMPTZ,
  is_demo BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id VARCHAR(60) PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL for system defaults
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color VARCHAR(20) NOT NULL,
  category_type VARCHAR(30) DEFAULT 'expense' NOT NULL CHECK (category_type IN ('expense', 'income', 'transfer', 'investment', 'savings')),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_type VARCHAR(20) DEFAULT 'expense' NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
  category_id VARCHAR(60) NOT NULL REFERENCES public.categories(id),
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('UPI', 'Debit card', 'Credit card', 'Cash', 'Net banking', 'Wallet', 'Other')),
  external_transaction_id TEXT,
  is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
  is_unplanned BOOLEAN DEFAULT FALSE NOT NULL,
  is_credit_card_payment BOOLEAN DEFAULT FALSE NOT NULL,
  is_internal_transfer BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. BUDGETS
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id VARCHAR(60) REFERENCES public.categories(id) ON DELETE CASCADE,
  period VARCHAR(20) DEFAULT 'monthly' NOT NULL CHECK (period IN ('monthly', 'weekly', 'custom')),
  limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. RECURRING PAYMENTS & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE NOT NULL,
  category_id VARCHAR(60) NOT NULL REFERENCES public.categories(id),
  auto_record BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. SAVINGS GOALS
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (current_amount >= 0),
  target_date DATE NOT NULL,
  icon TEXT DEFAULT 'PiggyBank' NOT NULL,
  category VARCHAR(30) DEFAULT 'general' NOT NULL CHECK (category IN ('emergency_fund', 'purchase', 'investment', 'challenge', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  morning_reminder BOOLEAN DEFAULT TRUE NOT NULL,
  morning_reminder_time VARCHAR(5) DEFAULT '08:30' NOT NULL,
  evening_summary BOOLEAN DEFAULT TRUE NOT NULL,
  evening_summary_time VARCHAR(5) DEFAULT '21:30' NOT NULL,
  warning_threshold SMALLINT DEFAULT 80 NOT NULL CHECK (warning_threshold BETWEEN 50 AND 100),
  quiet_hours_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  quiet_hours_start VARCHAR(5) DEFAULT '22:00' NOT NULL,
  quiet_hours_end VARCHAR(5) DEFAULT '07:00' NOT NULL,
  preferred_tone VARCHAR(30) DEFAULT 'friendly' NOT NULL CHECK (preferred_tone IN ('friendly', 'sarcastic', 'straightforward', 'encouraging')),
  browser_push_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. BANK CONSENTS (Account Aggregator Framework)
CREATE TABLE IF NOT EXISTS public.bank_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('Setu AA', 'Finvu', 'OneMoney', 'Anumati', 'Demo AA Gateway')),
  consent_reference TEXT NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'PAUSED')),
  data_range_from DATE NOT NULL,
  data_range_to DATE NOT NULL,
  expiry_date DATE NOT NULL,
  accounts_linked JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(user_id, external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_payments(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_savings_user ON public.savings_goals(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict tenant isolation: users can ONLY select, insert, update, or delete their own rows
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_consents ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can only read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Financial Profiles policies
CREATE POLICY "Users access own financial profile" ON public.financial_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Users access own accounts" ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- Categories policies (Users can view default system categories OR their own custom categories)
CREATE POLICY "Users view system defaults and own categories" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users insert/modify own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users access own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users access own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id);

-- Recurring Payments policies
CREATE POLICY "Users access own recurring payments" ON public.recurring_payments
  FOR ALL USING (auth.uid() = user_id);

-- Savings Goals policies
CREATE POLICY "Users access own savings goals" ON public.savings_goals
  FOR ALL USING (auth.uid() = user_id);

-- Notification Preferences policies
CREATE POLICY "Users access own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Bank Consents policies
CREATE POLICY "Users access own bank consents" ON public.bank_consents
  FOR ALL USING (auth.uid() = user_id);
