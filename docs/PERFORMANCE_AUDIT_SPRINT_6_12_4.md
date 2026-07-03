# Sprint 6.12.4 Performance Audit

Goal: improve perceived speed before real data import without weakening RLS or over-caching permissions.

## Dashboard

- Issue: previous dashboard stacked large panels, creating too much scroll and visual load.
- Improvement: compact KPI row plus two-column content area. Quick actions and notifications are shorter and role-aware.
- Remaining risk: dashboard query still fetches several independent datasets. Acceptable for small-batch import, but should be monitored once stock and document volume grows.

## Purchase Requests

- Issue: action feedback could feel stuck because server actions updated data without deterministic redirects.
- Improvement: PR submit/review/approve/reject/cancel actions now redirect with success/error feedback.
- Remaining risk: PR list fetches all PR rows before pagination. Add server-side pagination when data volume grows beyond small batch.

## Purchase Orders

- Issue: PO workflow actions could finish without visible feedback.
- Improvement: PO submit/approve/reject/send/cancel/close now redirect with friendly messages.
- Remaining risk: PO list also hydrates line totals by reading all lines. Fine for pilot volume, but should be batched or indexed for larger data.

## Suppliers

- Current state: supplier list is paginated through app-level helpers.
- Risk: import workflows can become expensive if supplier item datasets grow. Keep imports chunked and avoid full table scans.

## Items

- Current state: item selectors and item lists are usable for pilot data.
- Risk: search should move to indexed server-side filtering as item count grows.

## Inventory

- Current state: stock balance and ledger views are the right source of truth.
- Risk: views must keep `security_invoker = true` and rely on underlying table RLS. Add indexes on stock transaction item/location/date if response time degrades.

## Data Onboarding

- Current state: onboarding checks are admin-only and not shown to daily users.
- Risk: import preview/confirm should avoid loading large files fully into UI for production-scale files.

## Staff Page

- Improvement: Staff create/edit/detail now uses Record Workspace with action panel. Auth setup and danger actions are separated from profile data.
- Improvement: permanent delete has server-side history checks and owner protection.

## Documents

- Improvement: canonical routing prevents duplicate detail rendering for operational documents.
- Risk: generic document detail should remain for true generic documents only.

## Small-Batch Import Readiness

Ready for a small-batch data import after applying migrations, with two cautions:

- Run the Super Admin recovery migration first and verify Wilson shows as `Super Admin / Owner`.
- Start with a small supplier/item/stock batch so list hydration and import feedback can be observed before larger imports.
