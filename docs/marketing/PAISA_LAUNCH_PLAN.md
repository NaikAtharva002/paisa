# PAISA — PRODUCT LAUNCH PLAYBOOK & TIMELINE

**Document Type:** Strategic Launch Operations Plan  
**Target Window:** Q4 2026  
**Primary Launch Goal:** 1,000 Verified Active Users with Zero Advertising Spend  

---

## 1. PRE-LAUNCH CHECKLIST (T-MINUS 7 DAYS)

- [x] All 134 automated tests passing (100% green).
- [x] Clean production build generated (`dist/` created in 9.2s).
- [x] Legal drafts prepared and reviewed in `docs/legal/`.
- [x] SEO metadata, XML sitemap, and robots.txt verified in `public/`.
- [ ] Connect repository to Vercel and verify live HTTPS domain (`https://paisa.money`).
- [ ] PostHog cookieless event telemetry activated (optional).
- [ ] Support inbox configured (`support@paisa.money`).

---

## 2. LAUNCH DAY RUNBOOK (DAY 0: SHOWTIME)

### Hour 08:00 AM IST — Technical Sanity Check
- Verify `https://paisa.money` loads in < 1.5 seconds on both desktop and mobile 4G/5G.
- Test 1 sample transaction, 1 CSV statement import, and 1 full data backup export.

### Hour 10:00 AM IST — Community Alpha Announcement
- Post Product Hunt listing (Title: *PAISA — Your Daily Money Reality Check*).
- Share release announcement on **Twitter/X** with product demo GIF.
- Post Founder's Story on **LinkedIn** focusing on modern Indian salary cycles and UPI micro-spending.

### Hour 02:00 PM IST — Developer Community Sharing
- Submit "Show HN: Paisa – An open, privacy-first daily expense tracker for India" on Hacker News.
- Post on Reddit: `r/developersIndia` and `r/IndiaInvestments` focusing on the technical design (integer paise math, client-side Web Crypto, zero bank passwords).

### Hour 06:00 PM IST — Engagement & Feedback Monitoring
- Monitor incoming bug reports via the in-app feedback dialog and support inbox.
- Respond to every community comment within 30 minutes.

---

## 3. POST-LAUNCH RETENTION LOOP (WEEKS 1 TO 4)

- **Day 3:** Review conversion rates from landing page visits to onboarding completions.
- **Day 7:** Measure 7-day cohort retention (users who logged a transaction on at least 3 distinct days).
- **Day 14:** Publish first public community changelog addressing user-suggested features.
- **Day 30:** Conduct customer satisfaction audit and evaluate optional Pro features roadmap.
