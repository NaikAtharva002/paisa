# PAISA — OPERATIONAL READINESS & MONITORING PLAYBOOK

**Document Version:** 1.0  
**Effective Date:** October 31, 2026  
**Audience:** DevOps Engineers, System Administrators & Product Maintainers  

---

## 1. UPTIME & SYNTHETIC HEALTH MONITORING

### 1.1 Recommended Monitoring Tooling
- **Platform:** BetterStack Uptime (formerly BetterUptime) or UptimeRobot (Free tier: 50 monitors at 5-minute intervals).
- **Target URL:** `https://paisa.money` (or Vercel edge deployment URL).
- **Expected Response:** HTTP 200 OK within 800ms.
- **Alert Channels:** Email alerts to `ops@paisa.money` and SMS/Telegram alerts for sustained downtime (> 3 minutes).

---

## 2. CLIENT-SIDE ERROR MONITORING (SENTRY SETUP)

To capture unexpected JavaScript exceptions occurring on edge user devices without capturing sensitive financial inputs:
1. Create a project at [sentry.io](https://sentry.io) named `paisa-web`.
2. Configure privacy data scrubbing in Sentry Project Settings:
   - **Data Scrubbing:** Enable "Scrub All Text Inputs".
   - **Credit Card & Number Scrubbing:** Active.
   - **Environment:** `production`.
3. Add environment variable to Vercel: `VITE_SENTRY_DSN`.

---

## 3. DATABASE BACKUP SCHEDULE & RECOVERY PROCEDURES

| Backup Type | Frequency | Retention | Automated / Manual | Storage Target |
|---|---|---|---|---|
| **Client-Side JSON Archive** | User-directed | User lifetime | Manual (User downloads via Settings) | User local device storage |
| **Supabase Daily Snapshot** | Daily at 02:00 AM UTC | 7 days (Free) / 30 days (Pro) | Automated by Supabase engine | Multi-AZ Cloud Storage |
| **Pre-Release Database Dump** | Before any database migration | Indefinite | Manual via `pg_dump` CLI | Encrypted offsite S3 bucket |

### Instant Rollback via Vercel CLI / Dashboard
If a production deployment introduces an unexpected regression:
1. Open the [Vercel Project Dashboard](https://vercel.com/dashboard).
2. Select `paisa` $\to$ Go to **Deployments**.
3. Locate the previous stable production deployment (e.g., commit `3e4a86f` or `a531f5b`).
4. Click the three dots (`...`) $\to$ Select **"Promote to Production"**.
5. The stable build goes live immediately globally in **under 15 seconds** without recompiling code.

---

## 4. RECURRING MAINTENANCE CHECKLIST & CADENCE

### Weekly Routine (15 Minutes)
- [ ] Check Vercel build status and bandwidth usage.
- [ ] Check error rates and unhandled exceptions in Sentry.
- [ ] Review customer support feedback inbox.

### Monthly Routine (1 Hour)
- [ ] Run `npm audit` to identify any vulnerable dependencies.
- [ ] Verify test suite health (`npm test`).
- [ ] Check Supabase database storage quota.
- [ ] Review Google Search Console sitemap indexing and search impressions.

### Quarterly Routine (2 Hours)
- [ ] Rotate application secret keys and API tokens.
- [ ] Review and update legal and privacy policies if regulatory circulars changed.
- [ ] Conduct end-to-end financial precision test using synthetic 5,000-transaction benchmarks.
