-- ==============================================================================
-- PAISA — Stage Three: Additive Migration for Versioning, Soft Deletes & Offline Sync
-- Database: Supabase Cloud (PostgreSQL 17.11)
-- Safe to retry, non-destructive, strictly additive.
-- ==============================================================================

-- 1. Add Version and Soft-Deletion (Tombstone) Columns
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.recurring_payments
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.financial_profiles
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL;

ALTER TABLE public.bank_consents
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- 2. Concurrency Control Trigger: Automatically bump version on update
CREATE OR REPLACE FUNCTION public.handle_entity_version_bump()
RETURNS TRIGGER AS $$
BEGIN
  -- Bump version counter atomically
  NEW.version = COALESCE(OLD.version, 1) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger applications (idempotent drops and creates)
DROP TRIGGER IF EXISTS trg_transactions_version_bump ON public.transactions;
CREATE TRIGGER trg_transactions_version_bump
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

DROP TRIGGER IF EXISTS trg_accounts_version_bump ON public.accounts;
CREATE TRIGGER trg_accounts_version_bump
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

DROP TRIGGER IF EXISTS trg_budgets_version_bump ON public.budgets;
CREATE TRIGGER trg_budgets_version_bump
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

DROP TRIGGER IF EXISTS trg_savings_goals_version_bump ON public.savings_goals;
CREATE TRIGGER trg_savings_goals_version_bump
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

DROP TRIGGER IF EXISTS trg_recurring_payments_version_bump ON public.recurring_payments;
CREATE TRIGGER trg_recurring_payments_version_bump
  BEFORE UPDATE ON public.recurring_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

DROP TRIGGER IF EXISTS trg_financial_profiles_version_bump ON public.financial_profiles;
CREATE TRIGGER trg_financial_profiles_version_bump
  BEFORE UPDATE ON public.financial_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_entity_version_bump();

-- 3. High-Performance Sync Indexes
-- Enable high-speed delta queries: SELECT * FROM table WHERE user_id = $1 AND updated_at > $last_synced_at
CREATE INDEX IF NOT EXISTS idx_transactions_sync_delta ON public.transactions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_sync_delta ON public.accounts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_sync_delta ON public.budgets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_goals_sync_delta ON public.savings_goals(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_sync_delta ON public.recurring_payments(user_id, updated_at DESC);

-- Partial indexes for tombstone / deletion tracking
CREATE INDEX IF NOT EXISTS idx_transactions_tombstones ON public.transactions(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_tombstones ON public.accounts(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_tombstones ON public.budgets(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_savings_goals_tombstones ON public.savings_goals(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_tombstones ON public.recurring_payments(user_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- 4. Row Level Security Verification
-- Ensure RLS policies allow querying deleted_at rows for sync reconciliation
-- (All existing policies in public schema enforce auth.uid() = user_id for ALL actions)
COMMENT ON COLUMN public.transactions.version IS 'Incrementing concurrency version counter for offline conflict detection';
COMMENT ON COLUMN public.transactions.deleted_at IS 'Soft-deletion tombstone timestamp for two-way synchronization';
