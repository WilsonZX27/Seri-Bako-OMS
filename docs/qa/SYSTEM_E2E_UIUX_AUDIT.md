# System E2E / UIUX Audit

Date: 2026-07-16

## Scope and blocker

Source review covered the implemented route tree, shared shell, import workspace, inventory landing page, permissions, and current hard-delete changes. An authenticated Owner tab was available for read-only Production inspection; no Production mutation was attempted.

## Route matrix

| Area | Routes discovered | Intended task | Browser status |
|---|---|---|---|
| Authentication/account | `/login`, `/forgot-password`, `/set-password`, `/change-password`, `/account` | Sign in and manage account | Blocked: no authenticated session |
| Dashboard/operations | `/dashboard`, `/daily-operations` | Operational alerts and next actions | Partial: dashboard inspected |
| Procurement | `/purchase-requests`, `/purchase-requests/new`, `/purchase-requests/[id]`, `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]` | Request, approve, convert, and review purchasing | Blocked |
| Receiving/returns/invoices | `/goods-receivings`, `/goods-receivings/[id]`, `/purchase-returns`, `/purchase-returns/[id]`, `/supplier-invoices`, `/supplier-invoices/[id]` | Receive, return, and reconcile supplier documents | Blocked |
| Master data | `/suppliers`, `/suppliers/[id]`, `/items`, `/items/[id]`, `/products`, `/products/[id]`, `/recipes`, `/recipes/[id]` | Maintain operational masters | Blocked |
| Inventory | `/inventory`, `/stock-balance`, `/stock-card`, `/stock-transactions`, `/stock-transactions/[id]`, `/stock-transfers`, `/stock-counts`, `/stock-wastage`, `/low-stock` | Review and post controlled stock movement | Partial: inventory inspected; other routes not walked |
| Production | `/production`, `/production/jobs`, `/production/jobs/[id]`, `/production/jobs/new` | Manage production jobs | Blocked |
| Administration | `/reports`, `/activity`, `/company`, `/branches`, `/roles`, `/roles/[id]`, `/staffs`, `/staffs/[id]` | Govern access and organization data | Blocked |
| Imports | `/imports`, `/imports/[entity]`, `/administration/imports`, `/opening-stock/import` | Preview, validate, and confirm imports | Partial: source and Staff import inspected; authenticated mutation blocked |

Permissions remain server-authoritative; visual visibility is not treated as an authorization result.

## Confirmed fixes

- Removed the duplicate `Opening Stock Import` card from Inventory.
- Import routes now mount page-specific right-console context instead of the generic workspace placeholder.
- Import result cards are shown after an import result exists, avoiding four permanent zero-state cards dominating the empty workspace.
- Import template/draft controls, current-file counts, and review actions now live in the shared right console; the central workspace stays focused on the data grid.
- Added `/imports` landing route with links for every configured import type.
- Role detail puts Save Changes first; list filters remain one desktop row; Stock Transfers Search uses the primary action style.
- Staff permission overrides keep friendly effective labels primary and move technical keys behind Technical details.

## Inventory definitions

Low Stock uses the existing `stock_balances_view` rule: active items where `current_qty <= safety_stock`, including zero stock. Rows show item, Branch / Outlet, on-hand, base UOM, safety stock, shortage, and a Stock Card link. Archived/inactive items are excluded.

Highest-Consumption Ingredients uses posted `production_usage` stock transactions only. Opening stock, purchases/receipts, transfers, counts, adjustments, returns, and wastage are excluded. The dashboard supports 7 days, 30 days, and current month. Quantities remain in the item's base UOM; no incompatible-unit ranking or synthetic cost value is produced.

The aggregation remains server-side. No migration was required.

## Import matrix

The shared `ImportWorkflow` is used by every configured `ImportEntity` in `src/lib/imports/config.ts`, plus the dedicated `/opening-stock/import` route. Static verification confirms common template, draft, upload/table, row validation, error download, and result-count paths. Authenticated browser verification of UTF-8, malformed/mixed rows, duplicate identifiers, invalid references, confirmation, retry, and final persistence is blocked until an Owner session is available.

## Screenshots and evidence

Fresh authenticated read-only evidence:

- `docs/qa/evidence/production-dashboard.png`
- `docs/qa/evidence/production-inventory.png`
- `docs/qa/evidence/production-import-staff.png`

- User-provided import screenshot: `C:\Users\WilsonZX\AppData\Local\Temp\codex-clipboard-a678d2b5-797c-421e-a451-8660bfdcf5dd.png`
- User-provided inventory screenshot: `C:\Users\WilsonZX\AppData\Local\Temp\codex-clipboard-19010a4b-ab0f-4105-a355-1935f4749e26.png`
- The screenshots show the duplicate opening-stock card and generic right-console context that motivated the fixes above.

## Remaining P1/P2 work

- Authenticated E2E walkthrough for every route and primary workflow.
- Import validation matrix: templates, malformed rows, references, drafts, retry, confirmation, and result counts.
- Inventory low-stock detail rows and consumption-period verification against posted ledger taxonomy.
- Responsive/mobile screenshots and accessibility checks.
- Production read-only verification after Wilson provides an authenticated browser session.

## Responsive continuation evidence (2026-08-15)

The authenticated local Owner audit now verifies all 69 canonical static workspaces at 320px, 820px, and 1180px. Every route passed global-style availability, application-error, page overflow, interactive-bound, accidental vertical-text, and terminal filter-action alignment checks. The audit includes the reported Purchase Requests, Goods Receiving, Stock Count, Outlet Daily Records, Stock Card, and Stock Wastage surfaces.

The audit harness now treats the isolated local server address as authoritative whenever it starts that server. This prevents a stale `TEST_BASE_URL` from silently directing evidence collection to another dev session. Headless-control form mirrors are excluded from interactive geometry only when they are explicitly hidden or both pointer-inert and unfocusable; visible and operable controls remain fully checked.

The populated-detail audit additionally verifies eight fixture-backed record types at the real 820px tablet and 1180px laptop review widths. Thirteen configured detail types have no populated local fixture and remain explicitly unverified rather than being counted as passes. Stock Transfer, Stock Wastage, and Production Job creation forms pass the phone, tablet, and desktop workflow audit.

Stock Wastage previously rendered selection checkboxes without applying `line_enabled` when the server action built its payload. Unchecked rows could therefore retain default quantities and be submitted. Transfer and Wastage now both filter payload lines through the enabled item IDs, while the shared phone form hides quantity, availability, reason, batch, and remarks until an item is selected.

## Continuation verification (2026-07-16)

Local source/build verification: Passed (6 contract tests, typecheck, lint, build, diff check). Local browser route verification reached the login gate at `/imports`; no local credentials were supplied, so authenticated screenshots and data-state checks remain Blocked. Production read-only tab was restored to `/stock-balance`; no records, imports, attachments, or permissions were changed.

The reported PR delete blocker is still a deployment/migration state issue: Production screenshots reflect the older applied 056 behavior, while the local 057 correction remains intentionally unapplied. Attachment removal is permission-gated archive/removal through the existing `archiveDocumentAttachment` action; the detail card exposes Remove only when the current actor has the attachment-management permission.

## Final authenticated production smoke (2026-07-16)

Read-only checks on the authenticated Owner Production tab confirmed the deployed UI exposes `/imports` as the Import Data landing route and `/inventory` contains Low Stock Items and Highest-Consumption Ingredients (7 days, 30 days, Current month) with no duplicate Opening Stock Import card. The route loaded as the current production UI; an exact Vercel deployment ID/commit was not observable from the browser surface.

Migration 057 destructive behavior was not claimed as verified: the browser automation surface became non-responsive while preparing the disposable PR form, so no `E2E-QA-*` record was created and no delete RPC was called. Consequently pristine-PR cascade-safe dependencies, tombstone creation, redirect, and deletion disappearance remain Blocked pending a successful authenticated UI run.

Production import and targeted regression checks were likewise limited to the observed read-only landing/dashboard surfaces. No existing Production business record, attachment, staff record, item, document, or permission was changed. No migration was run, and no package or lockfile was modified.
