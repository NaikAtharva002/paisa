# PAISA — OPERATING COSTS & OWNERSHIP HANDOVER
## Financial Transparency, Infrastructure Subscriptions & Account Ownership

**Product:** PAISA (Personal Finance & Daily Money Reality Check)  
**Target:** Product Owner & Operations  
**Version:** 1.0.0  
**Date:** October 31, 2026  

---

## 1. Operating Cost Breakdown (Current vs Future Projections)

PAISA has been architected to run at **near-zero cost** during development and initial beta release by leveraging free-tier developer infrastructure and client-side deterministic computing.

| Infrastructure Component | Service Provider | Current Tier & Cost | Estimated Production Scale Cost (1,000–10,000 MAU) | Pricing Basis / Notes |
|---|---|---|---|---|
| **Web Hosting & Edge CDN** | Vercel | **$0.00 / month** (Hobby Tier) | $20.00 / month (Vercel Pro) | Hobby tier includes 100GB bandwidth, automatic SSL, and global edge caching. |
| **Database & Auth (Cloud Sync)** | Supabase | **$0.00 / month** (Free Tier) | $25.00 / month (Pro Tier) | Free tier includes 500MB database, 50,000 monthly active auth users, and 5GB egress. |
| **Custom Domain** | Cloudflare / Namecheap / GoDaddy | **$10.00 – $15.00 / year** (~$1.00/mo) | $10.00 – $15.00 / year | For `.in` or `.com` domain registration with free Cloudflare DNS protection. |
| **Deterministic AI & Forecasting** | Client-Side / Web Crypto | **$0.00 / month** | **$0.00 / month** | All forecasting, categorization, and reality check messages run locally on client devices. |
| **In-App Financial Notifications** | In-App Engine / Web Push | **$0.00 / month** | **$0.00 / month** | Standard browser Notification API and local storage state; zero recurring SMS costs. |
| **Error Monitoring & Auditing** | Client Audit Logger / Sentry Free | **$0.00 / month** | $0.00 (Sentry Developer tier covers 5,000 errors/month) | Built-in immutable `auditLogger` incurs zero cost. |
| **Bank Statement Import Engine** | Built-in CSV & JSON Parser | **$0.00 / month** | **$0.00 / month** | Pure browser-based parsing of user-uploaded files; zero per-statement third-party API fees. |
| **Account Aggregator Sandbox** | Setu / Finvu Sandbox | **$0.00 / month** | TSP usage-dependent (e.g. ₹2–₹5 per consent artifact upon production licensing) | Sandbox is free. Production AA requires partnering with an authorized Regulated Entity. |
| **Android Developer Account** | Google Play Console | **$25.00 one-time** | **$0.00 recurring** | Lifetime developer license to publish Android apps. |
| **Apple Developer Program** | Apple Developer | **$0.00 currently** (Optional) | $99.00 / year (Optional for iOS App Store) | Required only when packaging native iOS apps for the Apple App Store. |
| **TOTAL ESTIMATED MONTHLY COST** | — | **$0.00 – $1.25 / month** | **$45.00 – $55.00 / month** | Extremely lean financial footprint. |

---

## 2. Infrastructure Ownership & Access Management

| Asset / Account | Owner | Where Managed | Access Level Required | How to Safely Transfer or Revoke |
|---|---|---|---|---|
| **GitHub Repository** | `NaikAtharva002` | `https://github.com/NaikAtharva002/paisa` | Admin | Settings $\to$ Collaborators $\to$ Add or remove team members. |
| **Vercel Account** | Product Owner | `https://vercel.com/dashboard` | Owner / Team Member | Settings $\to$ Members $\to$ Invite or revoke deployment rights. |
| **Supabase Project** | Product Owner | `https://supabase.com/dashboard` | Project Owner | Project Settings $\to$ Team $\to$ Manage member roles and database permissions. |
| **Custom Domain Registrar** | Product Owner | Registrar Portal (Cloudflare / Namecheap) | Account Owner | Update nameservers and DNS A/CNAME records pointing to Vercel. |

---

## 3. Financial Safety Rules

1. **No Unexpected Subscriptions:** Never enter corporate credit cards or upgrade to paid tiers without explicit prior written approval from the product owner.
2. **Zero Storage of Secrets in Docs:** Documentation must never contain database passwords, private keys, service role keys, or live API credentials.
3. **Free Tier Quota Monitoring:** Monthly maintenance includes reviewing Supabase database disk usage and Vercel bandwidth to avoid unexpected overage charges.
