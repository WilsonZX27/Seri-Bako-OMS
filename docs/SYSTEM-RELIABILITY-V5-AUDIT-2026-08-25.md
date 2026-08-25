# Seri Bako OMS Reliability v5 Audit — 2026-08-25

## Evidence boundary

This register separates source implementation, local verification, migration state, authenticated UAT, and Production verification. A route is not Production-verified merely because its code, contract test, or migration file exists.

Current source baseline: `v8.65.0`. Migration dependency: `206_reliability_observability_foundation.sql`.

## Audit health

| Dimension | Score | Current evidence |
|---|---:|---|
| Business continuity | 3/4 | Stock Count has versioned device recovery; other long forms remain inconsistent. |
| Data integrity | 3/4 | Core posting paths use atomic RPCs; operation registry coverage begins with Stock Count creation. |
| Safe self-healing | 2/4 | Bounded GET/HEAD retry and circuit protection are shared; mutation recovery is disabled by default. |
| Error prevention | 3/4 | Shared safe error formatting and first-invalid guidance exist, but not every form uses structured field errors. |
| Owner observability | 3/4 | Owner System Health, incident grouping and escalation are implemented; Production signals are not yet observed. |
| **Total** | **14/20** | **Good foundation; staged workflow adoption and authenticated fault UAT remain.** |

## Reliability coverage matrix

| Module | Atomic / idempotent evidence | Draft recovery | User correction | Owner incident coverage | State |
|---|---|---|---|---|---|
| Stock Count | Atomic create/update/post; tracked create key | Versioned device snapshot | Missing-item summary and first-invalid focus | Autosave failures recorded | Pilot implemented; migration/UAT pending |
| Purchase Request | Atomic create and conversion migrations; line revision keys | No shared revision store | Returned/line correction exists | Safe action logs only | Adoption backlog |
| Purchase Order | Atomic transition; restore RPC | Not applicable | State-specific action guidance | Safe action logs only | Adoption backlog |
| Goods Receiving | Atomic creation/posting migrations | No shared device snapshot | Form validation | Safe action logs only | P1 recovery gap |
| Stock Transfer | Reservation, partial receipt and receipt idempotency | No shared device snapshot | Workflow conflict messages | Safe action logs only | P1 recovery gap |
| Outlet Daily | Repeatable same-day draft | Browser recovery not standardized | Qty Sent/Received/Wastage guidance | Safe action logs only | P1 recovery gap |
| Production | Atomic creation/posting migrations | No shared device snapshot | Workflow validation | Safe action logs only | P1 recovery gap |
| Wastage / Returns | Atomic terminal transitions | No shared device snapshot | Quantity validation | Safe action logs only | P1 recovery gap |
| Supplier Invoice | Status and payment RPC boundaries | No shared device snapshot | Validation messages | Safe action logs only | P1 idempotency audit |
| AutoCount Import | Session/JSON guard and retryable confirm | Staged job retained | Structured row issues | Import logs only | Incident adoption backlog |
| Attachments | Safe labels and locked audit boundary | Selected file cannot survive browser refresh | Upload failure message | Platform log only | P2 recovery gap |
| Auth | Safe non-leaking messages | Session refresh handled by Supabase middleware | Recovery links | Platform log only | Fault UAT pending |
| Reports / reads | Fail-closed unavailable states | Not applicable | Retry/refresh | Shared bounded GET retry | Implemented; UAT pending |
| Backup | Owner-only export | Not applicable | Explicit failure | Activity/audit logs | Restore dry-run not implemented |

## Prioritized findings

### P0 — Release dependency

- Migration 206 must be applied before exposing `/administration/system-health` or the Stock Count tracked-operation pilot. Application deployment without its schema is not allowed.

### P1 — Complete safe workflow adoption

- Add operation tracking to PR→PO, PO→GR, Stock Transfer receiving, Stock Count posting, Production posting, Wastage, Return and Invoice payment. Reuse each workflow's existing idempotency key or atomic terminal-state result; do not add blind write retries.
- Move Outlet Daily, PR, GR, Transfer, Wastage and Production editors onto the shared versioned draft-recovery adapter. Offline queuing remains draft-only.
- Replace message parsing with stable RPC error codes as each workflow is touched. Keep legacy parsing as temporary compatibility until its migration is remotely verified.

### P2 — Operational maturity

- Add authenticated Preview fault injection for response loss, 401, 408/429/5xx, stale revision, double-submit and concurrent devices.
- Add an Owner reconciliation report for document header/line/ledger invariants. It reports discrepancies and never rewrites them.
- Add external synthetic monitoring only after 48 hours of internal incident data establishes useful thresholds.

## Supported recovery policy

- Reads: original request, one immediate retry, then one short jittered retry; GET/HEAD only; three exhausted operations open the circuit for fifteen seconds.
- Writes: no generic retry. A workflow may recover only through the same idempotency key and a server-authoritative result lookup.
- Drafts: device snapshots may sync after reconnect. Posting, approval, receiving, payment and inventory movement are never queued offline.
- Escalation: the same incident fingerprint becomes `action_required` after three occurrences or fifteen minutes. Owner is notified once on transition.
- Business facts: reliability infrastructure always records whether business data changed. Incident recovery events default to `false` and cannot infer stock, money, supplier, workflow or permission values.

## UAT matrix

Every dynamic workflow requires seeded, cleanup-safe fixtures for Owner, Kitchen, Outlet, Purchasing, Finance and Manager where the role applies. Evidence is captured at `390×844`, `820×1180`, `1180×820`, and `1440×900`.

Required scenarios: offline refresh, response lost after commit, session expiry, duplicate tap, stale page, concurrent device, schema mismatch, non-JSON response, storage failure, local storage quota, recovery success, recovery exhaustion, incident acknowledgement, tenant isolation and feature-flag rollback.
