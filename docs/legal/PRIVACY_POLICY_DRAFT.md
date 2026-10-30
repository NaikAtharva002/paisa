# PRIVACY POLICY (DRAFT)

> [!IMPORTANT]
> **DRAFT — REQUIRES OWNER CONFIRMATION AND APPROPRIATE LEGAL REVIEW**  
> *This draft policy reflects the actual technical architecture of the PAISA software application as of October 31, 2026. It is designed to align with India's Digital Personal Data Protection (DPDP) Act, 2023, and IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. Before public publishing, replace all bracketed items and have this document reviewed by qualified Indian legal counsel.*

**Product Name:** PAISA — Daily Money Reality Check  
**Operated By:** [LEGAL BUSINESS NAME / FOUNDER ENTITY]  
**Registered Address:** [REGISTERED BUSINESS ADDRESS, CITY, STATE, PIN CODE, INDIA]  
**Contact Email:** [SUPPORT EMAIL ADDRESS, e.g., support@paisa.money]  
**Grievance Officer:** [NAME OF GRIEVANCE OFFICER] ([GRIEVANCE EMAIL ADDRESS])  
**Effective Date:** [EFFECTIVE DATE, e.g., November 1, 2026]  

---

## 1. OUR PRIVACY COMMITMENT

At PAISA, we believe your personal finances are strictly your business. PAISA is designed from the ground up as a **privacy-first, client-side, non-custodial** personal finance management application.

- **We NEVER ask for or store your bank login passwords, UPI PINs, MPINs, ATM PINs, OTPs, or debit/credit card CVVs.**
- **We NEVER sell, rent, monetize, or broker your personal or financial data to advertising networks, credit bureaus, or loan aggregators.**
- **By default, your financial information resides entirely inside your own web browser's encrypted local storage on your device.**

---

## 2. INFORMATION WE COLLECT AND PROCESS

We collect only the minimum information necessary to calculate your daily budget reality checks:

### 2.1 Account & Identity Information
- **Name / Display Name:** Used solely to address you within the dashboard (e.g. *"Good morning, Atharva"*).
- **Email Address:** Used as your unique account identifier for login and password recovery.
- **Password Hash:** When you register, your password is salted and cryptographically hashed directly on your device using the standard Web Crypto API (SHA-256). **We never receive, transmit, or store your plaintext password.**

### 2.2 Financial & Transaction Information (Entered by You or Imported)
- **Income & Salary:** Monthly take-home amount and monthly salary credit cycle dates.
- **Transaction Records:** Date, amount (processed in exact integer paise), category (e.g., Food & Dining, Shopping, Utilities), merchant name, payment method tag (UPI, Cash, Card), and optional personal notes.
- **Budget & Goal Targets:** Category monthly spending limits and savings goal targets.
- **Recurring Payments:** Due dates and frequencies of bills and subscriptions.

### 2.3 What We Explicitly DO NOT Collect
- ❌ **No Banking Credentials:** No NetBanking usernames, passwords, or security question answers.
- ❌ **No Payment Authorizations:** No UPI PINs, OTP codes, or transactional 2FA tokens.
- ❌ **No Card Details:** No 16-digit primary account numbers (PAN), expiration dates, or CVVs.
- ❌ **No National Government IDs:** No Aadhaar numbers, Permanent Account Numbers (PAN), or Passport numbers.

---

## 3. HOW WE PROCESS YOUR INFORMATION

Your data is processed strictly for the following purposes:
1. **Daily Reality Check Calculations:** Dividing your remaining disposable monthly income across remaining days in the month.
2. **Deterministic Spending Analytics:** Grouping transactions by merchant and category, and computing Month-over-Month (MoM) trend analytics.
3. **Run-Rate Predictive Forecasting:** Projecting month-end expenses based on your daily run-rate and scheduled recurring bills.
4. **Statement Parsing:** Translating bank statement CSV/JSON files locally inside your browser into standard ledger entries.

---

## 4. DATA STORAGE & CROSS-BORDER TRANSFERS

### 4.1 Client-Side Offline Storage (Default)
In default operation, all transaction records, budgets, and settings are saved inside your device's browser `localStorage` and `IndexedDB`. If you clear your browser data or use incognito mode without exporting a backup, this data is erased.

### 4.2 Cloud Synchronization (Optional)
If you elect to activate multi-device cloud synchronization via Supabase:
- Data is transmitted over encrypted Transport Layer Security (TLS 1.3).
- Data is stored in cloud databases hosted in [DATA STORAGE REGION, e.g., AWS Mumbai / ap-south-1].
- PostgreSQL Row Level Security (RLS) policies cryptographically isolate your records so no other authenticated user can read or alter your data.

---

## 5. DATA RETENTION & YOUR RIGHTS UNDER THE DPDP ACT 2023

Under the Indian Digital Personal Data Protection Act, 2023, you possess explicit rights regarding your digital personal data:

1. **Right to Access & Summary:** You can view your full transaction history and account summary at any time directly in the dashboard.
2. **Right to Data Portability:** You can export your entire financial history at any moment as an unencrypted, machine-readable JSON or CSV backup via **Settings $\to$ Export Full Financial Backup**.
3. **Right to Correction & Updating:** You can modify or update any transaction, budget, or profile setting instantly.
4. **Right to Erasure / "Right to Be Forgotten":** You can permanently destroy your account and all associated financial records via **Settings $\to$ Erase Everything & Reset Vault**. This permanently wipes your local device storage and cascades deletions across cloud database tables.
5. **Right of Grievance Redressal:** If you have concerns regarding how your data is handled, you may contact our designated Grievance Officer detailed in Section 7.

---

## 6. THIRD-PARTY SERVICE PROVIDERS

We engage only reputable infrastructure providers bound by confidentiality obligations:
- **Hosting & Content Delivery:** Vercel Inc. (Edge application hosting).
- **Optional Cloud Database:** Supabase Inc. (PostgreSQL database with encrypted at-rest storage).

We do not utilize third-party ad pixels (such as Meta Pixel or Google Ads Remarketing tags) that track your browsing behavior across other websites.

---

## 7. GRIEVANCE REDRESSAL OFFICER (INDIA)

In compliance with Section 19 of the Digital Personal Data Protection Act, 2023, and Rule 5(9) of the Information Technology Rules, 2011, the details of our Grievance Officer are:

- **Name:** [NAME OF DESIGNATED GRIEVANCE OFFICER]
- **Designation:** Data Protection & Grievance Officer
- **Physical Address:** [REGISTERED BUSINESS ADDRESS, INDIA]
- **Email:** [GRIEVANCE EMAIL ADDRESS, e.g., grievance@paisa.money]
- **Response Timeline:** We will acknowledge your grievance within 48 hours and resolve it within thirty (30) days of receipt.

---

## 8. CHANGES TO THIS PRIVACY POLICY

We may update this Privacy Policy from time to time to reflect product enhancements or statutory updates. Any changes will be posted on this page with an updated "Effective Date".
