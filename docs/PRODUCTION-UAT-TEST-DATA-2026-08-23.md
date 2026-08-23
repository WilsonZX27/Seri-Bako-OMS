# Production UAT test-data manifest — 2026-08-23

## Current authorization

On 2026-08-23 the Owner authorized traceable Production mutation for UAT. This does not authorize unbounded edits to live operational records. Every UAT mutation must use a dedicated `UAT-20260823-*` identifier or an explicit `PRODUCTION-UAT` remark, be recorded here with actor/time/record ID, and be cleaned up or explicitly retained with a reason.

## Safety rules

- Prefer draft/unposted records and isolated UAT master data.
- Do not post inventory, payments, or accounting effects against real operational items unless the test is explicitly designed to reverse them and the reversal is recorded.
- Do not reuse a real PR, PO, GRN, invoice, outlet daily record, supplier, item, branch, or stock count as a disposable fixture.
- Before cleanup, capture the record IDs and audit trail. After cleanup, rerun the manifest query and record zero remaining disposable rows.
- If a record cannot be safely deleted because it is posted or immutable, stop and report it rather than mutating around the audit boundary.

## Run log

| Run | Surface | Identifier / remark | Actor | Created at | Record IDs | Cleanup | Status |
|---|---|---|---|---|---|---|---|
| 2026-08-23 | PR → Manager → Purchasing → Finance → PO | `PRODUCTION-UAT \| UAT-20260823-PR-001 \| Draft-only \| Cleanup required`; PO `UAT-20260823-PO-001` | WILSON → TEST MANAGER → TEST PURCHASE → TEST-FINANCE | 2026-08-23 01:18–01:29 MYT | PR `PR/AUG26/020`, id `1e6ab4b0-9238-4735-b928-6054435335e0`; PO id `4fac5716-8c99-46a3-8ed3-80c015804bc6` | pending v8.64.156 promotion / audited cancellation; do not send or receive | retained temporarily — cleanup pending |

## Evidence boundary

This manifest is separate from the annotation ledger. It records disposable Production data only; it is not evidence that a workflow passed. A workflow may be marked `production verified` only after the corresponding read/mutation evidence and cleanup result are attached.
