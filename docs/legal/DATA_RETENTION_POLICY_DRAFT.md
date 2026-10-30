# DATA RETENTION POLICY (DRAFT)

> [!IMPORTANT]
> **DRAFT — REQUIRES OWNER CONFIRMATION AND APPROPRIATE LEGAL REVIEW**

**Product Name:** PAISA — Daily Money Reality Check  
**Effective Date:** [EFFECTIVE DATE, e.g., November 1, 2026]  

---

## 1. PURPOSE AND SCOPE

This policy outlines how long PAISA retains user data and the criteria used to determine retention periods, in compliance with the Digital Personal Data Protection (DPDP) Act, 2023.

---

## 2. RETENTION SCHEDULES BY DATA CATEGORY

| Category | Storage Location | Retention Period | Deletion Trigger |
|---|---|---|---|
| **Local Financial Ledger** (Transactions, Budgets, Goals, Bills) | Client browser LocalStorage | Kept on user's device as long as the user retains the app. | User clicks "Erase Everything", clears browser data, or uninstalls. |
| **Cloud Synchronized Ledger** (Optional Supabase vault) | Cloud PostgreSQL database | Retained as long as user account is active. | Immediate cascade purge upon user account deletion request. |
| **Failed Login Audit Logs** | Transient Redis / memory store | 24 hours maximum. | Rolling 24-hour automatic expiration. |
| **Security Audit Logs** (`CROSS_TENANT_VIOLATION_ATTEMPT`) | Encrypted server security logs | 90 days. | Required for cybersecurity incident analysis under CERT-In guidelines. |
| **User Support Inquiries** | Zendesk / Support Inbox | 6 months from ticket resolution. | Deleted automatically during semi-annual maintenance. |

---

## 3. PRINCIPLE OF STORAGE LIMITATION

PAISA strictly abides by the principle of **storage limitation**: data is never retained longer than necessary to deliver daily budget reality checks to the user. When an account is closed or deleted, cloud databases permanently remove all personal identifiers and financial records within 72 hours.
