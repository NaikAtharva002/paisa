# PAISA — INFRASTRUCTURE & OPERATING COST ESTIMATE

**Baseline Date:** October 31, 2026  
**Pricing Standards:** Official public pricing tiers for Vercel, Supabase, Cloudflare, and LLM APIs.  

---

## 1. CURRENT OPERATING COSTS (BOOTSTRAP / LAUNCH STAGE)

In its current client-side, offline-first architecture, PAISA runs with practically zero recurring infrastructure costs:

| Resource | Service Provider | Plan / Tier | Estimated Monthly Cost |
|---|---|---|---|
| **Web Hosting & Edge CDN** | Vercel | Hobby (Free) | **₹0.00** ($0.00) |
| **Cloud Database (Optional)** | Supabase | Free Tier (500 MB DB, 50k MAU) | **₹0.00** ($0.00) |
| **DNS & DDoS Protection** | Cloudflare | Free Plan | **₹0.00** ($0.00) |
| **Custom Domain** | Namecheap / Cloudflare | `.money` or `.in` annual domain | **₹100.00** (~$1.20 / month) |
| **Automated CI/CD** | GitHub Actions | 2,000 Free Actions minutes/mo | **₹0.00** ($0.00) |
| **Total Launch Cost** | — | — | **~₹100 / month ($1.20)** |

---

## 2. PROJECTED SCALING COST MODEL ACROSS USER TIERS

Because calculations and statement parsing execute directly in the user's browser, server load does not scale linearly with transaction volume. Server costs scale primarily with cloud synchronization storage and active database connections.

| Active User Scale | Web Hosting (Vercel) | Database (Supabase) | DNS & CDN | AI Inference / LLM | Monthly Total (INR) | Monthly Total (USD) |
|---|---|---|---|---|---|---|
| **1,000 Users** | ₹0 (Hobby) | ₹0 (Free) | ₹0 (Free) | ₹0 (Client-side math) | **₹100** | **$1.20** |
| **10,000 Users** | ₹1,650 (Pro $20) | ₹2,075 (Pro $25) | ₹0 (Free) | ₹800 (Optional Gemini Flash) | **₹4,625** | **$55.00** |
| **50,000 Users** | ₹3,300 (Pro+Bandwidth) | ₹4,150 (Pro+Compute) | ₹1,650 (Pro) | ₹2,500 (Batch AI) | **₹11,600** | **$140.00** |
| **100,000 Users** | ₹6,600 | ₹8,300 | ₹1,650 | ₹5,000 | **₹21,550** | **$260.00** |

---

## 3. APP STORE & DEVELOPER ACCOUNT COSTS (ONE-TIME / ANNUAL)

If native Android and iOS mobile app listings are published:
- **Google Play Console Developer Account:** **$25 USD (₹2,100 INR)** — One-time lifetime registration fee.
- **Apple Developer Program Membership:** **$99 USD (₹8,300 INR)** — Recurring annual fee.
- **Total Initial Mobile Registration:** **~₹10,400 INR ($124 USD)**.
