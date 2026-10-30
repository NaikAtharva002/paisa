# PAISA — OPERATIONS RUNBOOK
## Production Operations, Health Monitoring & Maintenance Procedures

**Product:** PAISA (Personal Finance & Daily Money Reality Check)  
**Target:** Production Operations & Support  
**Version:** 1.0.0  
**Date:** October 31, 2026  

---

## 1. Quick Reference & System Health Check

### Health Check Checklist (2-Minute Smoke Test)
1. **Access Web Application:** Navigate to production URL (e.g. `https://paisa.money` or Vercel preview domain). Verify HTTP 200 and clean TLS/SSL lock icon.
2. **Open Browser Console (F12):** Check that zero unhandled JavaScript runtime exceptions or red network errors appear.
3. **Verify Auth State:** Check that clicking "Sign In" or "Get Started" displays the login form with responsive layout.
4. **Dashboard KPI Render:** Log in with test account. Verify Total Balance, Monthly Income, Monthly Expenses, and Today's Snapshot render with formatted currency (`₹`).
5. **Verify Security Headers:** Run `curl -I https://paisa.money` to verify:
   - `strict-transport-security: max-age=63072000; includeSubDomains; preload`
   - `x-frame-options: DENY`
   - `x-content-type-options: nosniff`
   - `content-security-policy: default-src 'self' ...`

---

## 2. Common Operational Tasks

### A. Checking Application Errors & Security Audit Trail
PAISA contains an internal immutable audit logger accessible programmatically or through browser devtools:
```javascript
// In browser developer console:
import { auditLogger } from './src/lib/auditLogger';
console.table(auditLogger.getLogs());
```
Look for:
- `RATE_LIMIT_LOCKOUT`: Indicates multiple failed login attempts on an email account.
- `CROSS_TENANT_VIOLATION_ATTEMPT`: Indicates an unauthorized access attempt across user IDs.
- `DATA_RESET`: Confirms user-initiated database or statement rollbacks.

### B. Investigating Failed Statement Imports
If a user reports that a bank statement import failed:
1. **Check File Format:** Verify whether the file is a standard CSV or JSON statement. PDFs or scanned images must first be converted by the user to CSV/JSON.
2. **Check File Size & Row Count:** Ensure the file is $\le 5\text{ MB}$ and contains $\le 5,000\text{ rows}$.
3. **Check Malformed Rows:** In `CsvImportModal.tsx`, parse errors are itemized line-by-line (e.g., `Row 42: Invalid or zero amount`).
4. **Trigger Atomic Rollback:** If an incorrect file was accidentally imported:
   - Go to **Transactions** $\to$ Click **Import Statement** $\to$ Select **Import History** tab.
   - Click the red **Rollback** button next to the batch ID. All transactions from that import will be atomically erased without touching manual entries.

### C. Handling Account Aggregator & Consent Expiry
1. **Check Consent Status:** Navigate to **Bank Accounts** view. Active consents are displayed under "Active RBI AA Consent Artifacts".
2. **If Status Shows `⚠️ Consent Expired`:**
   - Under RBI regulations, AA consents expire after their agreed duration (typically 12 months).
   - Click **Connect Bank Feed** to initiate a new AA consent handle with the Account Aggregator (Setu / Finvu).
3. **If User Requests Immediate Disconnection:**
   - Click **Revoke Consent** on the bank card.
   - All future background synchronization halts immediately while existing ledger records are safely preserved.

### D. Restoring User Backups (Data Recovery)
If a user switched devices or reset their local storage:
1. **Exporting Backup:** Go to **Settings** $\to$ Click **Export Full Financial Backup** (saves `paisa_data_backup_YYYY-MM-DD.json`).
2. **Restoring Data:**
   - In browser developer console or via onboarding:
   ```javascript
   localStorage.setItem('paisa_transactions', JSON.stringify(backup.transactions));
   localStorage.setItem('paisa_accounts', JSON.stringify(backup.accounts));
   localStorage.setItem('paisa_savings', JSON.stringify(backup.savingsGoals));
   localStorage.setItem('paisa_recurring', JSON.stringify(backup.recurring));
   location.reload();
   ```

---

## 3. Deployment & Rollback Procedures

### Production Rollback (Vercel)
If a critical defect is introduced after deploying a new release:
1. Go to **Vercel Dashboard** $\to$ Select the **paisa** project.
2. Navigate to the **Deployments** tab.
3. Locate the previous known-good deployment (e.g. Commit `151eced`).
4. Click the three dots (`...`) $\to$ Select **Instant Rollback**.
5. Traffic will be redirected to the previous immutable build in $< 10\text{ seconds}$.

### Git Rollback Procedure
```bash
# 1. Inspect recent commits
git log --oneline -5

# 2. Revert the problematic commit
git revert <commit-hash> -m 1

# 3. Verify tests and build pass
npm test
npm run build

# 4. Push to origin main to trigger automatic deployment
git push origin main
```

---

## 4. Emergency Contacts & Service Escalations

| Service / Provider | Purpose | Dashboard / Status Page | Support Escalation |
|---|---|---|---|
| **Vercel** | Web Hosting & Edge Network | `https://vercel-status.com` | `https://vercel.com/help` |
| **GitHub** | Code Repository & CI Actions | `https://www.githubstatus.com` | `https://support.github.com` |
| **Supabase** | PostgreSQL Database & Cloud Auth | `https://status.supabase.com` | `https://supabase.com/dashboard/support` |
| **Setu AA Sandbox** | Account Aggregator Bridge | `https://docs.setu.co` | `support@setu.co` |
