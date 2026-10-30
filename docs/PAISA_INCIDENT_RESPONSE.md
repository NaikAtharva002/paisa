# PAISA — INCIDENT RESPONSE PROTOCOL
## Security, Operations & Crisis Management Runbook

**Product:** PAISA (Personal Finance & Daily Money Reality Check)  
**Classification:** Operational Security & Incident Response  
**Version:** 1.0.0  
**Date:** October 31, 2026  

---

## 1. Incident Severity Definitions

- **SEV-1 (Critical):** Complete application downtime, active data breach, confirmed exposure of financial records, or loss of data integrity. Response time: $< 15\text{ minutes}$.
- **SEV-2 (High):** Major functional outage (e.g. inability to log in, calculate daily budgets, or process statement imports), or repeated rate-limit lockouts. Response time: $< 1\text{ hour}$.
- **SEV-3 (Medium):** Non-blocking functional defect, minor UI/chart rendering error, or individual integration sync failure with available workaround. Response time: $< 4\text{ hours}$.
- **SEV-4 (Low / Informational):** Minor styling bug or non-critical enhancement request.

---

## 2. Standard Operating Procedures for 8 Incident Scenarios

---

### Scenario 1: Application Downtime / Outage

- **How to Recognize:** Automated monitoring alert, HTTP 500 / 502 / 503 errors on production URL, or users unable to load the web interface.
- **Immediate Actions:**
  1. Check Vercel status page (`https://vercel-status.com`) for edge routing incidents.
  2. If caused by a recent deployment, trigger **Instant Rollback** in the Vercel Dashboard to the last stable build.
  3. Verify local build reproducibility: `npm run build` and `npm test`.
- **What NOT to Do:** Do NOT delete or force-push Git branches under pressure. Do NOT modify DNS records without diagnosing root cause.
- **Investigation:** Review Vercel Edge build and runtime logs for syntax errors, missing environment variables, or asset 404s.
- **Recovery:** Roll back to the verified commit, re-run CI suite, and deploy verified fix.
- **Evidence to Preserve:** Vercel deployment log output, git commit SHA, and HTTP response headers.
- **User Disclosure:** If downtime exceeds 30 minutes, post a status update on public channels.

---

### Scenario 2: Database Failure / Disconnection (Supabase)

- **How to Recognize:** Errors in console indicating Supabase query timeouts (`ERR_CONNECTION_REFUSED` or HTTP 504) or failed cloud authentication.
- **Immediate Actions:**
  1. PAISA's client automatically falls back to offline-first local vault mode; verify local features remain operational.
  2. Inspect Supabase project status (`https://status.supabase.com`).
  3. Verify database connection pooling and disk usage quotas.
- **What NOT to Do:** Do NOT drop tables, run unverified migrations, or purge user records.
- **Investigation:** Check Supabase Dashboard $\to$ Database $\to$ Logs for connection saturation or slow queries.
- **Recovery:** Once cloud service recovers, verify RLS policies using `docs/SUPABASE_SECURITY_RLS.sql`.
- **Evidence to Preserve:** Supabase database error logs, timestamp of outage, and connection pool metrics.
- **User Disclosure:** Inform users if cloud cross-device sync was temporarily deferred.

---

### Scenario 3: Data Discrepancy or Calculation Mismatch

- **How to Recognize:** User reports that daily budget remaining or total spent does not match the sum of individual transactions.
- **Immediate Actions:**
  1. Have user export their data backup via **Settings** $\to$ **Export Backup** (`.json`).
  2. Ingest the backup in a local test harness and execute the exact calculation functions:
     `calculateTotalSpending()`, `getEffectiveDailyBudget()`, `calculateDailyReport()`.
- **What NOT to Do:** Do NOT manually overwrite the user's database records without an audit trail.
- **Investigation:** Check whether the transaction is an excluded type (`is_credit_card_payment: true` or `is_internal_transfer: true`), or if an unrounded fraction of paise was entered.
- **Recovery:** Re-run amount normalization (`roundPaise`) on affected entries.
- **Evidence to Preserve:** Sanitized JSON transaction payload and unit test reproducing the discrepancy.
- **User Disclosure:** Provide an explanation showing the exact mathematical breakdown to the user.

---

### Scenario 4: Suspected Account Compromise

- **How to Recognize:** User reports unfamiliar transactions, or audit logs record repeated `RATE_LIMIT_LOCKOUT` events from unfamiliar IP addresses.
- **Immediate Actions:**
  1. Invalidate all active session tokens for the affected user account (`localStorage.removeItem('paisa_auth_session')` or Supabase session revocation).
  2. Enforce an immediate password reset requiring a strong OWASP-compliant passphrase.
- **What NOT to Do:** Do NOT send password reset links or verification codes over unverified chat channels.
- **Investigation:** Review audit logger events filtered by `userId` to verify the entry point.
- **Recovery:** Re-authenticate the user with updated credentials and confirm ledger integrity.
- **Evidence to Preserve:** Timestamped audit logs of all actions performed during the suspicious session.
- **User Disclosure:** Inform the user immediately, explaining the session revocation and steps taken to secure their account.

---

### Scenario 5: Unauthorized Cross-Tenant Access Attempt

- **How to Recognize:** Audit log entries displaying `CROSS_TENANT_VIOLATION_ATTEMPT`.
- **Immediate Actions:**
  1. Verify that PAISA's tenant isolation guards successfully blocked the attempt (returns `false` or `null`).
  2. Identify the requesting `userId` and IP address.
  3. Immediately suspend or revoke the attacking session token.
- **What NOT to Do:** Do NOT ignore violation warnings, even if the request was blocked.
- **Investigation:** Trace the API endpoint or store method invoked (e.g. `updateTransaction`, `deleteAccount`, `revokeBankConsent`).
- **Recovery:** Ensure PostgreSQL Row Level Security (RLS) policies are active and up-to-date.
- **Evidence to Preserve:** Complete audit log record containing target resource ID, requesting user ID, and timestamp.
- **User Disclosure:** Inform relevant internal stakeholders. If a vulnerability was exploited, notify affected users under applicable DPDP Act guidelines.

---

### Scenario 6: Third-Party Integration / Account Aggregator Gateway Outage

- **How to Recognize:** Bank synchronization returns `sync_error` or AA consent redirection fails with gateway timeout.
- **Immediate Actions:**
  1. The app automatically flags the account as `sync_error` and halts sync polling.
  2. Advise user to upload manual CSV/JSON statements in the interim.
  3. Check the status of the Account Aggregator (Setu / Finvu).
- **What NOT to Do:** Do NOT loop aggressive retry requests that could trigger external API rate-limit bans.
- **Investigation:** Check HTTP response codes from the AA gateway.
- **Recovery:** Once provider restores service, trigger on-demand synchronization.
- **Evidence to Preserve:** Gateway error response bodies and correlation IDs.
- **User Disclosure:** In-app notification informs user: *"Bank gateway temporarily unreachable. Manual statement upload available."*

---

### Scenario 7: Unexpected API Usage or Cost Spike

- **How to Recognize:** Cloud billing alert from Supabase, Vercel, or AI API provider indicating high request volume.
- **Immediate Actions:**
  1. Inspect network traffic logs to determine if an infinite loop or scraping bot is hitting the application.
  2. Enable Vercel Edge Rate Limiting and Attack Challenge mode.
- **What NOT to Do:** Do NOT shut down production without checking if traffic is legitimate organic user growth.
- **Investigation:** Analyze top requested paths and IP distributions.
- **Recovery:** Add caching headers for static assets (`Cache-Control: public, max-age=31536000, immutable`).
- **Evidence to Preserve:** Bandwidth charts, request log samples, and billing line items.
- **User Disclosure:** Internal only.

---

### Scenario 8: Accidental Secret Exposure / Credential Leakage

- **How to Recognize:** Detection of an API key, signing key, or service token committed to Git or logged to console.
- **Immediate Actions:**
  1. Immediately revoke the compromised key in the provider's dashboard (e.g. Supabase, Vercel).
  2. Generate a new key and update production environment variables.
  3. Trigger a production redeploy.
- **What NOT to Do:** Do NOT merely delete the commit from Git history without rotating the key; assume any committed key is compromised instantly.
- **Investigation:** Check Git history (`git log -S`) and audit logs for unauthorized actions using the leaked key.
- **Recovery:** Verify all services operate with the new rotated credentials.
- **Evidence to Preserve:** Commit hash where secret appeared and confirmation of key destruction from provider.
- **User Disclosure:** Assess if the leaked secret granted access to customer data; if so, notify affected parties.
