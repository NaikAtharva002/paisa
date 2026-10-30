# THIRD-PARTY DISCLOSURES (DRAFT)

> [!IMPORTANT]
> **DRAFT — REQUIRES OWNER CONFIRMATION AND APPROPRIATE LEGAL REVIEW**

**Product Name:** PAISA — Daily Money Reality Check  
**Effective Date:** [EFFECTIVE DATE, e.g., November 1, 2026]  

---

## 1. INFRASTRUCTURE PARTNERS

To serve the application securely, PAISA utilizes trusted third-party cloud infrastructure providers:

| Provider | Service Provided | Data Received | Privacy Safeguard |
|---|---|---|---|
| **Vercel Inc.** (USA / Global Edge) | Edge Hosting, CDN & DNS Delivery | Transient IP address and browser user-agent for HTTP delivery. No financial data stored on edge cache. | SOC 2 Type II certified, GDPR & Standard Contractual Clauses compliant. |
| **Supabase Inc.** (AWS Mumbai / Singapore) | Managed PostgreSQL Cloud Database (Optional cloud sync) | Encrypted user email, salted password hash, and user-scoped financial tables. | End-to-end TLS 1.3 encryption in transit, AES-256 encryption at rest, PostgreSQL Row Level Security. |

---

## 2. BANK INTEGRATIONS & ACCOUNT AGGREGATORS

- **Zero Scraping:** PAISA does NOT engage in "screen scraping" or reverse-engineering of online banking portals.
- **Statement Files:** When you import a CSV or JSON bank statement, **parsing occurs entirely on your device inside your web browser**. The statement contents are never transmitted to external third-party analysis servers.
- **RBI Account Aggregator:** Bank synchronization utilizes the Reserve Bank of India's regulated Account Aggregator (AA) consent framework. Financial Information Users (FIUs) transfer encrypted financial data only upon your explicit, time-bound consent.

---

## 3. ZERO ADVERTISING NETWORKS

PAISA does not share, disclose, or sell any consumer data to third-party ad networks (e.g., Google Ads, Meta Audience Network, Criteo, InMobi).
