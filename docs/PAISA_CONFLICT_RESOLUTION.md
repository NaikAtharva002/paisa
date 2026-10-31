# PAISA — Financial Conflict Resolution Specification

**Author:** PAISA Engineering Team  
**Scope:** Stage Four Financial Safety & Conflict Resolution Engine  
**Version:** 1.0 (Production Specification)

---

## 1. Core Principle: Never Silently Overwrite Financial Data

In consumer apps like note-taking or social media, a simple **Last-Write-Wins (LWW)** strategy using wall-clock timestamps is common. 

In a personal finance application like PAISA, **blind LWW is fundamentally unsafe**:
- **Risk of Ledger Drift:** If Device A edits an expense to ₹1,500 and Device B edits it to ₹1,200 while offline, arbitrarily picking whichever device had an un-synchronized clock erases an edit that represents actual money spent or earned.
- **Risk of Accidental Deletions:** If Device A deletes an accidental duplicate while Device B simultaneously categorizes and links it to a tax report, silent deletion destroys user work and accounting accuracy.
- **Clock Skew:** Mobile device clocks frequently drift by several seconds or minutes, making wall-clock timestamp comparisons unreliable for determining causality.

---

## 2. Conflict Detection Mechanism

PAISA detects conflicts using **Vectorized Version Tracking** combined with **Field-Level Divergence Checks** in `src/lib/sync/conflictResolver.ts`:

1. **Version Divergence:**
   - Every entity tracks a monotonic integer counter `version: number`.
   - When a record is edited locally, `version` increments (`v1 -> v2`).
   - When uploading, the engine compares the remote version against the base version on which the local edit was prepared.
   - If `remote_version > local_base_version`, a concurrent edit has occurred.

2. **Field-Level Divergence Filter:**
   - To prevent false alarms (e.g. metadata updates or formatting differences), the detector inspects **financial fields**:
     - `amount`
     - `merchant`
     - `description`
     - `category_id`
     - `transaction_type`
     - `deleted_at`
   - If versions differ but all financial fields are identical, the conflict is marked idempotent and auto-resolved.

---

## 3. Financial Resolution Strategies

When an active conflict is flagged, it is recorded in the local conflict vault (`SyncConflict`), and the mutation is paused in the outbox. The user is offered three safe resolution options:

### Strategy 1: Ledger Split (`split_transaction`) — Recommended for Financial Safety
- **Use Case:** Device A and Device B both modified a transaction's amount or merchant while offline.
- **Action:**
  1. The remote version is accepted as the primary record.
  2. The local draft is automatically converted into a new **reconciliation transaction** with `notes: "Reconciliation copy preserved from conflict on <id>"`.
- **Financial Invariant:** **Zero money is erased.** Both transactions are visible in the ledger. The user can review both and delete the unneeded one with full awareness.

### Strategy 2: Keep Local (`keep_local`)
- **Use Case:** The user knows their current device contains the correct, most recent receipt or bank SMS data.
- **Action:**
  1. The local version number is bumped beyond the remote version (`Math.max(local_ver, remote_ver) + 1`).
  2. The local entity is marked `pending_update` in the outbox.
  3. The next sync upload overrides the cloud record with the user's explicit authorization.

### Strategy 3: Accept Remote (`accept_remote`)
- **Use Case:** The user realizes their edit on this device was erroneous or superseded by another family member/device.
- **Action:**
  1. The local record is overwritten with the cloud record.
  2. Local `sync_status` is updated to `synced`.
  3. Any pending outbox mutation for this record is cancelled.

---

## 4. Deletion vs. Edit Conflicts (Tombstone Safety)

What happens if User deletes a transaction on their phone while editing it on their laptop?

- **Rule:** **Ledger Preservation Over Deletion.**
- If the remote edit changed the transaction's financial amount or category, PAISA **resurrects the edited version** and flags a conflict notification.
- An accidental deletion can always be re-performed in one click; a lost expense receipt cannot be recovered once forgotten.

---

## 5. Conflict Record Structure

Each conflict generates a permanent, inspectable audit entry:

```typescript
export interface SyncConflict {
  id: string; // e.g. "conflict_transactions_tx_102_1730389200000"
  table_name: SyncableTableName;
  record_id: string;
  local_version: number;
  remote_version: number;
  local_data: Record<string, unknown>;
  remote_data: Record<string, unknown>;
  detected_at: string;
  resolved: boolean;
  resolution_strategy?: 'keep_local' | 'accept_remote' | 'split_transaction';
  resolution_notes?: string;
  resolved_at?: string;
}
```

The React UI subscribes to `conflictResolver.subscribe()`. If `unresolvedConflicts.length > 0`, the top navigation bar displays a subtle yellow badge: **"1 Sync Conflict to Review"**, directing the user to the resolution modal.
