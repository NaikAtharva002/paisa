# PAISA — TECHNICAL HANDOVER DOCUMENTATION
## Comprehensive Architecture, Engineering & Operational Guide

**Product:** PAISA (Personal Finance & Daily Money Reality Check)  
**Version:** 1.0.0 Production Release  
**Target Platforms:** Web (Chrome, Firefox, Safari, Edge; Desktop, Tablet, Mobile PWA)  
**Author:** Principal Software Architect & Lead Fintech Engineer  
**Date:** October 31, 2026  

---

## 1. Executive Product Overview

PAISA is a personal finance application built to deliver a daily financial reality check rather than confusing accounting jargon.

### Core Philosophy
Most personal finance apps fail because they behave like complex corporate accounting software or passive monthly record books. PAISA is designed around **daily pacing and behavioral honesty**:
1. **Daily Discretionary Allowance:** Breaks down monthly income into an understandable daily spending limit after protecting fixed commitments and savings.
2. **Behavioral Reality Tones:** Delivers evening spending summaries in user-selected tones (*Friendly*, *Sarcastic*, *Straightforward*, or *Encouraging*).
3. **Exact Integer Paise Math:** Every calculation operates in integer paise ($1\text{ Rupee} = 100\text{ Paise}$) to eliminate JavaScript floating-point rounding errors.
4. **Privacy-First & Zero Credential Collection:** Runs offline-first with client-side deterministic persistence and never asks for banking passwords, UPI PINs, MPINs, or OTPs.

---

## 2. Technology Stack & Dependencies

```
+-------------------------------------------------------------------------+
|                           PAISA TECHNOLOGY STACK                        |
+-------------------------------------------------------------------------+
|  Frontend Framework:       React 18.3.1 (TypeScript 5.6.3)              |
|  Styling & UI Primitives:  Tailwind CSS 3.4.14, Lucide React Icons      |
|  Visual Analytics:         Recharts 2.13.3 (Responsive SVG Charts)      |
|  Build Tooling:            Vite 5.4.10 / 5.4.21, PostCSS, Autoprefixer   |
|  Test Runner:              Vitest 2.1.4 / 2.1.9 (8 Suites, 134 Tests)   |
|  Cryptographic Engine:     Web Crypto API (SubtleCrypto SHA-256)        |
|  Persistence Layer:        Local Deterministic Vault + Supabase Cloud   |
|  Hosting & Edge Security:  Vercel Edge Network (Strict CSP & HSTS)      |
+-------------------------------------------------------------------------+
```

### Production Dependencies (`package.json`)
- `react` & `react-dom` (`^18.3.1`): Declarative component UI engine.
- `lucide-react` (`^0.460.0`): Lightweight, accessible iconography.
- `recharts` (`^2.13.3`): Composable charting library for monthly trends and donut breakdowns.
- `clsx` & `tailwind-merge`: Deterministic Tailwind class combination.
- `canvas-confetti` (`^1.9.3`): Celebratory particle effects when savings goals are achieved.
- `@supabase/supabase-js` (`^2.46.1`): Client library for PostgreSQL Row Level Security synchronization.

---

## 3. System Architecture & Component Hierarchy

```
src/
├── App.tsx                     # Top-level state orchestrator & responsive layout
├── main.tsx                    # Vite entry point
├── index.css                   # Tailwind tokens & typography styling
├── types/
│   └── index.ts                # TypeScript domain models & interfaces
├── lib/
│   ├── calculations.ts         # Integer paise math, calendar logic, budgeting
│   ├── storage.ts              # Multi-tenant storage engine & event emitter
│   ├── authService.ts          # Salted SHA-256 auth, rate limiting & session tokens
│   ├── security.ts             # Anti-XSS sanitization, anti-CSV injection & masking
│   ├── auditLogger.ts          # Immutable security & financial event trail
│   ├── forecasting.ts          # Run-rate projection, outlier isolation, exhaustion
│   ├── categorization.ts       # 100+ Indian merchant dictionary & learned rules
│   ├── bankAdapter.ts          # RBI Account Aggregator framework & consent manager
│   ├── csvParser.ts            # CSV & JSON statement parser with 5MB/5000-row limits
│   ├── notifications.ts        # In-app notification center & real-time triggers
│   └── supabaseClient.ts       # Supabase Cloud Client with offline fallback
├── components/
│   ├── common/                 # Header, DesktopSidebar, BottomNav, Modal, StatCard
│   ├── dashboard/              # DailyRealityBanner, SpendingOverviewDonut, Charts
│   ├── transactions/           # TransactionList, TransactionForm, CsvImportModal
│   ├── budgets/                # BudgetManager, SavingsGoalsList, BudgetProgress
│   ├── analytics/              # MonthlyReportView, AIInsightsView
│   ├── notifications/          # NotificationCenter
│   └── onboarding/             # OnboardingWizard
├── pages/
│   ├── LandingPage.tsx         # Public marketing & value proposition screen
│   ├── DashboardPage.tsx       # Primary financial cockpit & quick actions
│   ├── RecurringPage.tsx       # Bills, subscriptions & next due date manager
│   ├── BankAccountsPage.tsx    # Connected accounts, AA consent status & sync
│   └── SettingsPage.tsx        # Profile calibration, backup export & data reset
└── test/
    ├── calculations.test.ts            # Precision math & rolling average tests
    ├── security.test.ts                # ASVS auth, sanitization & tenant isolation tests
    ├── intelligence.test.ts            # Forecasting, outlier & custom rule tests
    ├── integrations.test.ts            # AA consent, JSON imports & rollback tests
    ├── qa_financial_accuracy.test.ts   # Core arithmetic & calendar clamping tests
    ├── qa_e2e_journeys.test.ts         # 15-step continuous lifecycle & error paths
    ├── qa_performance_stress.test.ts   # 5,000 transaction load benchmarks
    └── qa_security_accessibility.test.ts # Injection defense & boundary tests
```

---

## 4. Key Functional Subsystems

### A. Exact Integer Paise Monetary Engine (`src/lib/calculations.ts`)
Standard JavaScript numbers suffer from binary floating-point rounding inaccuracies:
$$\text{In vanilla JS: } 0.1 + 0.2 = 0.30000000000000004$$
PAISA prevents this by converting every rupee figure into integer paise before any arithmetic:
- `toPaise(rupees)`: `Math.round(rupees * 100)`
- `fromPaise(paise)`: `Number((paise / 100).toFixed(2))`
- `addMoney(a, b)`: `fromPaise(toPaise(a) + toPaise(b))`
- `subtractMoney(a, b)`: `fromPaise(toPaise(a) - toPaise(b))`
- `multiplyMoney(amount, factor)`: `fromPaise(Math.round(toPaise(amount) * factor))`

### B. Calendar & Month-End Clamping Engine
When advancing recurring monthly bills (such as rent or internet) due on the 31st:
- Traditional `Date.setMonth()` causes January 31st to overflow into March 3rd, skipping February.
- PAISA implements month-end clamping via `getDaysInMonth(year, month)` and `isLeapYear(year)`:
  - January 31st advances to **February 28th** (or **February 29th** in leap years).
  - August 31st advances to **September 30th**.
  - February 29th (leap) advances yearly to **February 28th** (non-leap).

### C. Multi-Tenant Storage & Isolation Engine (`src/lib/storage.ts`)
- All records (Transactions, Accounts, Recurring Bills, Savings Goals, Bank Consents, and Learned Categorization Rules) are strictly scoped by `user_id`.
- Any attempt by User B to view, update, or delete User A's record is blocked by authorization guards and recorded in the audit log as `CROSS_TENANT_VIOLATION_ATTEMPT`.
- Features reactive subscriber pattern (`subscribeToStore`) allowing UI components to update immediately upon storage writes without page reloads.

### D. Authentication & Session Security (`src/lib/authService.ts`)
- Complies with OWASP ASVS v5.0.0 guidelines.
- Passwords require $\ge 8$ characters, uppercase, lowercase, numbers, and special symbols.
- Passwords are salted with unique cryptographic entropy and hashed using the Web Crypto API (`crypto.subtle.digest('SHA-256')`).
- Plaintext passwords are never stored in memory or disk.
- Enforces brute-force lockout: 5 consecutive failed login attempts trigger an immediate 5-minute cooldown.

### E. Intelligence & Spending Forecasting (`src/lib/forecasting.ts`)
- **Deterministic Run-Rate Model:**
  $$\text{RunRate} = \frac{\text{Spending}_{\text{mtd}} - \text{OneTimeOutliers}}{\text{Days Elapsed}}$$
  $$\text{Projected Month-End} = \text{Actual MTD} + (\text{RunRate} \times \text{Days Remaining}) + \text{Pending Recurring Bills}$$
- **Outlier Isolation:** Capital purchases $\ge 20\%$ of monthly income (such as flights or laptops) are isolated from the daily run-rate to prevent artificial projection spikes.
- **Pending Recurring Commitments:** Scans scheduled bills due for the remainder of the calendar month to forecast exact month-end balance.

### F. Bank Statement Imports & Atomic Rollback (`src/lib/csvParser.ts`)
- Ingests both CSV and JSON bank statement exports.
- Enforces strict production limits: maximum file size of **5 MB** and maximum batch limit of **5,000 rows**.
- **Dual-Tier Deduplication:** Matches incoming records against existing transactions by `external_transaction_id` or composite tuple `(Date + Amount + Normalized Merchant)`.
- **Atomic Rollback:** Every statement import creates an `ImportRecord` storing the generated transaction UUIDs. Users can click "Rollback" to cleanly remove only that imported batch without affecting prior transactions.

---

## 5. Local Development & Operational Commands

### Prerequisites
- Node.js version 18.x or 20.x LTS.
- npm version 9.x or 10.x.

### Development Loop
```bash
# 1. Install dependencies
npm install

# 2. Start local development server with hot-module replacement
npm run dev
# Running on http://localhost:5173

# 3. Execute all 8 automated Vitest test suites
npm test

# 4. Execute production build (TypeScript type check + Vite bundler)
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## 6. Deployment Procedure

### Vercel Deployment (Recommended)
1. Push the code to the GitHub repository on branch `main`.
2. Connect the repository in the Vercel Dashboard.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build` (runs `tsc && vite build`).
5. Output Directory: `dist`.
6. Environment Variables (Optional for Cloud Sync):
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOi...`
7. Deploy. `vercel.json` automatically configures Content Security Policy, HSTS, and immutable asset caching.
