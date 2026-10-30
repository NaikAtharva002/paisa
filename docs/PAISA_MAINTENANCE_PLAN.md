# PAISA — RECURRING MAINTENANCE PLAN
## Operational Cadence, Quality Audits & Infrastructure Hygiene

**Product:** PAISA (Personal Finance & Daily Money Reality Check)  
**Version:** 1.0.0  
**Date:** October 31, 2026  

---

## 1. Recurring Maintenance Schedule

```
+--------------------------------------------------------------------------+
|                        MAINTENANCE CADENCE OVERVIEW                      |
+-------------------+------------------------------------------------------+
| Daily (5 mins)    | Automated uptime monitor, error log check            |
| Weekly (30 mins)  | Run full test suite, verify audit logs               |
| Monthly (1 hr)    | npm dependency security audit, backup integrity test |
| Quarterly (2 hrs) | Regulatory compliance review, AA consent cleanup     |
| Annual (Half day) | Cryptographic key rotation, domain renewal audit     |
+-------------------+------------------------------------------------------+
```

---

## 2. Detailed Task Breakdown

### A. Daily Operations (5 Minutes)
- **Uptime Monitoring:** Verify Vercel hosting status and production URL availability.
- **Console Errors:** Check Sentry or Vercel runtime logs for new JavaScript exceptions.
- **Critical Alert Triage:** Review any high-priority security notifications.

### B. Weekly Maintenance (30 Minutes)
- **Automated Test Run:**
  ```bash
  npm test
  ```
  Ensure all 134 automated unit, integration, and E2E tests pass 100% green.
- **Audit Log Inspection:** Review `auditLogger` entries for anomalous `RATE_LIMIT_LOCKOUT` or `CROSS_TENANT_VIOLATION_ATTEMPT` spikes.
- **Git Repository Hygiene:** Ensure `main` branch is clean and all merged PRs have passing CI checks.

### C. Monthly Maintenance (1 Hour)
- **Dependency Vulnerability Scan:**
  ```bash
  npm audit
  ```
  Review and apply non-breaking security patches for npm dependencies (`npm audit fix`).
- **Backup Verification & Restore Test:**
  - Export a full JSON data backup from `SettingsPage.tsx`.
  - Ingest the backup in a clean staging profile and verify all transactions, savings goals, and budgets restore with 100% mathematical fidelity.
- **Operating Cost Review:** Inspect Vercel and Supabase billing dashboards to confirm spending remains within anticipated free/low-tier limits ($0–$25/month).

### D. Quarterly Reviews (2 Hours)
- **Regulatory & Compliance Check:** Review Reserve Bank of India (RBI) Account Aggregator Master Directions and Indian Digital Personal Data Protection (DPDP) Act guidelines for any new consent requirements.
- **Expired Consent Pruning:** Clean up expired or revoked consent artifacts in the database.
- **Performance Profiling:** Re-run 5,000-transaction stress benchmarks to ensure new features have not degraded calculation speed.

### E. Annual Reviews (Half Day)
- **Domain & SSL Renewal:** Ensure custom domain registration (`paisa.money` or `.in`) and auto-renewing Let's Encrypt / Vercel SSL certificates are active.
- **Cryptographic Credential Rotation:** Rotate Supabase anonymous client tokens and internal API signing keys.
- **Privacy Policy & Terms Review:** Update legal disclosures to reflect any newly introduced financial data providers.

---

## 3. Zero-Bloat Engineering Rules

To ensure PAISA remains lightweight, lightning-fast, and cost-effective:
1. **No Unnecessary External Dependencies:** Do not add heavy npm packages when standard Web APIs (such as Web Crypto, Intl, or standard Array methods) already suffice.
2. **Client-Side Heavy, Server-Light:** Keep calculations, categorization, and reality checks deterministic and client-side. The backend should remain a lightweight, secure sync conduit.
3. **Strict Zero Credential Storage:** Never add fields for banking passwords, UPI PINs, or card CVVs.
