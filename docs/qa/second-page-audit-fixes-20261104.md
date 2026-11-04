# Second authenticated page-audit fixes — 2026-11-04

Source: authorized Owner read-only Preview16501bb screenshots27-gr-detail-1440 and23/24-planning. Existing rules require the same document to retain meaningful status across detail/linked summaries and labels to expose accessible names. Independent source archive7ac722b; integration tree untouched.

Before: GR detail finance_closed_at made its workflowClosed, but shared procurement-chain query selected only rawposted. Planning Delivery date rendered a visible label yet its filter-restructured dateinput lacked a stable programmatic name.

Scope: shared read-only procurement chain selects existingfinance_closed_at and uses the same detail display rule; otherPR/PO/invoice nodes unchanged. Planning date input gains explicit aria-label. No SQL, new permission, status transition, financial rule or write. Tests: execute actual query with synthetic scoped records for closed/open/draft/cancelled and error propagation; TypeScript/lint and existing chain/Planning regressions. Changed authenticated Preview remains pending parent integration.

## Validation and remaining scope

Actual query executed locally with inert DB double: finance-closedreceipt showsclosed; unclosedposted/draft/cancelled remain unchanged; PR/PO/invoice labels and receiptUUID href preserved; receipt read errors still throw. Targeted chain/Planning/auxiliary regressions pass; targeted ESLint and full TypeScript noEmit pass. No full build or deployed-after screenshots. Existing live before evidence is the second-batch audit under `/Users/seribako/Documents/Codex/2026-11-04/task/preview-16501bb/AUDIT-BATCH-2.md`.

Current source patch is independent from earlier 16501bb PO/GR list patch, which parent integrated as7ac722b. No integration checkout modifications or deployment here. Further PO detail table clipping remains open; no new table implementation was introduced. Other roles, actual saves/approvals/exports and physical tablet remain pending.

## Integration verification

Applied cleanly on 7ac722beab8b6d2a6e533c9b2466cf3543a8ef50. Confirmed closure display matches the current GR detail rule. New test uses ES imports without changing its assertions. 29 targeted tests pass, covering procurement chain, planning actions/menu, previous page-audit fixes and MC07. Changed-file ESLint, full TypeScript noEmit and diff checks pass. No deployment, real-data write, full-build or authenticated after-change visual claim. PO detail desktop final-column clipping remains open.
