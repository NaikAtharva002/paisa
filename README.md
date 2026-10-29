# PAISA — Your Daily Money Reality Check
> *"Your salary has a story. Find out where it goes."*
>
> *"Sometimes you don't need a higher salary. You need to understand where your current salary is going."*

---

## 1. Executive Summary & Product Vision

**Paisa** is a mobile-first personal finance application tailored for India's digital payments ecosystem. Traditional budgeting tools in India fail because they rely on retrospective monthly regret: at the end of the month, users wonder how their ₹1,00,000 salary vanished into a fog of small ₹200–₹600 UPI transactions across Swiggy, Blinkit, Zepto, and Uber.

Paisa breaks down monthly salaries into a **real-time daily spending reality check**:
- **Monthly Take-Home:** ₹1,00,000
- **Daily Income Equivalent (30-day month):** ₹3,333.33
- **Today's Actual Spending:** ₹2,500 (Coffee: ₹250, Blinkit: ₹600, Zepto: ₹400, Swiggy: ₹500, Shopping: ₹750)
- **Remaining Daily Allowance:** ₹833.33 (75% utilized — *Comfortable / Within budget*)
- **If user spends ₹4,200:** Instantly alerts overspending of ₹866.67 (+26% exceeded).

---

## 2. Indian Financial Conventions & Guarantees

1. **Currency & Formatting:** Standard Indian Number System (`₹1,00,000.00`, lakhs and crores grouping) with IST (`Asia/Kolkata`) timezone.
2. **UPI & Quick Commerce Focus:** Built-in auto-categorization for Indian merchants (Swiggy, Zomato, Blinkit, Zepto, Instamart, Uber, Ola, Apollo Pharmacy, Bescom, etc.).
3. **Double-Counting Prevention (Credit Cards):** Distinguishes original credit card purchases from subsequent credit card bill repayments (e.g. CRED / HDFC Card bill settlements). Bill settlements are recorded as transfers/settlements rather than double-counted expenses.
4. **Calendar Day Accuracy:** Automatically handles 31-day, 30-day, February 28-day, and February 29-day leap years (`2024`, `2028`, `2032`).

---

## 3. Account Aggregator (AA) India Bank Integration

Paisa is architected around the Reserve Bank of India (RBI) **Account Aggregator (AA)** master framework.

### Safety & Privacy Guarantees
- **No Banking Passwords or UPI PINs:** Paisa never asks, captures, or stores banking passwords, UPI PINs, or card CVVs.
- **Zero Screen Scraping or SMS Sniffing:** Direct, consent-driven, digitally signed data pipes from Financial Information Providers (FIPs).
- **Explicit Consent Management:** User controls purpose (Personal Finance Management), data range (last 90–180 days), frequency (daily/manual), and validity (1 year).
- **Revocation & Deletion (Test G):** Users can revoke consent or disconnect an account at any time, choosing to retain existing history as manual entries or purge it entirely.

### Integration Roadmap
- **Phase 1 (Complete):** Manual expense tracking, quick drawer, and CSV import/export with duplicate collision detection.
- **Phase 2 (Complete):** Modular Account Aggregator adapter (`src/lib/bankAdapter.ts`) supporting Setu AA, Finvu, OneMoney, and Anumati with sandbox consent simulation.
- **Phase 3 (Production Path):**
  1. Register as a Financial Information User (FIU) under RBI regulations and join the Sahamati alliance.
  2. Procure commercial API credentials from an authorized NBFC-AA (e.g., Setu AA / Pine Labs).
  3. Deploy hardware security modules (HSM) / KMS for asymmetric ECDH session key decryption.
  4. Implement webhook signature verification for asynchronous statement delivery.

---

## 4. Database Architecture & Row Level Security (RLS)

PostgreSQL schema and migrations located in `supabase/migrations/20261028_init_paisa_schema.sql`.

### Key Entities
- `public.users`: Extended profile (display name, currency, timezone).
- `public.financial_profiles`: Financial profile, take-home salary, salary credit day, budgeting mode, savings targets.
- `public.accounts`: Linked savings accounts, credit cards, and digital wallets.
- `public.transactions`: Normalized financial records with decimal-safe `NUMERIC(14,2)` amounts.
- `public.categories`: Default Indian taxonomy and custom user categories.
- `public.budgets`: Category-specific spending limits.
- `public.recurring_payments`: Fixed bills and subscriptions (Rent, Netflix, Broadband).
- `public.savings_goals`: Emergency funds, vacation buckets, and no-spend challenges.
- `public.notification_preferences`: Quiet hours, warning thresholds (e.g. 80%), and reality tones.
- `public.bank_consents`: Cryptographic consent references and account link statuses.

### Multi-Tenant Isolation
All tables enable **Row Level Security (RLS)** using `auth.uid() = user_id`, guaranteeing that User A can never query, modify, or delete User B's records.

---

## 5. Acceptance Test Verification (All Passed ✓)

The test suite is executable via `npm test` (`vitest run`):

| Test | Description | Result |
| :--- | :--- | :---: |
| **Test A** | Monthly income ₹1,00,000 in a 30-day month -> ₹3,333.33/day | **PASSED** |
| **Test B** | Daily budget ₹3,333.33; expenses ₹250, ₹600, ₹400, ₹500 -> Spent ₹1,750, Remaining ₹1,583.33 | **PASSED** |
| **Test C** | Daily budget ₹3,333.33; spending ₹4,200 -> Overspending ₹866.67 (+26% exceeded) | **PASSED** |
| **Test D** | Edit an expense from ₹500 to ₹300 -> dashboard, lists, and summaries update immediately | **PASSED** |
| **Test E** | Import CSV with duplicate rows -> duplicate engine detects duplicates & prevents double counting | **PASSED** |
| **Test F** | User A attempts to access User B's records -> blocked by tenant security rules | **PASSED** |
| **Test G** | Disconnecting bank account halts sync & offers data retention choices | **PASSED** |
| **Test H** | 31-day, 30-day, Feb 28-day, and Feb 29-day leap years calculate exact calendar equivalents | **PASSED** |
| **Test I** | Credit card purchase + subsequent bill payment -> counted once as spending, repayment treated as settlement | **PASSED** |
| **Test J** | Zero transactions today -> displays ₹0 spending with friendly prompt without breaking | **PASSED** |

---

## 6. Quick Start & Setup Instructions

### Prerequisites
- Node.js `v18+` or `v20+` or `v22+`
- npm `v9+` or `v10+` or `v11+`

### 1. Installation
```bash
cd paisa
npm install
```

### 2. Run Automated Tests
```bash
npm test
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Interactive Codebase Floorplan (by haydenschmitty/floorplan)
Explore an interactive visual map of Paisa's entire architecture, data flows, and health checks:
```bash
npm run floorplan
```
Opens the interactive node-graph map at [http://127.0.0.1:4378](http://127.0.0.1:4378) with plain-English walkthroughs, screen-first navigators, and guided flows.

### 5. Build Production Bundle
```bash
npm run build
```
Creates a minified, tree-shaken static production bundle in `dist/`.

---

## 7. Connecting to a Real Supabase Project (Optional)

Paisa is offline-first and runs out-of-the-box using browser persistence. To connect your production Supabase database:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. In Supabase Dashboard -> **SQL Editor**, execute the migration script in:
   `supabase/migrations/20261028_init_paisa_schema.sql`
3. Add your Supabase project keys to `.env.local`:
   ```ini
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
   ```
4. Restart the dev server (`npm run dev`).

---

## 8. Vercel Zero-Config Deployment Guide

Paisa is tuned for direct deployment on **Vercel** with turnkey Single Page Application (SPA) routing, asset caching, and security headers configured via `vercel.json`.

### Option A: Deploy via GitHub (Recommended)
1. Push your Paisa repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** -> **"Import"** your repository.
3. Vercel will automatically detect the settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. *(Optional)* Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
   *(If omitted, Paisa automatically runs in interactive offline-first local mode with full demo data).*
5. Click **"Deploy"**. Your application will be live at `https://your-project.vercel.app` in under 60 seconds!

### Option B: Deploy via Vercel CLI
```bash
# 1. Install Vercel CLI globally (if not already installed)
npm i -g vercel

# 2. Inside the paisa directory, run:
vercel

# 3. For production release:
vercel --prod
```

### Built-in Vercel Optimizations in Paisa:
- **`vercel.json` SPA Rewrites**: Maps all routes to `/index.html` to avoid 404 errors on deep page refreshes.
- **HTTP Security Headers**: Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.
- **Immutable Asset Caching**: 1-year cache headers on hashed `/assets/*` chunks for mobile loading speeds.
- **Rollup Code Splitting**: Vendor chunks (`vendor-charts`, `vendor-icons`, `vendor-react`) are isolated for optimal mobile network caching.
