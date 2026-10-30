# PAISA — APP STORE & PLAY STORE DISTRIBUTION PLAYBOOK

**Document Type:** Mobile Store Submission & Compliance Specifications  
**Target Platforms:** Google Play Store (Android) & Apple App Store (iOS)  
**Distribution Framework:** Progressive Web App (PWA) / Capacitor Native Shell  
**Status:** DRAFT SPECIFICATION — AWAITING OWNER STORE REGISTRATION & REVIEW  

---

## 1. GOOGLE PLAY CONSOLE LISTING SPECIFICATIONS

### 1.1 Store Metadata
- **App Title (max 30 chars):** `PAISA: Daily Money Tracker`
- **Short Description (max 80 chars):** `Your daily money reality check. Know your safe daily spending allowance in India.`
- **Full Description (max 4,000 chars):**
```text
Understand where your salary goes with PAISA — India's calm personal finance manager.

Every day, micro-transactions on UPI, food delivery, and quick groceries drain your account without warning. Traditional monthly budgeting doesn't work because it lectures you when your money is already gone.

PAISA gives you a live Daily Reality Check: it takes your monthly take-home salary, subtracts your fixed commitments, and gives you a clear daily spending allowance that updates in real time.

KEY FEATURES:
• REAL-TIME DAILY SPENDING ALLOWANCE: Instantly see what is safe to spend today before making UPI payments.
• BANK STATEMENT IMPORT (CSV & JSON): Import statements from SBI, HDFC, ICICI, Axis, Kotak, and more directly on your phone.
• ZERO BANKING PASSWORDS REQUIRED: We never ask for your NetBanking password, UPI PIN, ATM PIN, or OTPs.
• INTEGER PAISE ACCURACY: Built with exact integer arithmetic (1 Rupee = 100 Paise) to eliminate rounding errors.
• AUTOMATED MERCHANT TAGS: Instant categorization for Swiggy, Blinkit, Zepto, Uber, Ola, IRCTC, and Netflix.
• SAVINGS GOALS & CONFETTI: Track milestones with celebratory visuals as you reach your targets.
• PRIVACY-FIRST VAULT: Your financial records remain stored on your device. Complete data export and instant erasure available anytime.

PAISA is designed for Indian salary cycles and everyday life. Start your daily reality check today.
```

### 1.2 Google Play Graphic Asset Specifications
- **App Icon:** `512 x 512 px`, 32-bit PNG with alpha, max 1024 KB. (Source: `public/icon.svg`).
- **Feature Graphic:** `1024 x 500 px`, JPG or 24-bit PNG (no alpha). Design: Warm sandstone background with PAISA golden leaf emblem and tagline *"Your Daily Money Reality Check"*.
- **Phone Screenshots:** Minimum 4 screenshots, `1080 x 2400 px` (9:20 aspect ratio) or `1080 x 1920 px` (16:9).
  1. *Screenshot 1:* Dashboard showing Today's Snapshot & Daily Allowance.
  2. *Screenshot 2:* Interactive Paisa Formula & Real-time Remaining Buffer.
  3. *Screenshot 3:* Category Analytics & Essential vs Discretionary Breakdown.
  4. *Screenshot 4:* Savings Goal Milestone with Confetti Celebration.

### 1.3 Google Play Data Safety Questionnaire Draft
- **Data Collection:**
  - Name (Optional, for in-app personalization).
  - Email (For account identifier).
  - Financial Info: User-entered income, expenses, and transaction logs.
- **Data Sharing:** **NO DATA SHARED WITH THIRD PARTIES.**
- **Security Practices:**
  - Data encrypted in transit (TLS 1.3).
  - User can request data deletion directly inside the app (Settings $\to$ Erase Everything).
- **Financial Services Declaration:** Disclose that PAISA is an informational budget tracker and does not provide loans or banking services.

---

## 2. APPLE APP STORE CONNECT LISTING SPECIFICATIONS

### 2.1 Store Metadata
- **App Name (max 30 chars):** `PAISA: Daily Money Reality`
- **Subtitle (max 30 chars):** `Calm Expense & Budget Tracker`
- **Category:** Finance / Productivity
- **Promotional Text (max 170 chars):** `Stop asking where your salary went. Get a real-time daily spending allowance engineered for Indian salary earners.`
- **Keywords (max 100 chars, comma-separated):** `paisa,budget,expense tracker,salary,upi,india,daily allowance,money manager,savings,personal finance`
- **Support URL:** `https://paisa.money/help`
- **Marketing URL:** `https://paisa.money`
- **Privacy Policy URL:** `https://paisa.money/privacy`

### 2.2 Apple App Privacy Disclosures
Under Apple's App Privacy nutrition labels:
- **Data Linked to You:** Email Address, Name (Contact Info).
- **Data Not Linked to You / Device-Only:** Financial Information (User expenses, budgets, transactions are stored locally on device).
- **Tracking:** PAISA **DOES NOT TRACK** users across apps and websites owned by other companies.

### 2.3 Account Deletion Verification (Apple Guideline 5.1.1)
- Apple requires that all apps supporting account creation must offer an in-app account deletion mechanism.
- PAISA satisfies this requirement via **Settings $\to$ Erase Everything & Reset Vault**, which immediately destroys all local keys and cascading cloud rows.

---

## 3. STORE SUBMISSION PREREQUISITES FOR PROJECT OWNER

To proceed with actual store submissions, the owner must complete:
1. **Google Play Developer Account:** One-time registration fee of $25 USD at `play.google.com/console`.
2. **Apple Developer Program:** Annual membership fee of $99 USD at `developer.apple.com`.
3. **Capacitor Mobile Packaging:** Wrap the web build using Capacitor CLI (`npx cap add android` and `npx cap add ios`).
