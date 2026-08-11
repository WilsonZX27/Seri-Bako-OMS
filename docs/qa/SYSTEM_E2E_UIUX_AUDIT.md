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

## Continuation verification (2026-07-16)

Local source/build verification: Passed (6 contract tests, typecheck, lint, build, diff check). Local browser route verification reached the login gate at `/imports`; no local credentials were supplied, so authenticated screenshots and data-state checks remain Blocked. Production read-only tab was restored to `/stock-balance`; no records, imports, attachments, or permissions were changed.

The reported PR delete blocker is still a deployment/migration state issue: Production screenshots reflect the older applied 056 behavior, while the local 057 correction remains intentionally unapplied. Attachment removal is permission-gated archive/removal through the existing `archiveDocumentAttachment` action; the detail card exposes Remove only when the current actor has the attachment-management permission.

## Final authenticated production smoke (2026-07-16)

Read-only checks on the authenticated Owner Production tab confirmed the deployed UI exposes `/imports` as the Import Data landing route and `/inventory` contains Low Stock Items and Highest-Consumption Ingredients (7 days, 30 days, Current month) with no duplicate Opening Stock Import card. The route loaded as the current production UI; an exact Vercel deployment ID/commit was not observable from the browser surface.

Migration 057 destructive behavior was not claimed as verified: the browser automation surface became non-responsive while preparing the disposable PR form, so no `E2E-QA-*` record was created and no delete RPC was called. Consequently pristine-PR cascade-safe dependencies, tombstone creation, redirect, and deletion disappearance remain Blocked pending a successful authenticated UI run.

Production import and targeted regression checks were likewise limited to the observed read-only landing/dashboard surfaces. No existing Production business record, attachment, staff record, item, document, or permission was changed. No migration was run, and no package or lockfile was modified.

## Ultra full-system audit (2026-08-01)

### Coverage

- Route inventory: 107 `page.tsx` routes, including 83 static routes and dynamic record routes.
- Shared UI surface: 87 components.
- Contract tests discovered: 198 test files; current run executed 394 tests.
- Chrome for Testing matrix was prepared for all 83 static routes at phone (390x844), tablet (820x1180), and desktop (1440x900).

### Verification results

| Check | Result | Notes |
|---|---:|---|
| ESLint | PASS | `npm run lint` passed. |
| TypeScript | PASS after generated-output cleanup | Initial failure came from stale `.next/types` referencing the removed Central Kitchen API route; clearing generated `.next` removed the false source error. |
| Contract suite | 386/394 passed | 8 failures remain and are listed below. |
| Build | Compiled with warnings | Supabase browser client is imported through middleware and triggers an Edge Runtime compatibility warning; build output was generated. |
| UI detector | No findings | Impeccable detector returned no automated slop findings for `src/app`, `src/components`, or `src/lib`. |
| Authenticated browser matrix | BLOCKED | The Chrome session expired during the matrix and redirected 240/249 checks to `/login`; these are not counted as page failures. |

### Contract failures requiring remediation

1. `tests/document-sequences-workspace-contract.test.js` - document sequences no longer matches the shared technical-table contract.
2. `tests/kitchen-pr-scope-contract.test.js` - expected branch-scope enforcement pattern is not present in the tested source path.
3. `tests/manager-pr-scope-contract.test.js` - manager company-wide PR capability contract is missing the expected `pr.view_all` declaration.
4. `tests/purchase-orders-mobile-contract.test.js` - PO mobile search/row delivery context contract is incomplete.
5. `tests/purchase-requests-mobile-list-contract.test.js` - PR list desktop/mobile surface and identity-anchor contract is incomplete.
6. `tests/purchase-requests-mobile-list-contract.test.js` - phone status tab anchoring contract is incomplete.
7. `tests/sprint-7-23-5-4-operational-lists-contract.test.js` - Purchase Returns does not match the canonical responsive table contract.
8. `tests/table-anchor-contract.test.js` - Documents table semantic identity is not anchored according to the shared checkbox/action/title rule.

These are P1/P2 implementation mismatches, not test noise: they correspond directly to the shared table, mobile list, permission, and responsive rules in `DESIGN.md`.

### Confirmed legacy compatibility surface

The following pages still exist as compatibility redirects or retain permission/title mappings:

- `/settings` -> `/administration`
- `/settings/backups` -> `/administration/backups`
- `/daily-operations`
- `/data-onboarding` -> `/imports`
- `/quick-tools`
- `/roles/new` -> `/roles`
- `/roles/[id]` -> `/roles`
- `/stock-balances` -> `/stock-balance`

The redirects prevent dead links, but the route-permission map and mobile title map still expose several retired names. This is a P1 information-architecture cleanup item: either formally retain these aliases in a documented compatibility section or remove their route/permission/title entries together after checking external bookmarks.

### Static quality observations

- Image alternative text is present on the inspected image surfaces, including the company-logo preview.
- Raw `console.error`/`console.log`/`alert` usage is not present in product UI code; the sole `console.error` is inside the redacting server logger.
- The design detector found no gradient-text, decorative-grid, glassmorphism, or hard-coded UI slop patterns in the scanned source directories.
- The main systemic risk is contract drift: shared table/list rules exist in `DESIGN.md` and tests, but several pages have diverged from those primitives.

### Browser evidence limit

The full route matrix must be rerun after the Owner logs back into the Chrome for Testing profile. Until then, no claim is made about authenticated data states, button network responses, autosave persistence, posting, approval, migration-backed actions, or role-specific behavior in production.

### Priority order

1. P0: restore authenticated Chrome session and rerun the 249-check matrix.
2. P1: fix the 8 failing contracts, starting with permission scope and table anchors.
3. P1: decide whether legacy compatibility routes remain supported; then reconcile route permissions and mobile titles.
4. P1: perform disposable-data workflow tests for Stock Count, PR, PO, GRN, Staff, and approval/rejection; verify visible loading/success/error feedback and persistence after refresh.
5. P2: compare density, filtering, pagination, audit trail, and recoverability against mature ERP conventions after functional correctness is green.

### Market comparison signals

- Odoo's inventory workflow supports assigning count work to a user/location and grouping cycle counts by location; this suggests a future Stock Count enhancement: assignable count batches, location scope, and visible progress rather than one undifferentiated long list. See [Odoo cycle counts](https://www.odoo.com/documentation/17.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/cycle_counts.html) and [Odoo barcode adjustments](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/barcode/operations/adjustments.html).
- Odoo documents a before/after inventory adjustment history, which supports keeping the existing ledger/audit model and adding a compact “what changed” summary before posting. See [Odoo inventory adjustments](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html).
- NetSuite exposes reorder suggestions based on stock levels and item records; for Seri Bako this is a later low-stock/PR recommendation layer, never an automatic submission. See [Oracle NetSuite inventory workflow](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2251098.html).

## Interrupted strict audit continuation (2026-08-11, superseded snapshot)

The first snapshot in this section predates the shared-shell reconciliation. The `40/59`
result and its 19 listed mismatches are retained for traceability only and are superseded by
the later focused-shell `26/26` and full local inventory `395/395` results below.

This section records the state after the previous audit process was manually stopped. It is intentionally evidence-based; unresolved items are not marked complete.

### Local verification

| Check | Result | Evidence / limitation |
|---|---:|---|
| `npm run typecheck:strict` | PASS | No TypeScript errors after restoring shared icon typing and optional hero actions. |
| `npm run lint` | PASS | ESLint completed without warnings treated as errors. |
| `npm run build` | PASS | Next.js production build completed and generated 88 routes. |
| Shared UI/permission contracts | 40/59 PASS | 19 source-contract failures remain; these are tracked implementation drift, not waived. |
| Authenticated Playwright E2E | BLOCKED | Test config points at local fixture `127.0.0.1:54321`; local Supabase is not running. |
| Browser automation | BLOCKED | Chrome launch failed with `DevToolsActivePort` in this environment; no authenticated browser claim is made. |

The 19 remaining contract failures cover dashboard quick-action semantics, production/transfer mobile surfaces, recipe and low-stock line layouts, inventory hub/action-bar duplication, master-data creation affordances, PO/PR mobile list anchors, status visibility, ledger utility rails, and table identity anchors. They require source remediation or explicit contract reconciliation before a final pass.

### Supabase evidence

The supplied `supabase_logs (1).csv` contains 43 rows: 21 statement timeouts (`57014`), 21 HTTP 500 responses, and one `42501` permission error for `companies`. The dominant failing calls are `get_stock_card_bounded`, `get_stock_ledger_bounded_page`, and `stock_balances_view` reads. This indicates a cloud query/grant problem, not a browser-only rendering problem. No cloud mutation was performed during this continuation because the CLI could not establish the migration ledger connection.

### Outlet Staff access finding

The route and permission maps include `/outlet-daily-records`, but the baseline role-permission migration did not reliably prove that every deployed `outlet_staff` role has the required `dashboard.view`, `outlet_daily_record.view`, `outlet_daily_record.create`, and `outlet_daily_record.update` grants. A forward-only repair migration was added locally at `supabase/migrations/113_repair_outlet_staff_daily_record_access.sql`, with a source contract at `tests/outlet-staff-daily-record-access-contract.test.js`. It is not claimed as applied to production; the Supabase migration ledger must be reconciled first, then the migration can be pushed and verified with an actual outlet-staff session.

### No-data / unavailable behavior

The data gaps are not treated as “fixed” by changing labels. The timeout evidence must be resolved at the bounded inventory RPC/query and grant layer, then verified with real cloud responses and a refresh. Until that happens, dashboard and inventory fallbacks remain a known P1 verification item.

### Next gate

The final audit gate is: reconcile the cloud migration ledger, run the bounded-RPC smoke queries, restore an authenticated Owner and Outlet Staff browser session, execute the 390/820/1440 route matrix, then rerun all 59 shared contracts. No “all annotations complete” claim is valid before that gate passes.

## Strict audit continuation — focused shell regression (2026-08-11)

The interrupted continuation was resumed without resetting or cleaning the worktree. The focused shared-shell set now passes 26/26 after source fixes and contract reconciliation:

- role-specific dashboard quick actions retain their destinations;
- phone-only operational hubs preserve the desktop workspace;
- master-data and ledger action rails are permission-aware and do not create empty duplicate mobile bars;
- Purchase Orders and Purchase Requests retain reachable creation actions;
- responsive list surfaces retain operational phone rows and semantic table identity anchors;
- shared status tabs keep the active filter control visible;
- Outlet Staff daily-record permission migration contract passes without disabling RLS.

The focused suite is a static/source contract suite, not authenticated browser E2E. Playwright and Chrome remain blocked by the local Supabase fixture/session state described above.

## Security audit limitation (2026-08-11)

A repository deep-security-scan preflight was ready, but the scan coordinator terminated during in-scope file discovery because Windows denied the ripgrep process (`WinError 5`, `generate_in_scope_files`). The failure manifest is recorded under the temporary `codex-security-scans-*` directory and is not treated as a clean security scan. The scoped static baseline remains 36 fully reviewed source/migration files, with no high/medium auth, tenant-isolation, or IDOR finding reported; this is not a substitute for a successful repository-wide scan.

## Responsive matrix continuation (2026-08-11)

The interrupted local audit was resumed against the isolated local server at `http://127.0.0.1:3015` with the disposable Super Admin fixture. The canonical static workspace audit covered the complete route inventory (75 workspaces) at each required viewport:

| Viewport | Result | Coverage |
|---|---|---|
| 390x844 | PASS | 75/75 routes |
| 768x1024 | PASS | 75/75 routes |
| 820x1180 | PASS | 75/75 routes |
| 1024x900 | PASS | 75/75 routes in deterministic batches |
| 1180x820 | PASS | 75/75 routes in deterministic batches |
| 1440x960 | PASS | 75/75 routes in deterministic batches |

Each route was checked for login redirect, loaded global CSS, application error state, page-level horizontal overflow, and interactive controls outside the viewport. The role workspace browser suite passed 8/8 serially, including Outlet Staff daily-record access/denial boundaries; the mobile visual smoke for `/roles` passed 1/1. Long-lived local Next sessions can saturate the dev asset server; isolated reruns passed and no route-level layout assertion failed. This is a test-infrastructure limitation, not cloud verification.

Cloud-only items remain open: Supabase timeout/permission evidence, migration-ledger reconciliation, production application of migration 113, and a real cloud-authenticated browser session. The local matrix must not be interpreted as proof that production `Unavailable` values are resolved.

## Latest local regression gate (2026-08-11)

After the interrupted audit was resumed, the full local contract inventory completed with **395/395 passing tests**. `npm run typecheck:strict`, `npm run lint`, and `npm run build` also passed; the production build generated 88 routes. This clears source-level regression gates only. Authenticated browser coverage, cloud Supabase RPC/data verification, and production application of migration 113 remain open and must not be reported as complete.
