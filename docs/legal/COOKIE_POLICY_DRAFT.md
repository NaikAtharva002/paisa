# COOKIE & LOCAL STORAGE POLICY (DRAFT)

> [!IMPORTANT]
> **DRAFT — REQUIRES OWNER CONFIRMATION AND APPROPRIATE LEGAL REVIEW**  
> *This policy explains how PAISA utilizes browser storage technologies (HTML5 LocalStorage and Cookies).*

**Product Name:** PAISA — Daily Money Reality Check  
**Effective Date:** [EFFECTIVE DATE, e.g., November 1, 2026]  

---

## 1. WHAT ARE COOKIES AND LOCAL STORAGE?

Cookies and browser LocalStorage are small data files or storage keys placed directly inside your web browser by websites you visit. They allow web applications to remember your preferences and keep you logged in between page refreshes.

---

## 2. HOW PAISA USES BROWSER STORAGE

**PAISA DOES NOT USE ADVERTISING OR CROSS-SITE TRACKING COOKIES.**

We use browser storage strictly for functional, security, and offline operation:

| Storage Type | Key / Name | Purpose | Duration | Essential? |
|---|---|---|---|---|
| **LocalStorage** | `paisa_vault_v1` | Stores your encrypted transaction records, budgets, recurring bills, and user profile so the app works offline. | Persistent on your device until you click "Erase Everything" or clear browser cache. | **Yes (Core functionality)** |
| **LocalStorage** | `paisa_auth_state` | Stores your temporary session token so you remain logged in during your browser session. | Active session; expires on manual logout. | **Yes (Security / Session)** |
| **LocalStorage** | `paisa_theme_prefs` | Stores your visual preferences (e.g., tone selection: gentle, witty, direct). | Persistent until manually updated. | **Functional** |
| **Session Cookie** | `paisa_csrf_token` | Protects web forms against Cross-Site Request Forgery (CSRF attacks). | Browser session only (deleted on tab close). | **Yes (Security)** |

---

## 3. THIRD-PARTY COOKIES

**PAISA DOES NOT EMBED THIRD-PARTY ADVERTISING COOKIES.**
- We do not run Google AdSense or advertising banners.
- We do not embed Meta Pixel, TikTok tracking pixels, or third-party behavioral trackers.
- If you use modern browsers like Chrome, Safari, Firefox, or Brave, PAISA functions cleanly even with "Block third-party cookies" enabled.

---

## 4. HOW YOU CAN MANAGE OR CLEAR COOKIES

You have complete control over local storage:
1. **Within PAISA:** Navigate to **Settings $\to$ Erase Everything & Reset Vault** to instantly wipe all local storage keys created by PAISA.
2. **Within Your Browser:** You can clear cookies and site data for `paisa.money` at any time via your browser settings (Settings $\to$ Privacy and Security $\to$ Clear Browsing Data). Note that clearing local storage will erase any offline transactions unless you have previously downloaded a JSON backup.
