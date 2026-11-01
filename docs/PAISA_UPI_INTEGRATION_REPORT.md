# PAISA — Real-Time UPI & Bank Notification Tracking and Clean Slate Enforcement Report

## 1. Executive Summary

This engineering deliverable completes the **Real-Time UPI Transaction Tracking Engine** and enforces a **100% Clean Slate Financial State** across the entire PAISA application.

### Key Deliverables:
1. **Android Native Notification Listener Service (`PaisaNotificationListenerService.java`)**:
   - Background listener extending `android.service.notification.NotificationListenerService`.
   - Listens exclusively for payment notifications from supported UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay) and Indian banking apps (HDFC, SBI, ICICI, Axis, Kotak, Bank SMS alerts).
   - **Bank-Grade Security Guard:** Hardcoded regex drops any notification containing security keywords (`OTP`, `one-time password`, `PIN`, `password`, `verification code`, `do not share`) before forwarding to the web layer.

2. **Capacitor Native Plugin Bridge (`UpiTrackerPlugin.java` & `upiTrackerBridge.ts`)**:
   - Exposes native Android permission checks (`NotificationManagerCompat.getEnabledListenerPackages`), deep link to Android Notification Access settings (`ACTION_NOTIFICATION_LISTENER_SETTINGS`), and reactive event dispatching (`notificationDetected`).
   - Seamless fallback for desktop web and development environments with complete simulation fidelity.

3. **Intelligent UPI Notification Parser (`upiNotificationParser.ts`)**:
   - Extracts amount (`₹`, `INR`, `Rs.`), direction (`expense`, `income`, `refund`, `transfer`), merchant/counterparty, 12-digit UTR/RRN reference IDs, and Virtual Payment Addresses (`VPA`).
   - Automatically drops promotional marketing messages, discount codes, and failed/declined transactions.
   - Treats refunds and reversals as spending reductions rather than income.

4. **Multi-Factor Deduplication & Cross-App Pairing**:
   - Prevents duplicate transaction creation when both a UPI app (e.g. PhonePe) and bank SMS (e.g. HDFC Bank) alert for the exact same payment.
   - Uses exact UTR matching, or combines amount, date, short time window (≤ 15 minutes), and merchant similarity.

5. **Settings Page Integration (`SettingsPage.tsx`)**:
   - Added **"Automatic Transaction Tracking"** card with toggle switch, permission badge, settings deep-link button, privacy disclosure, supported apps grid, and live counter of detected payments.

6. **Unconditional Clean Slate Data Purge (`storage.ts` & `App.tsx`)**:
   - Completely deleted all hardcoded demo constants (`DEFAULT_USER`, `DEFAULT_ACCOUNTS`, `DEFAULT_TRANSACTIONS`, `DEFAULT_PROFILE`, `DEFAULT_CATEGORY_BUDGETS`).
   - Implemented an auto-purging migration in `store.init()` that scans and wipes any legacy demo artifacts (`usr_paisa_demo_1`, Atharva demo user, `acc_hdfc_1`, demo balances) from existing browser `localStorage`.
   - Hardened `App.tsx` routing: users who have not completed the one-time onboarding procedure are strictly prevented from entering the dashboard and are guided through the clean Sign In / Sign Up and Onboarding Wizard.

---

## 2. Technical Architecture & Data Flow

```
[ Android OS Notification Event ]
               │
               ▼
[ PaisaNotificationListenerService.java ]
  ├─ Package Filter (GPay, PhonePe, Paytm, Banks, SMS)
  └─ Security Filter (Drops OTPs, PINs, Passwords)
               │
               ▼
[ UpiTrackerPlugin.java ] (Capacitor Native Plugin Bridge)
               │ (Dispatches "notificationDetected" Event)
               ▼
[ upiTrackerBridge.ts ] (Frontend Bridge)
  ├─ User Consent Check (Is Tracking Enabled?)
  └─ Routes to Parser
               │
               ▼
[ upiNotificationParser.ts ]
  ├─ Extraction: Amount, Direction, Merchant, UTR, VPA
  ├─ Security & Promo Filter
  ├─ Intelligence Engine: Categorization & Merchant Normalization
  └─ Multi-Factor Deduplication Engine
               │ (If Valid & Unique)
               ▼
[ store.addTransaction() ]
  ├─ Writes to Reactive Local Store (Integer Paise Precision)
  ├─ Persists to Offline IndexedDB Repository
  ├─ Enqueues Mutation in Sync Outbox Table
  ├─ Triggers Instant Toast Notification to User
  └─ Reactively Updates Dashboard Spending & Reality Check
```

---

## 3. Subsystem Implementation Details

### A. Android Native Layer
- **Service:** `android/app/src/main/java/money/paisa/app/PaisaNotificationListenerService.java`
  - Manifest permission: `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
- **Plugin:** `android/app/src/main/java/money/paisa/app/UpiTrackerPlugin.java`
  - Registered in `MainActivity.java` via `registerPlugin(UpiTrackerPlugin.class)`
- **Deep Link:** Directs user to `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` so they can grant notification access with one tap.

### B. TypeScript Parsing & Intelligence
- **File:** `src/lib/upiNotificationParser.ts`
- **Supported Formats:**
  - Google Pay: `"Paid ₹450.00 to Swiggy. UPI transaction ID: 429103948102"`
  - Google Pay: `"Received ₹1,500.00 from Amit Sharma amit@okaxis"`
  - PhonePe: `"Payment of ₹280 to Blue Tokai Coffee was successful. UTR: 430192847192"`
  - Paytm: `"Sent Rs. 650 to Blinkit Grocery blinkit@hdfcbank. Ref 410293847102"`
  - HDFC Bank SMS: `"A/C *4921 debited for INR 1,850.00 on 28-Oct-26 by UPI: Bescom Power Ref 491029384712."`
  - SBI SMS: `"Dear UPI user, A/C 8112 credited by INR 5,000.00 on 29Oct26 transfer from Rahul Verma Ref No 492019283718"`
  - Refunds: `"Refund of ₹350 from Swiggy has been credited to your bank account. Ref: 481920394819"`
  - Sensitive / Promo / Failed: Dropped gracefully with detailed diagnostic reasons.

### C. Clean Slate Enforcement
- **File:** `src/lib/storage.ts`
  - Auto-migration in `store.init()` purges any legacy demo data from existing browser `localStorage` on boot.
  - Initial state:
    - Total Balance: ₹0.00
    - Monthly Income: ₹0.00
    - Monthly Expenses: ₹0.00
    - Transactions: 0 (displays clean empty state with statement import CTA)
    - Budgets: 0
    - Accounts: 0
- **File:** `src/App.tsx`
  - Gated navigation: `if (showLanding || !isOnboarded)` guarantees un-onboarded visitors land on the Landing Page and enter through the dedicated Auth Page (Google OAuth, Phone OTP +91, or Email) and Onboarding Wizard.

---

## 4. Verification & Test Evidence

### Vitest Verification Suite (`npm test`)
All 18 test suites passed with 239 passing unit and integration tests:

```
 RUN  v2.1.9 F:/.gemini/antigravity/scratch/paisa

 ✓ src/test/offline_database_and_migration.test.ts (8 tests)
 ✓ src/test/budgets_clean_slate_redesign.test.ts (10 tests)
 ✓ src/test/transaction_intelligence_clean_slate.test.ts (18 tests)
 ✓ src/test/qa_financial_accuracy.test.ts (21 tests)
 ✓ src/test/calculations.test.ts (28 tests)
 ✓ src/test/offline_sync_engine.test.ts (12 tests)
 ✓ src/test/upi_transaction_tracking.test.ts (17 tests)
 ✓ src/test/qa_e2e_journeys.test.ts (5 tests)
 ✓ src/test/security.test.ts (31 tests)
 ✓ src/test/intelligence.test.ts (15 tests)
 ✓ src/test/qa_security_accessibility.test.ts (7 tests)
 ✓ src/test/integrations.test.ts (21 tests)
 ✓ src/test/qa_ui_features_overhaul.test.ts (6 tests)
 ✓ src/test/transaction_experience_redesign.test.ts (7 tests)
 ✓ src/test/mobile_hardening_storage.test.ts (3 tests)
 ✓ src/test/excel_pdf_statement_parsing.test.ts (7 tests)
 ✓ src/test/qa_business_launch_readiness.test.ts (17 tests)
 ✓ src/test/qa_performance_stress.test.ts (6 tests)

 Test Files  18 passed (18)
      Tests  239 passed (239)
```

### Production Build Verification (`npm run build`)
```
> paisa@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 2476 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                           5.15 kB │ gzip:   1.86 kB
dist/assets/index-gW02gUjd.css           59.51 kB │ gzip:  10.34 kB
dist/assets/vendor-react-B2c-LsTs.js      0.07 kB │ gzip:   0.08 kB
dist/assets/vendor-icons-Bhk_uwvY.js     50.08 kB │ gzip:  11.51 kB
dist/assets/vendor-charts-BABjabVr.js   546.74 kB │ gzip: 154.49 kB
dist/assets/index-CgPpgy5x.js           658.21 kB │ gzip: 167.13 kB
dist/assets/vendor-parsers-BITKyS3n.js  907.82 kB │ gzip: 286.27 kB
✓ built in 18.47s
```

### Capacitor Android Sync (`npx cap copy`)
```
√ Copying web assets from dist to android\app\src\main\assets\public in 45.42ms
√ Creating capacitor.config.json in android\app\src\main\assets in 2.34ms
√ copy android in 209.45ms
√ copy web in 14.05ms
```

---

## 5. Real-Device Testing Instructions

To test real UPI notification tracking on a physical Android device:

1. **Open PAISA on Android**:
   - Launch the application on your Android phone.
2. **Enable Notification Access**:
   - Go to **Settings** -> **Automatic Transaction Tracking**.
   - Tap **"Open Settings"** or toggle **Enable Tracking**.
   - Android will open the **Notification Access** settings screen.
   - Find **PAISA** in the list and toggle **Allow Notification Access**.
3. **Trigger a Payment Notification**:
   - Make a UPI transaction (e.g. ₹10 chai via Google Pay, PhonePe, or Paytm) or receive money from a friend.
   - When the payment notification appears in the Android notification drawer:
     - `PaisaNotificationListenerService` captures the text.
     - Confirms it contains no OTPs or passwords.
     - Forwards it via `UpiTrackerPlugin` into PAISA.
     - PAISA displays a toast: `"UPI Transaction Detected: [Merchant]: ₹X.XX"`.
     - The transaction is immediately stored in IndexedDB and reflects on the Transactions and Overview screens.
4. **Clean Slate Verification**:
   - Any fresh reload or app restart boots in a 100% clean state with zero demo accounts or fake transactions.
