# PAISA — LEGAL & REGULATORY REVIEW CHECKLIST (DRAFT)

> [!IMPORTANT]
> **DRAFT — PRE-LAUNCH COMPLIANCE ACTION PLAN FOR OWNER & LEGAL COUNSEL**

**Document Type:** Pre-Launch Compliance Action Plan  
**Prepared For:** Project Owner & Legal Counsel  
**Date:** October 31, 2026  
**Status:** ACTION REQUIRED PRIOR TO PUBLIC LAUNCH  

---

## 1. PLACEHOLDER REPLACEMENT MATRIX

Before publishing any draft document as an active public policy, the project owner must verify and replace the following placeholder values across all files in `docs/legal/`:

| Placeholder Tag | Description | Action Required by Owner |
|---|---|---|
| `[LEGAL BUSINESS NAME]` | Official registered business or entity name (Sole Proprietorship, LLP, or Private Limited). | Confirm registered corporate entity name. |
| `[REGISTERED BUSINESS ADDRESS]` | Physical corporate address with City, State, and PIN code. | Provide registered operational office address in India. |
| `[SUPPORT EMAIL ADDRESS]` | Designated customer support mailbox (e.g. `support@paisa.money`). | Set up inbox and verify incoming email routing. |
| `[GRIEVANCE OFFICER NAME]` | Named individual designated as Data Protection & Grievance Officer under DPDP Act 2023. | Appoint a responsible individual and publish contact email. |
| `[GRIEVANCE EMAIL ADDRESS]` | Dedicated grievance mailbox (e.g. `grievance@paisa.money`). | Create email alias with strict 48-hour SLA monitoring. |
| `[EFFECTIVE DATE]` | Official public launch or adoption date. | Set the launch date when terms take effect. |
| `[DATA STORAGE REGION]` | Cloud database hosting location (e.g., AWS Mumbai / ap-south-1). | Verify selected region in Supabase project dashboard. |
| `[DESIGNATED CITY]` | Indian jurisdiction city for legal dispute resolution (e.g., Pune / Mumbai / Bengaluru). | Confirm court jurisdiction. |

---

## 2. REGULATORY & STATUTORY COMPLIANCE CHECKLIST

### A. Digital Personal Data Protection (DPDP) Act, 2023
- [ ] **Affirmative Notice & Consent:** Verify that sign-up forms present clear, plain-language consent checkboxes linking to the Privacy Policy.
- [ ] **Grievance Officer Appointment:** Confirm designated Grievance Officer details are published on the website.
- [ ] **Data Principal Rights:** Verify that users can independently view, export (JSON/CSV), and delete ("Erase Everything") all their financial records.
- [ ] **Parental Consent for Minors:** Verify that terms restrict unassisted usage to individuals aged 18 and older.

### B. Reserve Bank of India (RBI) Regulations
- [ ] **No Unlicensed Account Aggregator Claims:** Confirm that PAISA does not falsely represent itself as an RBI-registered NBFC-AA or FIU. Ensure statement import is clearly identified as a user-initiated CSV/JSON file upload.
- [ ] **Zero Banking Password Policy:** Verify that PAISA strictly never requests, transmits, or stores NetBanking passwords, UPI PINs, ATM PINs, OTPs, or card CVVs.

### C. Consumer Protection (E-Commerce) Rules, 2020
- [ ] **Contact Information Disclosure:** Ensure support email, customer care contact, and physical address are visible on the public Contact page.
- [ ] **14-Day Refund Clarity:** Ensure the refund and cancellation policy clearly states terms for any future paid features.

### D. App Store & Google Play Developer Policies
- [ ] **Privacy Policy URL:** Publicly accessible, live HTTPS link to Privacy Policy provided in Google Play Console and App Store Connect.
- [ ] **Account Deletion Link:** Dedicated web URL (e.g. `https://paisa.money/data-deletion`) explaining account deletion for mobile users.
- [ ] **Financial Services Declaration:** Disclose that PAISA is an informational budget tracker and does not provide loans or custodial banking.
