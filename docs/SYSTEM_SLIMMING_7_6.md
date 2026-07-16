# Sprint 7.6 System Slimming

Baseline: `v0.2.15 / Sprint 7.5 RC-2`, migration ceiling `054`.

## Outcome

- Retained all 93 page routes. No implementation was proven dead after tracing navigation, links, redirects, actions, tests, and product scope.
- Retained `/stock-balances` and `/procurement/purchase-requests` as tiny redirect-only bookmark aliases.
- Removed the duplicate PR create action, the nested filter scroller, the duplicate Supplier `Archived` status surface, and the physical Product delete path.
- Bounded Supplier list reads to 15 rows with server-side filter, sort, and exact count.
- Reduced workspace mutation invalidation from five unconditional routes to only explicitly affected routes.
- Added a PR-detail loading boundary and opt-in server phase timing (`SB_PERF_LOG=true`).

## Route inventory

Classification: A core workflow, B supporting/admin, E internal/system, F redirect-only. No C duplicate implementation or D legacy page was proven safe to delete. `Bundle` is the baseline first-load JS from the production build; ranges group routes that share the same implementation shape.

| Routes (every page route) | Class | Nav / inbound | Query or handler path | Permission | Purpose / duplicate / PRODUCT.md | Bundle | Keep |
|---|---|---|---|---|---|---:|---|
| `/` | F | Direct/bookmark | Session check, redirect | Public/session | Canonical entry; covered by Core Platform | 103 kB | Yes |
| `/login`, `/forgot-password`, `/set-password`, `/change-password` | A | Auth flows | Supabase Auth actions | Public/session | Identity and recovery; Core Platform | 116–117 kB | Yes |
| `/account` | B | Account menu | Profile/auth actions | Authenticated | Self-service profile; Core Platform | 116 kB | Yes |
| `/setup` | E | Bootstrap guard | Setup queries/actions | Protected bootstrap | First-admin recovery, not a daily module | 106 kB | Yes |
| `/dashboard` | A | Sidebar | Dashboard queries | `dashboard.view` | Operational visibility; PRODUCT covered | 120 kB | Yes |
| `/daily-operations`, `/quick-tools` | B | Inbound workspace links | Workspace composition | `dashboard.view` | Alternate task hubs, not duplicate implementations | 106 kB | Yes |
| `/procurement`, `/inventory`, `/production` | B | Inbound module links | Module insights | Module read permissions | Real module landing pages; PRODUCT covered | 106–117 kB | Yes |
| `/purchase-requests`, `/purchase-requests/new`, `/purchase-requests/[id]` | A | Sidebar, search, document links | Procurement queries/actions | PR read/create/workflow | Core PR workflow | 118–124 kB | Yes |
| `/procurement/purchase-requests` | F | Legacy inbound | Redirect | `purchase_request.read` | Safe alias to `/purchase-requests` | 103 kB | Yes |
| `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]` | A | Sidebar, PR links | Procurement queries/actions | PO read/create/workflow | Core PO workflow | 118–123 kB | Yes |
| `/goods-receivings`, `/goods-receivings/new`, `/goods-receivings/[id]` | A | Sidebar, PO links | GRN queries/actions | GRN read/create/post | Core receiving workflow | 118–120 kB | Yes |
| `/purchase-returns`, `/purchase-returns/new`, `/purchase-returns/[id]` | A | Sidebar, GRN links | Return queries/actions | Return view/create/post | Core stock-impacting return | 117–120 kB | Yes |
| `/supplier-invoices`, `/supplier-invoices/new`, `/supplier-invoices/[id]` | A | Sidebar, GRN/PO links | Invoice queries/actions | Invoice view/create/pay | Operational supplier invoice scope | 117–119 kB | Yes |
| `/suppliers`, `/suppliers/new`, `/suppliers/[id]` | A | Sidebar, item/procurement links | Supplier queries/actions | Supplier view/create/update | Supplier Master | 118 kB | Yes |
| `/supplier-items`, `/supplier-items/new`, `/supplier-items/[id]` | B | Procurement/onboarding links | Master-data queries/actions | Supplier-item read/create/update | Purchasing support data | 106 kB | Yes |
| `/items`, `/items/new`, `/items/[id]` | A | Sidebar, PR/stock links | Item/inventory queries/actions | Item view/create/update | Item Master | 118–119 kB | Yes |
| `/products`, `/products/new`, `/products/[id]` | A | Sidebar, production links | Product queries/actions | Production view/create + RLS | Product Master | 117 kB | Yes |
| `/recipes`, `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit` | A | Sidebar, product/production links | Recipe/document queries/actions | Recipe view/create/update | Recipe/BOM workflow | 117–128 kB | Yes |
| `/production/jobs`, `/production/jobs/new`, `/production/jobs/[id]` | A | Sidebar, production links | Production queries/actions | Production view/create/workflow | Production workflow | 118–121 kB | Yes |
| `/stock-balance` | A | Sidebar, inventory links | Inventory balance view | `stock_balance.read` | Derived stock truth | 117 kB | Yes |
| `/stock-balances` | F | Legacy inbound/action reference | Redirect | `stock_balance.read` | Safe alias to `/stock-balance` | 103 kB | Yes |
| `/stock-card` | A | Inventory/item links | Ledger queries | `stock_card.read` | Per-item ledger view | 106 kB | Yes |
| `/stock-transactions`, `/stock-transactions/new`, `/stock-transactions/[id]` | A | Sidebar, document links | Ledger queries/actions | Stock transaction read/create | Movement ledger and controlled posting | 117–119 kB | Yes |
| `/stock-counts`, `/stock-counts/new`, `/stock-counts/[id]` | A | Sidebar, inventory links | Count queries/actions | Count read/create/workflow | Count/reconciliation workflow | 117–120 kB | Yes |
| `/stock-transfers`, `/stock-transfers/new`, `/stock-transfers/[id]` | A | Sidebar, inventory links | Transfer queries/actions | Transfer read/create/workflow | Controlled stock transfer | 117–139 kB | Yes |
| `/stock-wastage`, `/stock-wastage/new`, `/stock-wastage/[id]` | A | Sidebar, inventory links | Wastage queries/actions | Wastage read/create/workflow | Controlled write-off | 117–139 kB | Yes |
| `/low-stock` | A | Sidebar, PR links | Low-stock view | `low_stock.view` | Procurement signal | 117 kB | Yes |
| `/opening-stock/import` | B | Onboarding links | Import preview/post | Stock create + company update | Controlled opening ledger | 124 kB | Yes |
| `/activity` | B | Sidebar/reports | Activity query | `reports.view` | Audit visibility | 117 kB | Yes |
| `/administration/imports`, `/imports/[entity]` | B | Sidebar/onboarding | Import preview/confirm | Import create + company update | Controlled data onboarding | 117–124 kB | Yes |
| `/data-onboarding` | B | Settings/quick tools | Readiness summary | Import/company update | Pilot setup support | 106 kB | Yes |
| `/documents`, `/documents/[id]` | B | Reports/search/module links | Document bundle/actions | Document view/workflow | Generic register; operational types redirect canonically | 116–119 kB | Yes |
| `/document-sequences`, `/document-sequences/new`, `/document-sequences/[id]` | B | Settings links | Sequence queries/actions | Settings/sequence manage | Numbering support | 106–117 kB | Yes |
| `/branches`, `/branches/new`, `/branches/[id]` | B | Sidebar/onboarding | Foundation queries/actions | Branch read/create/update | Organization master | 118 kB | Yes |
| `/locations`, `/locations/new`, `/locations/[id]` | B | Sidebar/onboarding | Foundation queries/actions | Location read/create/update | Ledger location master | 117–118 kB | Yes |
| `/company` | B | Sidebar/settings | Company query/actions | Company read/update | Company master | 120 kB | Yes |
| `/roles`, `/roles/new`, `/roles/[id]` | B | Sidebar | Permission queries/actions | Role read/create/update | Authorization administration | 117 kB | Yes |
| `/staffs`, `/staffs/new`, `/staffs/[id]` | B | Sidebar | Staff/permission queries/actions | Staff read/create/update | Staff administration | 118–119 kB | Yes |
| `/uom-conversions`, `/uom-conversions/new`, `/uom-conversions/[id]` | B | Onboarding/procurement links | Master-data queries/actions | UOM read/create/update | Recipe/purchasing support | 106 kB | Yes |
| `/reports` | B | Sidebar | Report directory links | `reports.view` | Operational reporting entry | 117 kB | Yes |
| `/settings`, `/settings/backups` | B | Settings/inbound | Settings and protected backup handler | `settings.manage` / owner | System administration | 106 kB | Yes |

Route handlers retained: `/auth/callback`, `/api/attachments/[id]`, `/api/backups/system`, `/api/export/[table]`, `/api/imports/confirm`, `/api/items/quick-create`, `/api/search`, `/stock-transactions/export`. Each has an active caller or auth/export workflow.

## Removed and redirected

| Type | Before | After | Reason |
|---|---:|---:|---|
| Page routes | 93 | 93 | No dead route proven; bookmark aliases retained |
| Route handlers | 8 | 8 | All have active callers |
| Duplicate PR create controls | 2 | 1 | Both submitted the same create-draft action |
| Supplier status surfaces | Active / Inactive / Archived | Active / Inactive | Archived was only an alias for inactive |
| Supplier filter scroll containers | 2 | 1 | Shared toolbar already owns responsive overflow |
| Physical Product delete paths | 1 | 0 | Replaced by permission-checked deactivate/restore |

## Destructive action matrix

| Record | Contract |
|---|---|
| Supplier, Item, Product | Visible outlined danger action; confirmation names the record and consequence; deactivate preserves references; restore remains available |
| Branch, Location | Archive/deactivate with confirmation; system-default location is explicitly protected |
| Staff | Deactivate with final-owner protection; permanent delete remains restricted to safe test-only records |
| Recipe | Archive status; no stock history deletion |
| PR, PO | Draft/workflow cancellation or rejection; linked/converted records retained |
| GRN, Return, Transfer, Count, Wastage, Production | Posted stock-impacting records remain ledger history; use existing Cancel/Reject/Correction paths where implemented, never physical delete |
| Supplier Invoice | Payment/document history retained; no physical-delete action exposed |

Shared confirmation behavior: outlined red entry, filled red final confirmation, explicit checkbox/word, Cancel focused by default, Escape closes, double submission blocked.

## Button and form contract

- Shared primary remains filled Seri Bako amber/brown.
- Search/Filter and current workflow submissions use primary.
- Back/export/view remain outlined; Reset/Cancel remain ghost.
- Shared destructive is outlined; only final confirmation overrides to filled red.
- `SubmitButton` now compares the native `SubmitEvent.submitter`; sibling controls cannot inherit its spinner.
- PR Create has one mutation control and one navigation-only Cancel link.

## Supplier layout and query

- Search grows with `min-width: 0`; status remains bounded; Filter and Clear are direct toolbar children.
- Mobile uses the shared two-row toolbar; table owns any unavoidable comparison scroll.
- Contact appears at `lg`, Phone at `md`, Email at `xl`, and Payment Terms at `lg`.
- Permanent list description removed; the empty state retains guidance.
- Database reads are filtered, sorted, counted, and ranged server-side to 15 rows instead of loading the full supplier table.

## Performance evidence

Production baseline was measured on 2026-07-15 against `https://seri-bako-oms-official.vercel.app` with authenticated Playwright navigation. These are full navigation-to-DOM-visual timings, not fabricated database timings.

| Route family | First | Warm | Observed TTFB range |
|---|---:|---:|---:|
| Dashboard | 3264 ms | 3458 ms | 2928–3116 ms |
| Procurement workspace | 4406 ms | 4235 ms | 3897–4085 ms |
| PR list/detail | 4912 / 5101 ms | 4419 / 4321 ms | 3981–4737 ms |
| PO list/detail | 4871 / 3923 ms | 4033 / 3874 ms | 3513–4530 ms |
| Supplier list/detail | 3841 / 4142 ms | 4882 / 4080 ms | 3552–4567 ms |
| Item list/detail | 4756 / 4129 ms | 4840 / 4121 ms | 3713–4495 ms |
| Staff list/detail | 4878 / 5055 ms | 3911 / 4766 ms | 3552–4490 ms |

Post-response visual completion was generally tens to a few hundred milliseconds. TTFB dominates, warm requests are not materially faster, and client rendering is not the primary bottleneck. Browser-visible navigation cannot split Vercel computation, Supabase database time, and their network leg; server phase logging is therefore opt-in rather than invented.

Code-side reductions:

- Supplier list: unbounded full table -> one bounded 15-row query.
- PR creation: location validation, item validation, and identity resolution run in parallel; line insert runs alongside linked-document creation; audit write runs alongside linkage update.
- Revalidation: five unconditional paths per mutation -> only caller-supplied affected paths.
- PR destination: route loading state added.

No post-deployment timings are reported: this sprint was explicitly not pushed or deployed. Local mock timings are not comparable to production and are not presented as an improvement. The repeatable performance spec is retained for the next controlled deployment.

## Build and bundle

| Metric | Before | After |
|---|---:|---:|
| Production build | 50.5 s | 51.7 s |
| Shared first-load JS | 102 kB | 102 kB |
| `/purchase-requests/new` | 124 kB | 124 kB |
| `/suppliers` | 118 kB | 118 kB |
| Lifecycle-enabled document detail | 119–120 kB | 121 kB |
| Middleware | 97.1 kB | 97.1 kB |

## Hosting diagnosis

- `vercel.json` does not pin a function region. Production returned `x-vercel-id: sin1::iad1::…`: the request entered through Singapore and the function executed in Washington, D.C. It was a cache miss (`age: 0`, `x-vercel-cache: MISS`) and exposed no `server-timing` header.
- The Supabase project reference is `nnvdsaftiwpqkekjfrgc`, but its physical region is not stored in the repository.
- Warm latency remains high, so Free-plan cold start is not a sufficient explanation.
- Current conclusion: **C — both contribute or may contribute**. Code/query fan-out is proven, and Vercel execution is proven remote from Malaysian users. Supabase alignment is unresolved, so changing the Vercel region remains blocked until the database region is confirmed. Vercel function logs, Supabase query plans/timings, connection/Supavisor metrics, project region, and pause/throttle evidence require provider telemetry and are not inferred.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings or errors.
- `git diff --check`: passed.
- Production build: passed; final measured build and bundle sizes are above.
- Focused Sprint 7.6 local contract: 2 passed, 2 skipped. PR pending ownership and supplier responsive overflow passed; lifecycle checks skipped because the mock database contains no suppliers.
- Production super-admin UI smoke: 1 passed in 2.5 minutes.
- Production performance baseline and header diagnosis: 2 passed in 2.7 minutes.
- Full local mock suite: 13 passed, 14 skipped, 42 failed. It is not a release signal: most tests require real authentication/data while mock mode bypasses auth and supplies empty fixtures, and the bounded development-server process later expired. It also exposed two pre-existing mock gaps (`getPurchaseReturns` and `getProductionJobFormOptions` create a real client in mock mode). The focused changed-path contract remained green.

## Remaining blockers

- Atomic PR header/document/line creation requires a database transaction/RPC not present through migration 054. Migration 055 was not added without deployment approval.
- Exact Supabase call counts are server-side and absent from browser traces.
- Create-PR before/after phase milliseconds require one controlled mutation with `SB_PERF_LOG=true` and a disposable record.
- Vercel/Supabase region, cold-start, connection, index-plan, and billing evidence require provider telemetry.
## Permanent deletion numbering

Permanent deletion never rewinds or reuses document sequences. Deleted identifiers remain consumed; number gaps are expected. `permanent_deletion_tombstones` preserves the deleted record type, identifier, and document number for auditability.
