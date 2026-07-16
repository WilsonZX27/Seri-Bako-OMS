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
| Administration | `/reports`, `/activity`, `/company`, `/branches`, `/locations`, `/roles`, `/roles/[id]`, `/staffs`, `/staffs/[id]` | Govern access and organization data | Blocked |
| Imports | `/imports/[entity]`, `/administration/imports`, `/opening-stock/import` | Preview, validate, and confirm imports | Partial: Staff import inspected; no mutation |

Permissions remain server-authoritative; visual visibility is not treated as an authorization result.

## Confirmed fixes

- Removed the duplicate `Opening Stock Import` card from Inventory.
- Import routes now mount page-specific right-console context instead of the generic workspace placeholder.
- Import result cards are shown after an import result exists, avoiding four permanent zero-state cards dominating the empty workspace.

## Inventory definitions

Low Stock uses the existing `stock_balances_view` rule: active items where `current_qty <= safety_stock`, including zero stock. Rows show item, branch/location, on-hand, base UOM, safety stock, shortage, and a Stock Card link. Archived/inactive items are excluded.

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
