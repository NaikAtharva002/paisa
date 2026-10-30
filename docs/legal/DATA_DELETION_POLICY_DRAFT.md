# DATA DELETION & ACCOUNT CLOSURE POLICY (DRAFT)

> [!IMPORTANT]
> **DRAFT — REQUIRES OWNER CONFIRMATION AND APPROPRIATE LEGAL REVIEW**

**Product Name:** PAISA — Daily Money Reality Check  
**Effective Date:** [EFFECTIVE DATE, e.g., November 1, 2026]  

---

## 1. RIGHT TO COMPLETE ERASURE (DPDP ACT 2023)

In accordance with Section 12 of India's Digital Personal Data Protection Act, 2023, every user has the absolute right to have their personal data erased from PAISA's systems without unnecessary procedural delay.

---

## 2. SELF-SERVE DATA DELETION (INSTANTANEOUS)

PAISA provides an instant, self-serve data erasure mechanism directly inside the application:

1. Open PAISA and navigate to **Settings** (or click the Settings gear icon).
2. Scroll to the **Danger Zone** section at the bottom of the page.
3. Click the red button: **"Erase Everything & Reset Vault"**.
4. Confirm the prompt acknowledging that all local financial data will be destroyed.

### What Happens When You Confirm:
- All transactions, budgets, recurring bills, savings goals, bank connections, and account profiles are instantly and permanently erased from your browser's `localStorage` and `IndexedDB`.
- Your session token is destroyed.
- If cloud synchronization is active, an authenticated deletion request (`DELETE FROM profiles WHERE id = user_id`) triggers a PostgreSQL foreign-key cascade, wiping all rows associated with your account from cloud database tables.
- You are logged out and returned to the initial welcoming screen.

---

## 3. MANUAL / SUPPORT-ASSISTED DELETION REQUESTS

If you are unable to access the web interface or wish to submit a formal erasure request via email:
- **Email:** [SUPPORT EMAIL ADDRESS, e.g., privacy@paisa.money]
- **Subject:** Data Erasure Request — [Your Registered Email]
- **SLA:** Our data protection team will verify your identity and confirm full database purge within **72 hours** of receiving your request.
