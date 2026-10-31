# PAISA — Comprehensive Offline-First Architecture & Storage Audit
**Document ID:** `docs/PAISA_OFFLINE_FIRST_AUDIT.md`  
**Execution Stage:** Stage One — Inspection & Baseline Assessment  
**Author:** Software Architecture, Database, Mobile & Security Engineering Team  
**Date:** October 31, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Audit Objectives

PAISA is an Indian personal finance and cashflow reality-check application architected for dual deployment:
1. **Web Progressive Web App (PWA)** deployed globally on Vercel at `https://paisa-orpin.vercel.app/`.
2. **Native Android Application** packaged via Capacitor 8 (`packageId: money.paisa.app`), compiled for SDK 24–36, and published under GitHub Release `v1.0.0-android`.

The application's core design philosophy prioritizes **strict local privacy, zero banking credential storage, and instant offline responsiveness**. However, the current data persistence model relies almost exclusively on browser `localStorage`, with early Supabase client scaffolding that does not yet implement durable two-way offline synchronization, conflict detection, or transactional outbox queues.

This audit provides a forensic, component-by-component inspection of the codebase to establish the exact baseline before designing and implementing the offline-first data layer and two-way Supabase synchronization engine.

---

## 2. Technology Stack & Project Structure

### 2.1 Runtime & Framework Analysis
| Layer | Technology | Version | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + React DOM | `18.3.1` | Core reactive component tree |
| **Language & Tooling** | TypeScript | `5.6.3` | Type safety and strict domain interfaces |
| **Bundler & Dev Server**| Vite | `5.4.10` / `5.4.21` | ESM HMR dev server & Rollup production chunking |
| **Styling** | Tailwind CSS + Autoprefixer | `3.4.14` | Warm parchment theme (`#FAF8F5`, `#181D26`, `#D4952B`) |
| **Charts & Data Viz** | Recharts | `2.13.3` | 30-day timeline, cashflow burn charts, donut breakdowns |
| **Icons** | Lucide React | `0.460.0` | Accessible SVG icon suite |
| **Mobile Runtime** | Capacitor Android | `8.6.0` | Native Android webview container, splash, and asset bridge |
| **Cloud Backend** | Supabase JS Client | `2.46.1` | Postgres REST, Auth, and RLS integration |
| **Statement Parsing** | SheetJS (`xlsx`) + PDF.js (`pdfjs-dist`) | `0.18.5` / `6.4.299` | 100% on-device Excel & PDF statement parsing with password decryption |
| **Testing Harness** | Vitest | `2.1.9` | 11 unit, integration, and security test suites (164 tests) |

### 2.2 Directory Hierarchy
```
F:\.gemini\antigravity\scratch\paisa\
├── .agents/                 # Local Supabase & Postgres agent skills
├── .github/workflows/       # GitHub Actions CI for Android APK builds
├── android/                 # Native Android Gradle project (Capacitor 8)
│   ├── app/src/main/assets/public/ # Bundled web distribution for native offline container
│   ├── build.gradle
│   └── variables.gradle     # compileSdkVersion 36, targetSdkVersion 35, minSdkVersion 24
├── dist/                    # Vite production build artifacts
├── docs/                    # Architectural specs, operations, and compliance runbooks
├── floorplan/               # Interactive codebase architecture visualizer
├── public/                  # Static assets, web worker scripts, floorplan, icons
├── src/
│   ├── components/
│   │   ├── analytics/       # AI Insights & Monthly Report views
│   │   ├── budgets/         # Budget CRUD modals & Savings Goals trackers
│   │   ├── common/          # Command palette, bill pay UPI modal, toasts, shortcuts
│   │   ├── dashboard/       # Daily reality-check, spending timeline, charts
│   │   ├── notifications/   # Reality alerts & notification center
│   │   ├── onboarding/      # Initial profile setup wizard
│   │   ├── public/          # Terms, privacy, security, and compliance modals
│   │   └── transactions/    # Transaction CRUD, filters, statement import modal
│   ├── lib/
│   │   ├── auditLogger.ts   # Security event and consent audit logger
│   │   ├── authService.ts   # PBKDF2/SHA-256 local auth & Supabase Auth adapter
│   │   ├── bankAdapter.ts   # RBI Account Aggregator (AA) mock consent framework
│   │   ├── calculations.ts  # Integer paise arithmetic, daily burn rate, net worth
│   │   ├── categorization.ts# Merchant dictionary & keyword rule classifier
│   │   ├── csvParser.ts     # Multi-format statement processor (Excel, PDF, CSV, JSON)
│   │   ├── forecasting.ts   # Month-end cashflow predictive forecasting
│   │   ├── notifications.ts # Toast and alert generation engine
│   │   ├── security.ts      # Input sanitization, password strength validator
│   │   ├── storage.ts       # Central data store (currently synchronous localStorage)
│   │   └── supabaseClient.ts# Supabase client singleton & configuration guard
│   ├── pages/               # Dashboard, Transactions, Budgets, Goals, Bank, Settings
│   ├── test/                # 11 Vitest test suites
│   ├── types/               # TypeScript interfaces for all domain entities
│   ├── App.tsx              # Root component, routing, history popstate synchronization
│   └── main.tsx             # React DOM entry point
├── supabase/
│   └── migrations/          # DDL migrations (initial schema & RLS policies)
├── capacitor.config.json    # Capacitor configuration (appId: money.paisa.app)
├── package.json             # NPM dependencies and scripts
└── vite.config.ts           # Vite configuration with code splitting manualChunks
```

---

## 3. Storage Layer Inspection: Current State & Vulnerabilities

### 3.1 Current Local Storage Implementation
All persistent entity reads and writes currently route through `src/lib/storage.ts`.
This store relies exclusively on the browser's synchronous `localStorage` API:

```typescript
// Current storage mechanism in src/lib/storage.ts
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
};

// Additional auth and security keys in src/lib/authService.ts and auditLogger.ts
const AUTH_KEYS = {
  CURRENT_SESSION: 'paisa_auth_session',
  USERS_REGISTRY: 'paisa_auth_users_registry',
  RATE_LIMIT_PREFIX: 'paisa_auth_rate_limit_',
  AUDIT_LOGS: 'paisa_security_audit_logs',
};
```

### 3.2 IndexedDB Status
**Finding:** While `src/components/public/PublicPageModal.tsx` references IndexedDB in privacy disclosures, **IndexedDB is not actually used anywhere in the runtime code**. All data resides in `localStorage`.

### 3.3 Critical Limitations of the Current Storage Model
1. **5MB Browser Storage Ceiling**: `localStorage` in Mobile Chrome and Safari caps storage at 5MB. In a personal finance app with 5,000+ transaction ledgers, audit logs, and imported statements, users will hit `QuotaExceededError`.
2. **Main Thread Blocking (UI Jitter)**: Serializing/deserializing multi-megabyte JSON arrays synchronously on every transaction create/update freezes the JavaScript UI thread, violating the 60fps responsiveness target.
3. **Zero Encryption at Rest**: `localStorage` data is stored in unencrypted plaintext files on the device filesystem. On rooted Android devices or shared workstations, financial balances and merchant records are vulnerable.
4. **No Transactional Integrity / Atomicity**: If the app is killed or the browser crashes midway through a multi-record bulk import, `localStorage` has no rollback or write-ahead logging (WAL) mechanism.
5. **Missing Synchronization Metadata**: Existing records lack:
   - Record version numbers (`version: number`).
   - Sync status flag (`sync_status: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete'`).
   - Sync timestamp (`last_synced_at?: string`).
   - Tombstone / soft-deletion markers (`deleted_at?: string`).
   - Durable outbox queue for network retries.

---

## 4. Financial Data Models Audit

Every model defined in `src/types/index.ts` is audited below for local storage and cloud database parity:

| Model Interface | Primary Key | User Scope | Sensitive Fields | Missing Sync Attributes |
| :--- | :--- | :--- | :--- | :--- |
| **`User`** | `id` (UUID / text) | Self | `email`, `display_name` | `version`, `sync_status` |
| **`FinancialProfile`** | `user_id` (1:1) | `user_id` | `monthly_income`, `savings_target` | `id`, `version`, `updated_at`, `sync_status` |
| **`Account`** | `id` (UUID) | `user_id` | `balance`, `account_number_mask` | `version`, `updated_at`, `deleted_at`, `sync_status` |
| **`Category`** | `id` (text / slug) | System (`NULL`) or Custom (`user_id`) | Non-sensitive | `version`, `updated_at`, `deleted_at`, `sync_status` |
| **`Transaction`** | `id` (UUID) | `user_id` | `amount`, `merchant`, `notes` | `version`, `deleted_at`, `sync_status` |
| **`Budget`** | `id` (UUID) | `user_id` | `limit_amount` | `version`, `updated_at`, `deleted_at`, `sync_status` |
| **`RecurringPayment`** | `id` (UUID) | `user_id` | `amount`, `merchant` | `version`, `updated_at`, `deleted_at`, `sync_status` |
| **`SavingsGoal`** | `id` (UUID) | `user_id` | `target_amount`, `current_amount` | `version`, `updated_at`, `deleted_at`, `sync_status` |
| **`NotificationPreference`** | `user_id` (1:1) | `user_id` | Time preferences | `id`, `version`, `sync_status` |
| **`BankConsent`** | `id` (UUID) | `user_id` | `consent_reference`, `accounts_linked` | `version`, `updated_at`, `sync_status` |
| **`ImportRecord`** | `id` (UUID) | `user_id` | File names, transaction ID lists | `version`, `sync_status` |

---

## 5. Component Read/Write Dependency Mapping

The table below maps every UI component, page, and service in PAISA that interacts with financial data via `src/lib/storage.ts`:

| Component / File | Reads What | Writes / Modifies What | Storage Methods Called |
| :--- | :--- | :--- | :--- |
| `src/pages/DashboardPage.tsx` | Profile, Accounts, Transactions, Budgets, Goals, Bills | None (Display only) | `getProfile()`, `getAccounts()`, `getTransactions()`, `getBudgets()`, `getSavingsGoals()`, `getRecurringPayments()` |
| `src/components/dashboard/SpendingTimeline.tsx` | Transactions, Categories | None | `getTransactions()`, `getCategories()` |
| `src/components/dashboard/SpendingOverviewDonut.tsx` | Transactions, Categories | None | `getTransactions()`, `getCategories()` |
| `src/components/dashboard/MonthlyTrendChart.tsx` | Transactions | None | `getTransactions()` |
| `src/pages/TransactionsPage.tsx` / `TransactionList.tsx` | Transactions, Categories | Deletes transaction, Restores deleted transaction (undo) | `getTransactions()`, `getCategories()`, `deleteTransaction()`, `addTransaction()` |
| `src/components/transactions/TransactionForm.tsx` | Accounts, Categories, Profile | Adds new transaction, Updates existing transaction | `getAccounts()`, `getCategories()`, `getProfile()`, `addTransaction()`, `updateTransaction()` |
| `src/components/transactions/CsvImportModal.tsx` | Profile, Transactions, Rules, Import History | Bulk transaction inserts, Records import, Rollback batch | `getProfile()`, `getTransactions()`, `getUserCategoryRules()`, `addTransactionsBulk()`, `recordImport()`, `getImportHistory()`, `rollbackImport()` |
| `src/pages/BudgetsPage.tsx` / `BudgetManager.tsx` | Budgets, Categories, Transactions | Creates budget, Updates category budget limit | `getBudgets()`, `getCategories()`, `getTransactions()`, `updateCategoryBudget()`, `setCategoryBudgets()` |
| `src/components/budgets/SavingsGoalsList.tsx` | Goals, Profile | Creates goal, Adds funds to goal, Deletes goal | `getSavingsGoals()`, `addSavingsGoal()`, `updateSavingsGoal()`, `deleteSavingsGoal()` |
| `src/pages/RecurringPage.tsx` | Recurring Bills, Categories, Profile | Creates bill, Toggles active status, Deletes bill | `getRecurringPayments()`, `getCategories()`, `addRecurringPayment()`, `updateRecurringPayment()`, `deleteRecurringPayment()` |
| `src/pages/BankAccountsPage.tsx` | Accounts, Bank Consents, Profile | Adds manual bank account, Links AA consent account | `getAccounts()`, `getBankConsents()`, `addAccount()`, `updateAccount()`, `saveBankConsent()` |
| `src/pages/SettingsPage.tsx` | User, Profile, Notifications, Audit Logs, All Data | Updates profile, Changes currency/timezone, Full JSON Backup Export, Full JSON Backup Import, Reset to Demo Data | `getUser()`, `updateUser()`, `getProfile()`, `updateProfile()`, `getNotificationPreferences()`, `updateNotificationPreferences()`, `exportFullDataBackup()`, `importFullDataBackup()`, `resetToDemoData()` |
| `src/components/common/BillPayModal.tsx` | Accounts, Recurring Bills | Records payment transaction, updates bill due date | `getAccounts()`, `addTransaction()`, `updateRecurringPayment()` |
| `src/components/common/CommandPalette.tsx` | Accounts, Budgets, Goals, Transactions | Quick navigation | `getAccounts()`, `getBudgets()`, `getSavingsGoals()`, `getTransactions()` |
| `src/components/onboarding/OnboardingWizard.tsx` | None (initial setup) | Sets onboarding flag, Creates initial profile & accounts | `setOnboarded()`, `updateUser()`, `updateProfile()`, `addAccount()` |
| `src/components/analytics/MonthlyReportView.tsx` | Transactions, Categories, Profile | None | `getTransactions()`, `getCategories()`, `getProfile()` |
| `src/components/analytics/AIInsightsView.tsx` | Transactions, Budgets, Goals | Dismisses insight recommendation | `getTransactions()`, `getBudgets()`, `getSavingsGoals()`, `dismissInsight()` |
| `src/lib/bankAdapter.ts` | Bank Consents | Generates mock AA consent and syncs accounts | `getBankConsents()`, `saveBankConsent()`, `addAccount()` |

---

## 6. Authentication & Session Architecture

### 6.1 Current Auth Implementation (`src/lib/authService.ts`)
PAISA currently provides a hybrid authentication layer:
1. **Local Mode (Default / Offline)**:
   - Implements PBKDF2 / SHA-256 password hashing with salt using the browser's standard Web Crypto API (`crypto.subtle.digest`).
   - Maintains a local user registry in `localStorage` under `paisa_auth_users_registry`.
   - Manages sessions with 7-day token expiration stored in `paisa_auth_session`.
   - Enforces a 5-minute lockout after 5 consecutive failed login attempts.
2. **Cloud Mode (Supabase Auth)**:
   - Scaffolded via `src/lib/supabaseClient.ts`.
   - Uses `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
   - Currently gated by `isSupabaseConfigured` boolean guard.

### 6.2 Security Vulnerability Assessment of Current Auth
> [!WARNING] Critical Security Architecture Finding
> 1. **Client-Side PBKDF2/SHA-256**: In local mode, the salt and hash both reside in browser `localStorage`. A compromised browser extension or local attacker with physical device access can extract the password hashes.
> 2. **Session Token Invalidation**: Local tokens are simple random UUID strings; logging out removes the token from storage, but there is no server-side token revocation list when working offline.
> 3. **Non-Unified Identity**: A user registered locally with email `user@example.com` currently has a different local UUID than their Supabase `auth.users` UUID when they connect online. The data migration layer must reconcile these identities without duplicating or orphaning financial records.

---

## 7. Supabase Database Configuration & Parity Status

### 7.1 Live Supabase Project Verification
- **Project Ref:** `hpscyhvlbisquajditpg`
- **Region:** `ap-south-1` (Mumbai, India)
- **Status:** `ACTIVE_HEALTHY` (PostgreSQL 17.11)
- **RLS Status:** Enabled on all 10 public tables (`public.users`, `public.financial_profiles`, `public.accounts`, `public.categories`, `public.transactions`, `public.budgets`, `public.recurring_payments`, `public.savings_goals`, `public.notification_preferences`, `public.bank_consents`).

### 7.2 Schema Parity & Synchronization Gaps
Comparing local TypeScript models in `src/types/index.ts` with Supabase PostgreSQL tables:

| Schema Column / Field | Local Model (`src/types/index.ts`) | Supabase PostgreSQL Table | Parity Gap & Remediation Needed |
| :--- | :--- | :--- | :--- |
| **Transaction Amount** | `amount: number` (Rupees) | `amount NUMERIC(14,2)` | Compatible. Must ensure integer paise precision is preserved without floating-point drift. |
| **Record Version** | Missing | Missing in DB | **Gap:** Neither local nor cloud tracks entity versions (`version INT DEFAULT 1`). Needed for concurrency and conflict detection. |
| **Sync Status** | Missing | N/A (Cloud is source of truth) | **Gap:** Local records need `sync_status` (`synced`, `pending_insert`, `pending_update`, `pending_delete`). |
| **Tombstones / Deletions**| Missing (hard deletion in localStorage) | Missing in DB (hard DELETE) | **Gap:** Hard deletion locally leaves cloud unaware that a record was deleted offline. Need `deleted_at TIMESTAMPTZ` tombstones. |
| **Outbox Queue** | Missing | N/A | **Gap:** Local database needs an `outbox_sync_queue` table to record every pending mutation while disconnected. |

---

## 8. Mobile & Native Android Audit (Capacitor 8)

### 8.1 Capacitor Build & Native Container
- **App ID:** `money.paisa.app`
- **App Name:** `PAISA`
- **Android Target:** Android 16 (API 36 / Android 15 Vanilla Ice Cream), `minSdkVersion 24` (Android 7.0 Nougat).
- **Asset Distribution:** Web assets are copied to `android/app/src/main/assets/public/` during CI/CD.
- **Worker Scripts:** `pdf.worker.min.mjs` is bundled locally within assets, ensuring offline PDF statement decryption on mobile.

### 8.2 Mobile Local Database Strategy
- **Android / Native:** Standard browser `localStorage` in Android WebView is prone to eviction by the OS under low memory conditions. On native Android, PAISA must leverage **SQLite with SQLCipher encryption** (via a Capacitor SQLite plugin) for encrypted, durable, multi-gigabyte persistence.
- **Web PWA:** Browsers do not support direct native SQLite without heavy WebAssembly overhead; PAISA Web must use **IndexedDB (via Dexie / idb)** with asynchronous non-blocking transactions and automatic versioned schema upgrades.

---

## 9. Baseline Test Suite Status

All existing 11 test suites were executed and verified:
- **Test Framework:** Vitest 2.1.9
- **Total Tests:** 164 passing
- **Suites Passed:** 11 / 11
  1. `calculations.test.ts` (28 tests) — Rupee currency formatting, paise integer conversions, daily burn rate
  2. `qa_business_launch_readiness.test.ts` (17 tests) — DPDP Act compliance, consent revocation, zero bank credentials
  3. `qa_ui_features_overhaul.test.ts` (6 tests) — Popstate routing, backup import/export, soft delete undo
  4. `qa_financial_accuracy.test.ts` (21 tests) — Net worth arithmetic, categorization accuracy
  5. `qa_performance_stress.test.ts` (6 tests) — 5,000 transaction stress test, memory benchmarks
  6. `qa_security_accessibility.test.ts` (7 tests) — WCAG 2.1 contrast, ARIA landmarks, keyboard nav
  7. `intelligence.test.ts` (15 tests) — Reality-check alerts, overspending predictions, tone adjustments
  8. `security.test.ts` (31 tests) — PBKDF2 hashing, session expiry, brute-force lockout, tenant isolation
  9. `qa_e2e_journeys.test.ts` (5 tests) — Full 15-step continuous financial lifecycle
  10. `integrations.test.ts` (21 tests) — RBI AA consent lifecycle, CSV/JSON statement ingestion
  11. `excel_pdf_statement_parsing.test.ts` (7 tests) — Excel (.xlsx/.xls) parsing, PDF statement extraction, roundtrip export

---

## 10. Stage One Conclusions & Action Plan for Subsequent Stages

1. **Safety Assurance:** The baseline application is functional, healthy, and all 164 tests pass. **Zero destructive operations have been initiated.**
2. **Next Steps (Stage Two — Data Layer Design):**
   - Design an abstract Repository / Data-Access Layer (`IDataStore`) decoupling UI components from specific storage engines.
   - Implement IndexedDB for Web and SQLite for Capacitor Mobile.
   - Add synchronization attributes (`version`, `sync_status`, `updated_at`, `deleted_at`) to every domain record.
   - Create a durable `outbox` queue to record offline mutations for background synchronization.
