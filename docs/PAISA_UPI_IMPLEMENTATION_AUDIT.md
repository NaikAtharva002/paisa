# PAISA — UPI Transaction Tracking Implementation Audit

**Audit Date:** 2026-11-02  
**Target Environment:** Android (Capacitor 8.6.0) + React/Vite  
**Architectural Scope:** Real-time UPI & Banking Notification Tracking, Extraction, Deduplication & Repository Integration

---

## 1. Executive Summary

This audit assesses the current state of PAISA's Android native architecture, database layers, transaction intelligence, and user controls to plan the integration of real-time UPI transaction tracking.

The goal is to enable PAISA on Android devices to listen for payment notifications (Google Pay, PhonePe, Paytm, BHIM, and supported bank notifications) with explicit user consent, parse amounts, counterparties, and reference numbers, prevent cross-app duplicates (e.g. UPI app notification + bank debit notification for the same payment), and persist them into the existing offline-first IndexedDB ledger and Supabase sync pipeline.

---

## 2. Component-by-Component Classification

Every feature has been audited against the actual codebase:

| Subsystem / Feature | Current Codebase Location | Status | Analysis & Required Next Steps |
|---|---|---|---|
| **Android Capacitor Shell** | `android/`, `capacitor.config.ts` | **Already implemented** | Capacitor 8.6.0 Android project configured with app ID `money.paisa.app`. `BridgeActivity` is active in `MainActivity.java`. |
| **Android NotificationListenerService** | `android/app/src/main/...` | **Not implemented** | No `NotificationListenerService` exists in `AndroidManifest.xml` or Java sources. Must be implemented to receive notification broadcasts. |
| **Capacitor Native Plugin Bridge** | `android/app/src/main/java/...` | **Not implemented** | No Capacitor plugin currently bridges native Android notification events to the web runtime. A custom plugin (`PaisaNotificationTrackerPlugin`) must be created. |
| **Local IndexedDB Database** | `src/lib/db/indexedDB.ts` | **Already implemented** | IndexedDB stores `transactions`, `accounts`, `budgets`, `categories`, and `outbox` mutations with integer versioning and soft deletes. |
| **Transaction Repository & Store** | `src/lib/storage.ts`, `src/lib/db/repository.ts` | **Already implemented** | `store.addTransaction` persists in memory, caches in localStorage, saves asynchronously to IndexedDB, and enqueues outbox mutations for Supabase sync. |
| **Transaction Data Model** | `src/types/index.ts`, `src/lib/transactionIntelligence.ts` | **Already implemented** | Model supports `source: 'android_notification'`, `external_transaction_id`, `is_unplanned`, `notes`, `merchant`, and integer paise amounts. |
| **UPI VPA & Merchant Pattern Matching** | `src/lib/transactionIntelligence.ts` | **Already implemented** | `VPA_REGEX` and `COMMON_VPA_MAPPINGS` resolve VPAs (e.g., `swiggy@...`, `sharma@okhdfcbank`) to merchants and categories. |
| **Real-time Notification Text Parsing** | `src/lib/upiNotificationParser.ts` | **Not implemented** | Regex extraction for Google Pay, PhonePe, Paytm, BHIM, and major bank SMS/push notifications needs dedicated parser module. |
| **Cross-App Multi-Factor Deduplication** | `src/lib/upiNotificationParser.ts` | **Not implemented** | Detection of same payment emitted by both UPI app and bank debit alert within time window. |
| **Settings UI: Automatic Transaction Tracking** | `src/pages/SettingsPage.tsx` | **Not implemented** | UI section with tracking toggle, permission status check, permission settings deep-link, and last processed stats. |
| **End-to-End Native Android Execution** | Android 8.0+ (API 26+) Device | **Requires testing on a real Android device** | OS notification listener permission grant and background service lifecycle require verification on physical Android hardware. |

---

## 3. Detailed Technical Findings

### 3.1 Android Project State
* `AndroidManifest.xml` currently declares only `android.permission.INTERNET`.
* To receive notification broadcasts, Android requires:
  1. A service extending `android.service.notification.NotificationListenerService`.
  2. The service declared in `AndroidManifest.xml` with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` and an `<intent-filter>` for `android.service.notification.NotificationListenerService`.
  3. The user must manually grant notification access via `android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.

### 3.2 Data Layer & Repository Continuity
* PAISA’s offline-first architecture is already built around IndexedDB (`localDB`) and the durable outbox queue.
* Transactions detected from notifications must be piped directly into `store.addTransaction(...)` with:
  * `source: 'android_notification'`
  * `external_transaction_id`: parsed UTR or reference ID
  * `description`: verbatim notification title + text
  * `amount`: exact parsed number (converted to integer paise internally)
* This guarantees that detected transactions automatically participate in:
  1. Category budget calculations.
  2. Reality check daily allowances.
  3. Two-way Supabase synchronisation when online.

### 3.3 Privacy & Security Boundaries
* Notification access grants access to notifications posted by all apps.
* Therefore, the native service and TypeScript parser must strictly:
  * Filter by known UPI/banking package IDs (e.g. `com.google.android.apps.nbu.paisa.user`, `com.phonepe.app`, `net.one97.paytm`, `in.org.npci.upiapp`, and bank apps).
  * Immediately discard notifications containing OTPs, PINs, passwords, or authentication codes.
  * Never transmit raw notification texts off-device.

---

## 4. Implementation Plan

1. **Native Android Notification Listener & Capacitor Plugin:**
   - Create `PaisaNotificationListenerService.java`.
   - Create `UpiTrackerPlugin.java` exposing Capacitor methods:
     - `isPermissionGranted()`
     - `openPermissionSettings()`
     - `getTrackingStatus()`
     - `setTrackingEnabled(boolean)`
     - Listen for `onNotificationDetected` event.
   - Register service in `AndroidManifest.xml`.
   - Register plugin in `MainActivity.java`.
2. **TypeScript UPI Notification Parser & Intelligence:**
   - Create `src/lib/upiNotificationParser.ts`:
     - Pattern matchers for GPay, PhonePe, Paytm, BHIM, HDFC, SBI, ICICI, Axis, Kotak.
     - Direction extraction (Debit / Credit / Refund / Reversal / Transfer).
     - Security guard: drops any notification matching OTP / PIN patterns.
     - Multi-factor deduplication against existing transactions.
3. **Settings UI Integration:**
   - Add **"Automatic Transaction Tracking"** section in `SettingsPage.tsx`:
     - Enable/disable tracking toggle.
     - Permission status banner (Granted vs Action required).
     - "Open Android Settings" button.
     - Supported apps detection / overview.
     - Last processed notification log.
     - Privacy & permissions disclosure card.
4. **Testing & Verification:**
   - Comprehensive unit test suite covering the 15 required scenarios.
   - Verify full test suite (222+ tests) and production build.
