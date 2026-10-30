# PAISA — PRIVACY-FIRST PRODUCT ANALYTICS & MEASUREMENT PLAN

**Version:** 1.0  
**Effective Date:** October 31, 2026  
**Architect:** Senior Product Manager & Privacy Engineer  
**Core Principle:** Measure Product Usability Without Ever Transmitting Financial Data  

---

## 1. ABSOLUTE PRIVACY BOUNDARIES (WHAT WE NEVER TRACK)

> [!CAUTION]
> **STRICT TELEMETRY PROHIBITION:**  
> In compliance with privacy engineering standards and financial privacy best practices, PAISA strictly prohibits transmitting the following attributes to ANY analytics server:
> - ❌ **NEVER track transaction amounts or currency figures** (e.g., ₹500, ₹10,000).
> - ❌ **NEVER track bank account numbers, UPI IDs, or account balances**.
> - ❌ **NEVER track personal notes, merchant receipts, or item descriptions**.
> - ❌ **NEVER track user income, savings targets, or financial net worth**.

Analytics must only measure **feature interaction patterns** (e.g. *"Did the user click 'Import Statement'?"*), never financial amounts.

---

## 2. RECOMMENDED ANALYTICS TOOLING EVALUATION

| Platform | Privacy Posture | Self-Hostable? | Cookies Required? | Verdict & Recommendation |
|---|---|---|---|---|
| **PostHog** | Open-source, EU/US/Self-hosted, anonymized IPs, HIPAA/GDPR ready. | **Yes** (or cloud EU) | No (Cookieless mode) | **RECOMMENDED:** Best-in-class product event tracking and funnel analysis. |
| **Plausible Analytics** | Lightweight (1 KB script), zero cookies, GDPR/PECR compliant, no personal data stored. | **Yes** (or cloud EU) | No | **RECOMMENDED (Marketing):** Best for public website visitor metrics. |
| **Microsoft Clarity** | Session recording & heatmaps. | No | Yes | **NOT RECOMMENDED:** Session screen recording risks capturing user financial figures typed on screen. |
| **Google Analytics 4** | Ad network cross-referencing, complex consent requirements. | No | Yes | **OPTIONAL ONLY:** Use with cookieless measurement and IP anonymization enabled. |

---

## 3. PRODUCT EVENT TAXONOMY (ANONYMIZED TELEMETRY)

All events use snake_case names and contain only non-financial metadata:

| Event Name | Trigger Point | Allowed Parameters (Metadata Only) | Privacy Check |
|---|---|---|---|
| `landing_page_viewed` | Public landing page load | `referrer`, `device_type` | No PII |
| `demo_explored` | User clicks "Live Demo" | `source_button` | No PII |
| `signup_started` | User opens registration wizard | `step_index` | No PII |
| `signup_completed` | User creates local credentials | `auth_method` ('local' / 'cloud') | No passwords or emails in event |
| `onboarding_completed` | User completes baseline setup | `budgeting_mode` ('daily_allowance') | **Zero income amounts sent** |
| `transaction_added` | User records an expense or income | `category_id`, `payment_method` ('upi'/'cash'/'card') | **Amount is strictly omitted** |
| `statement_imported` | User uploads a CSV/JSON file | `bank_format` ('sbi'/'hdfc'/'generic'), `record_count_tier` ('1-50'/'51-200') | **Zero bank account data sent** |
| `budget_updated` | User adjusts category budget | `category_id` | **Rupee limits strictly omitted** |
| `goal_created` | User starts a new savings goal | `category` ('gadget'/'travel'/'emergency') | **Target rupee amount omitted** |
| `backup_exported` | User downloads JSON backup | `export_format` ('json') | No financial records sent |
| `account_erased` | User triggers "Erase Everything" | `source` ('settings_danger_zone') | No PII |

---

## 4. PRODUCT CONVERSION FUNNEL & KEY METRICS (NORTH STAR)

```
┌────────────────────────────────────────────────────────┐
│ STAGE 1: Top of Funnel (Discovery)                    │
│ Metric: Unique Public Landing Page Visitors            │
├────────────────────────────────────────────────────────┤
│ STAGE 2: Interactive Engagement                        │
│ Metric: Interactive Paisa Formula Calculator Usage     │
├────────────────────────────────────────────────────────┤
│ STAGE 3: Activation                                    │
│ Metric: Onboarding Completion Rate                     │
├────────────────────────────────────────────────────────┤
│ STAGE 4: First Value Delivered                         │
│ Metric: 1st Transaction Logged or Statement Imported   │
├────────────────────────────────────────────────────────┤
│ STAGE 5: Retention (North Star Metric)                 │
│ Metric: Weekly Active Check-Ins (Users viewing reality │
│ check >= 3 days per week)                              │
└────────────────────────────────────────────────────────┘
```

---

## 5. SETUP & ACTIVATION INSTRUCTIONS FOR PRODUCT OWNER

1. Create a free account at [posthog.com](https://posthog.com) (or deploy a self-hosted instance).
2. Create a project named **"PAISA Web"**.
3. Under Project Settings $\to$ Web Analytics, set:
   - **Autocapture:** Disabled (to prevent accidental recording of input field text).
   - **Session Recording:** Disabled (to protect financial figure privacy).
   - **IP Anonymization:** Enabled.
4. Copy your `Project API Key` and add it to your Vercel Environment Variables: `VITE_PUBLIC_POSTHOG_KEY`.
