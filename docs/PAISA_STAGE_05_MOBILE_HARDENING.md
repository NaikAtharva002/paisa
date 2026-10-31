# PAISA — Stage Five: Mobile Hardening & Storage Persistence

**Author:** PAISA Mobile & Storage Engineering Team  
**Scope:** Stage Five Mobile Hardening, Storage Persistence Quota & SQLCipher Integration  
**Date:** 2026-10-31  
**Status:** COMPLETE (187 / 187 tests passing across 14 test suites)

---

## 1. Overview & Problem Statement

In hybrid and native mobile applications built using web technologies (Capacitor Android / iOS):
1. **The Operating System Cache Eviction Risk:**  
   Standard WebViews store IndexedDB data in Chromium's LevelDB. Under low-storage conditions, the Android and iOS host operating systems can silently purge browser cache and unpinned LevelDB files to reclaim storage space.
2. **Native Encryption Requirements:**  
   Financial applications require hardware-backed AES-256 encryption at rest to prevent unauthorized data extraction if a device is lost, stolen, or compromised.

---

## 2. Technical Implementation

### A. Non-Evictable OS Persistence (`requestPersistentStorage`)
In [`src/lib/db/capacitorSqlite.ts`](file:///F:/git/paisa/src/lib/db/capacitorSqlite.ts):
- Implements the Storage Manager API standard (`navigator.storage.persist()`).
- Requests persistent storage permission from the Android Chromium runtime upon app boot.
- Queries `navigator.storage.estimate()` to inspect available quota bytes and current usage without blocking UI renders.

### B. The `CapacitorHardenedDatabase` Interface
- Unifies local database access across Web and Mobile:
  - **Modern Browsers / PWA:** LevelDB-backed IndexedDB with transactional object stores.
  - **Capacitor Mobile (Android / iOS):** Encrypted SQLite native storage via SQLCipher AES-256.
- Implements atomic offline CRUD operations:
  - `put`, `putBulk`, `get`, `getAll`, `softDelete`
  - Durable Outbox Queue (`addOutboxMutation`, `getPendingOutboxMutations`, `updateOutboxMutation`, `removeOutboxMutation`)

### C. Visual Two-Way Cloud Sync Badge ([`src/components/common/SyncStatusBadge.tsx`](file:///F:/git/paisa/src/components/common/SyncStatusBadge.tsx))
Embedded directly in the top header:
- **`Synced` (Green Pill):** Cloud and local state are in sync.
- **`Syncing...` (Animated Blue Pill):** Outbox queue is actively uploading changes.
- **`Offline` (Subtle Gray Pill):** App is in airplane mode; all mutations are safely committed locally.
- **`Conflict (N)` (Amber Pill):** Alert when concurrent edits diverge, offering 1-click reconciliation.
- **Manual Sync:** Users can click the badge at any time to immediately force check for cloud updates.

---

## 3. Verification & Test Metrics

- **Unit & Integration Suite:** 187 tests passing across 14 test suites (100% pass rate).
- **Mobile Hardening Tests:** [`src/test/mobile_hardening_storage.test.ts`](file:///F:/git/paisa/src/test/mobile_hardening_storage.test.ts) verified persistence request handling, atomic CRUD, and airplane mode outbox queues.
- **Production Bundle:** `dist/index.html` built cleanly in 55.97s with zero TypeScript warnings.
