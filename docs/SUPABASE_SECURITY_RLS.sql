-- ====================================================================
-- PAISA POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- Level 03 Security Hardening & Multi-Tenant Isolation
-- Compliant with OWASP ASVS v5.0.0 & PostgreSQL Hardening Standards
-- ====================================================================

-- 1. Enable RLS on all existing tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners to avoid accidental bypass in superuser queries
ALTER TABLE IF EXISTS profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_audit_logs FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 2. User Profiles & Financial Settings
-- ====================================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- FINANCIAL PROFILES
DROP POLICY IF EXISTS "Users can read own financial profile" ON financial_profiles;
CREATE POLICY "Users can read own financial profile"
  ON financial_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own financial profile" ON financial_profiles;
CREATE POLICY "Users can update own financial profile"
  ON financial_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own financial profile" ON financial_profiles;
CREATE POLICY "Users can insert own financial profile"
  ON financial_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 3. Financial Accounts & Institutions
-- ====================================================================

DROP POLICY IF EXISTS "Users can read own accounts" ON accounts;
CREATE POLICY "Users can read own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 4. Categories (System Defaults + Custom Tenant Categories)
-- ====================================================================

DROP POLICY IF EXISTS "Users can read system defaults or their own categories" ON categories;
CREATE POLICY "Users can read system defaults or their own categories"
  ON categories FOR SELECT
  USING (is_default = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own custom categories" ON categories;
CREATE POLICY "Users can insert own custom categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (is_default IS FALSE OR is_default IS NULL));

DROP POLICY IF EXISTS "Users can update own custom categories" ON categories;
CREATE POLICY "Users can update own custom categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id AND is_default IS NOT TRUE)
  WITH CHECK (auth.uid() = user_id AND is_default IS NOT TRUE);

DROP POLICY IF EXISTS "Users can delete own custom categories" ON categories;
CREATE POLICY "Users can delete own custom categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_default IS NOT TRUE);

-- ====================================================================
-- 5. Transactions (Core Financial Ledger)
-- ====================================================================

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 6. Budgets
-- ====================================================================

DROP POLICY IF EXISTS "Users can read own budgets" ON budgets;
CREATE POLICY "Users can read own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 7. Recurring Payments / Subscriptions
-- ====================================================================

DROP POLICY IF EXISTS "Users can read own recurring payments" ON recurring_payments;
CREATE POLICY "Users can read own recurring payments"
  ON recurring_payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring payments" ON recurring_payments;
CREATE POLICY "Users can insert own recurring payments"
  ON recurring_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring payments" ON recurring_payments;
CREATE POLICY "Users can update own recurring payments"
  ON recurring_payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring payments" ON recurring_payments;
CREATE POLICY "Users can delete own recurring payments"
  ON recurring_payments FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 8. Savings Goals
-- ====================================================================

DROP POLICY IF EXISTS "Users can read own savings goals" ON savings_goals;
CREATE POLICY "Users can read own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own savings goals" ON savings_goals;
CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own savings goals" ON savings_goals;
CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own savings goals" ON savings_goals;
CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- 9. Notification Preferences & Bank Consents
-- ====================================================================

DROP POLICY IF EXISTS "Users can manage own notifications" ON notification_preferences;
CREATE POLICY "Users can manage own notifications"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own bank consents" ON bank_consents;
CREATE POLICY "Users can manage own bank consents"
  ON bank_consents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 10. Security Audit Logs (Append-Only / Read-Own)
-- ====================================================================

-- Security audit logs must be append-only: no updates or deletes permitted by clients
DROP POLICY IF EXISTS "Users can read own audit events" ON security_audit_logs;
CREATE POLICY "Users can read own audit events"
  ON security_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit events" ON security_audit_logs;
CREATE POLICY "Users can insert own audit events"
  ON security_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
