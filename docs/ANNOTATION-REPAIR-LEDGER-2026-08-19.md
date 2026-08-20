# Annotation Repair Ledger — 2026-08-19

This is an evidence ledger, not a completion claim. A build, source inspection, or unauthenticated route load does not prove a responsive or role workflow is accepted.

Status vocabulary:

- `verified`: reproduced in the stated real viewport/role and passed the relevant interaction.
- `implemented / awaiting UAT`: source owner changed and static gates pass; visual or workflow acceptance is still required.
- `not verified`: no current evidence sufficient for acceptance.
- `blocked`: a named dependency prevents verification.

## Historical screenshot groups reconciled — v8.64.67

### v8.64.72 current annotation closure batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-10 | PR Requested Items has a visible row index plus total requested-item count, including unresolved lines. | implemented / awaiting Production viewport UAT | Desktop table adds a `#` column; compact layout labels each line as `Item N`; unresolved lines continue numbering after catalog lines. Source/test gates remain pending in this batch. |
| UI-0821-11 | Supplier/UOM and non-catalog mapping exceptions use the red danger semantic; retryable stock reads remain warning. | implemented / awaiting Production viewport UAT | Compact PR review mapping and non-catalog messages now use `--sb-danger`; the retryable stock-unavailable message remains `--sb-warning` by intent. |

### v8.64.71 current annotation closure batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-01 | PR detail shows an index/count for all requested items. | implemented / awaiting Production viewport UAT | Header now shows `Requested Items · N items` using catalog plus unresolved lines; source and local gates pending. |
| UI-0821-02 | Supplier-mapping CTN/UOM exceptions use the danger treatment and explain branch/UOM impact. | implemented / awaiting Production viewport UAT | New PR and guided recovery surfaces use shared danger tokens, direct cause, and a right-aligned mapping action. |
| UI-0821-03 | PR new supplier-selection error explains the mismatch and repair action. | implemented / awaiting authenticated mutation UAT | Server action now states the one-supplier rule and tells the operator to reselect a compatible supplier/item set; existing inline focus remains. |
| UI-0821-04 | Supplier duplicates use one canonical identity; AutoCount code is internal and Item Group is the visible label. | data-or-migration blocked | Import staging now separates `supplier_code` (AutoCount code) and `supplier_group` (Item Group). Migration 174 adds/backfills the column and keeps merge 173 recoverable. Linked migration application and Production row verification remain blocked by Supabase Management API login-role transport failure. |
| UI-0821-05 | PR list filter grammar is shared and balanced; Production Jobs has inward tablet gutters. | implemented / awaiting Production viewport UAT | PR list adopts the shared balanced filter authority; Production Jobs changes from full to contained tablet canvas. |
| UI-0821-06 | Stock Count portrait tablet search occupies its own row before filters/actions. | implemented / awaiting 820×1180 authenticated UAT | Shared filter class adds a portrait-query rule; no route-specific control markup was added. |
| UI-0821-07 | Desktop controls are 36px; tablet choice remains explicit. | implemented / awaiting Production viewport UAT; tablet decision awaiting user | Desktop (>=1280px) shared token is 36px. Tablet remains 44px touch-first for now. Recommendation: 36px visual control with a separate >=44px hit area is the mature ERP/accessibility compromise; apply after user accepts. |
| UI-0821-08 | Latest two Central Kitchen stock-take PDFs reconcile to OMS and naming includes kitchen brand visibility. | blocked by linked read-only Production data | Read-only extraction found 5 pages / 154 lines in `AUGUST - Copy of 1608.pdf` and 5 pages / 128 lines in `STOCK TAKE PJS10 CK - 19 Aug（副本）.pdf`; the first exposes 119 distinct item codes (5 absent from the local seed mirror), the second exposes 9 reliably parseable codes. Names visibly carry brand tokens such as CAP SAUH, BABAS, CHEK HUP, PENANG ANCHOR, and BRUGGEMAN, but the current Item Master has no structured brand field. This session lacks a valid authenticated Production tally query after the Supabase login-role transport failure, so no count, rename, or brand mapping was fabricated. |
| UI-0821-09 | PR supplier UOM follows supplier purchase UOM while internal calculations remain base/KG. | implemented in data contract / awaiting workflow UAT | Existing `supplier_items.purchase_uom` and `conversion_to_base_uom` remain the purchase-facing route; Stock Count/inventory ledger stays base-unit authoritative. UI now explains incompatible supplier UOM instead of silently treating it as a mapping. Controlled PO/GRN conversion workflow still needs authenticated fixture verification. |

### v8.64.70 Production follow-up annotations and supplier consolidation

| Acceptance | Status | Evidence |
|---|---|---|
| Exact duplicate live supplier names are merged without deleting commercial history. | data-or-migration blocked | Migration 173 selects one company-scoped canonical supplier, moves document/item/external-reference ownership, reconciles overlapping supplier-item and branch mappings by soft retirement, stores both pre-merge supplier snapshots in `supplier_merge_audit`, and adds a live normalized-name uniqueness guard. Local migrations 171–173 applied and a transaction-created duplicate fixture passed the merge/audit assertions before `ROLLBACK`. Linked Production remains unchanged: compatible CLI 2.115 currently fails at the Supabase Management API `login-role` call with `LegacyDbConfigLoginRoleNetworkError / TransportError`, and the saved pooler URL requires a database password that is not available in this session. |
| PR Review and apply no longer rejects a valid Supabase `updated_at` offset as `Invalid input`. | implemented / awaiting authenticated mutation UAT | The action now accepts ISO datetime offsets before invoking the recoverable migration-170 RPC. A real line mutation must pass after deployment before this becomes verified. |
| Requested Items combines Qty and UOM so Supplier retains usable width. | implemented / awaiting Production viewport UAT | Desktop table uses one `Qty / UOM` header and one compact value cell; phone presentation was already combined. |
| Guided review dialog is narrower without losing the complete workflow. | implemented / awaiting Production viewport UAT | Desktop cap changes from 72rem to 60rem while retaining the viewport-bound `calc(100vw - 2rem)` rule and scrollable body/footer. |
| Dashboard Low stock uses the critical exception color rather than yellow warning. | implemented / awaiting Production viewport UAT | Low stock explicitly requests the shared critical/danger semantic token; unavailable data remains warning-colored. |

### v8.64.69 AutoCount Production identity recovery

| Acceptance | Status | Evidence |
|---|---|---|
| Production Confirm for job `620fbc6a-0ad1-4f26-aa43-d38987251d8b` exposes and resolves its real blocker without duplicate master data. | verified complete | First authorized Confirm failed atomically with PostgreSQL `23505`: supplier `5e868b4f-afa7-42bf-8563-daabb090df86` and supplier item code `FROMPNG00011` already existed. Read-only evidence showed the active mapping referenced soft-deleted item `f6a84f5f-85aa-45d0-9312-a3d8488c20e9`; staged row 520 matched code, name `Anchor unsalted Butter`, and UOM `KG` exactly. Job-specific migration 172 restored that proven identity and remote history reports `172/172`. The authorized retry persisted `completed` at `2026-08-21T01:22:47.776199+08:00`: 424 items created, 305 updated, 28 suppliers created, 26 updated, 507 supplier items created, 418 branch mappings created, 0 UOM conversions, and **0 inventory movements**. Blocking issues remained empty. |

The user re-supplied three annotation galleries containing 17, 34, and 13 comments. The original task record was reread to recover comment text, route, viewport, selector, and screenshot context. A thumbnail, source file, or previous passing test is not treated as current Production verification.

| Recovered group | Reconciliation status | Remaining or current evidence |
|---|---|---|
| 17-comment group: PR list/filter/table density, Dashboard duplication/colors, PR create sourcing/actions, reject dialog/order, Outlet export/layout/table | mixed: accepted regression locks retained; remaining Production UAT incomplete | PR list layout remains untouched because the user explicitly accepted the later repair. Shared filter/table authorities, 10px headers, Dashboard de-duplication, bottom Add line, one-supplier PR sourcing, and Outlet responsive analytics have local contract/UAT evidence. Production recheck and full Outlet export mutation flow remain open. |
| 34-comment group: Outlet chart/topbar/actions, Branch tablet/table, AP Aging/PO/Recipe alignment, PR/Stock Balance/Supplier Items tables, role/login/right-rail issues | mixed: mostly implemented or locally verified; workflow/data gates remain | Four-viewport register audit previously passed for the named 20 registers. v8.64.67 additionally groups Stock Balance values and Stock Count identity/submitter. Supplier Items update, login, role transitions, and data reconciliation require authenticated workflow evidence rather than geometry alone. |
| 13-comment group from 2026-08-20 | see the itemised UI-0820 table below | Seven focused authenticated checks passed locally; comments clipping, cross-dialog sampling, linked migrations, and Production remain explicitly open. |

### v8.64.67 newly closed source gaps

| Acceptance | Status | Evidence |
|---|---|---|
| Outlet wastage details retract and stale validation values clear when wastage returns to zero. | verified locally / production awaiting UAT | Authenticated browser interaction changed wastage 1 → reason selected → 0 and confirmed details retract and stale values clear. |
| Stock Balance shows Available+Reserved and Avg Cost+Value as compact paired fields without duplicate columns. | verified locally / production awaiting UAT | Shared table and operational-row owner updated; authenticated geometry/content checks passed at all four required viewports. |
| Stock Count shows SC number and submitter in one field. | verified locally / production awaiting UAT | Register header and row grammar updated; authenticated geometry/content checks passed at all four required viewports. |
| Supplier lifecycle destructive controls are hidden without supplier update permission. | implemented / awaiting role UAT | Server-rendered permission check gates lifecycle panel and Save action; contract added. |

### Data and cost evidence added in v8.64.67

| Acceptance | Status | Evidence |
|---|---|---|
| 19 Aug Outlet Daily wastage and percentage are real, not fabricated or directly edited. | verified against read-only local cloud-data mirror / production awaiting UAT | Tenant-safe read-only query found 51 verified lines per outlet and zero unverified lines. TRX is legitimately 100% because received=40 and wastage=40. Other totals: Gurney 196/122 (62.2449%), IOI Puchong 126/54.5 (43.2540%), Jakel 108/86 (79.6296%), Mid Valley 242/28 (11.5702%), Publika 140/84.1 (60.0714%), Queensbay 219/115.2 (52.6027%), Sunway Velocity 125/0 (0%). No data was changed. |
| PR estimated cost does not overwrite master or actual inventory cost. | verified by source/SQL contract / production awaiting UAT | PR revisions write only `purchase_request_lines.estimated_unit_cost`; no item-master write is present. |
| Actual purchasing cost becomes operational only after controlled GRN posting. | verified by source/SQL contract / production awaiting UAT | `post_goods_receiving_atomic` posts each accepted line through `insert_inventory_movement(... line.unit_cost ...)`; inventory average cost is computed from posted inbound ledger purchase cost. |
| AutoCount does not overwrite existing item cost. | implemented / awaiting migration UAT | Migration 171 now seeds standard cost only when creating a new item; updates to existing items preserve their controlled master cost. A SQL source contract protects this boundary. Linked remote migration remains blocked, so no remote claim is made. |

## Latest production annotations — v8.64.66

These rows reconcile the 13 comments captured from `system.seribako.com.my` on 2026-08-20. `Implemented / awaiting UAT` means the source owner and contract were updated; it does not mean Production changed or passed.

| ID | Production annotation / acceptance | Status | Current evidence |
|---|---|---|---|
| UI-0820-01 | Dashboard Workspace Updates unread badge returns to red; Manager, Purchasing, and Finance workflow states keep their own semantic colors. | verified locally / production awaiting UAT | Authenticated 1440×900 browser check confirmed the unread badge computes to `rgb(180, 35, 24)`; workflow-state token ownership remains unchanged. Production recheck pending. |
| UI-0820-02 | Imports overview AutoCount Direct Import directory surface has the canonical rounded panel. | verified locally / production awaiting UAT | Authenticated 1440×900 browser geometry confirmed a non-zero canonical panel radius and no page overflow. Production recheck pending. |
| UI-0820-03 | AutoCount staging error appears in the right panel. | implemented / awaiting UAT | AutoCount rail renders `Import error` after Actions and before status. Live staging-unavailable reproduction pending. |
| UI-0820-04 | AutoCount keeps the right panel at 820×1180 portrait tablet. | verified locally / production awaiting UAT | Authenticated 820×1180 browser geometry confirmed the visible rail, Actions before Import status, rail width >=180px, and no page overflow. |
| UI-0820-05 | PR detail Comments remains fully scrollable and its lower content is not clipped. | verified locally / production awaiting UAT | Authenticated 820×1180 browser check scrolled the portrait rail to the Comments textarea and lower Add comment action; both remained visible, the section did not use hidden vertical overflow, and the page had no horizontal overflow. Comment mutation was not performed. |
| UI-0820-06 | Guided PR review presents Quantity and UOM as one compact field group. | verified locally / production awaiting UAT | Authenticated guided-review browser check found one visible `Quantity / UOM` group. Mutation submission remains outside this geometry probe. |
| UI-0820-07 | Create supplier mapping sits beside the `Needs supplier setup` guidance. | verified locally / production awaiting UAT | Authenticated guided-review browser check confirmed the mapping link is visible in the Supplier guidance row. Navigation/mutation remains pending. |
| UI-0820-08 | Guided PR review offers real supplier choices, not only `Needs supplier setup`. | verified locally / production awaiting UAT | Authenticated cloud-data mirror check confirmed the real supplier catalogue is non-empty and the selector contains options beyond `Needs supplier setup`. Production data recheck pending. |
| UI-0820-09 | Guided PR review dialog uses a complete large working area. | verified locally at desktop and portrait tablet / phone and landscape tablet awaiting UAT | Authenticated checks confirmed width >900px at 1440×900 and >700px at 820×1180, bounded inside the viewport with the final Apply action visible. |
| UI-0820-10 | All dialog/filter backdrops use a black translucent overlay, not green. | verified for guided PR and Filter More samples / production awaiting UAT | Native guided dialog computed backdrop is `rgba(0, 0, 0, 0.6)` at 820×1180 and 1440×900; shared Filter More overlay sampling also passed. Remaining uncommon dialogs are not claimed page-by-page. |
| UI-0820-11 | Buttons, filters, and textboxes use a shared 36px visual height on tablet/desktop while phone stays touch-first. | verified for PR/PO sample / wider route UAT incomplete | Authenticated PR/PO checks passed at 390×844 (48px) and 820×1180, 1180×820, 1440×900 (36px), without page overflow. Full route sampling remains open. |
| UI-0820-12 | PO new has no unexplained 44px chevron/disclosure control. | verified locally / production awaiting UAT | Authenticated PO-new checks at all four required viewports found no disclosure/chevron control and no page overflow. |
| UI-0820-13 | PR new Request details and Requested Items use one section/header language. | verified locally / production awaiting UAT | Authenticated PR-new checks at all four required viewports confirmed matching computed header backgrounds and stable control geometry. |

### Data, workflow, and production gates retained

| Gate | Status | Evidence / blocker |
|---|---|---|
| Migration 170 linked remote state | verified complete | Compatible CLI 2.115.0 connected to confirmed project `nnvdsaftiwpqkekjfrgc` (`Seri Bako Project`) and reported local/remote `170/170`. The earlier failure was isolated to repository CLI 2.109.1. |
| Real guided PR repair | verified read-only / mutation UAT incomplete | Authenticated remote Super Admin opened the real guided review surface, real supplier choices, quantity/UOM group, mapping entry point, and complete dialog at desktop and 820px. Applying a line mutation still requires a named disposable PR fixture and is not claimed. |
| AutoCount Preview → validation → Confirm | verified on disposable local cloud-data mirror / remote blocked | Authenticated probe proved file/row/actionable validation, ready preview, one Confirm, and `inventoryMovementsCreated: 0`. It first exposed migration 169's uninitialised-branch/premature supplier-item checks; migration 171 repairs the function and the probe then passed. Linked remote migration state and Production confirmation remain unverified. |
| Migration 171 AutoCount Confirm repair | verified deployed / full remote Confirm UAT incomplete | CLI 2.115.0 dry-run proved 171 was the sole pending migration; it was then applied to confirmed project `nnvdsaftiwpqkekjfrgc`, and a second migration list reported `171/171`. Authenticated remote RPC execution reached the new function and returned expected `P0002 AutoCount import job was not found` for a nonexistent disposable UUID, proving permission/function reachability without writing data. A real staged job Confirm remains unclaimed pending a recoverable fixture. |
| Production regression / release | implemented app not deployed / authenticated linked-data UAT passed | The v8.64.68 local app connected to the real linked Supabase and passed nine authenticated read-only annotation checks. This does not prove the current Production deployment contains v8.64.68; deployment and post-deployment verification remain open. |

Current v8.64.68 gates: strict TypeScript passed; lint passed; 799/799 contracts passed; production build generated 79/79 pages. The linked migration history is aligned through 171. The local app connected to the real linked Supabase and passed 9/9 authenticated read-only annotation checks; the remote AutoCount RPC also passed a non-mutating reachability/permission probe. Earlier local register/form suites remain green. The application itself is not deployed at v8.64.68, and a real AutoCount staged-job Confirm is still intentionally unclaimed because no recoverable Production fixture has been authorised. These boundaries prevent local or linked-data evidence from being mislabeled as deployed Production verification.

## Shared closure pass — v8.64.65

This pass addresses the repeated cross-page root causes identified across the annotation history; it is deliberately narrower than a claim that every authenticated workflow is complete.

| Root cause | Implementation evidence | Verification |
|---|---|---|
| Tablet filter bars created blank tracks or inconsistent control widths | `UnifiedListHeader` now derives tablet tracks from query controls and command groups, rather than child-count arithmetic that included the search control twice. | 793/793 contract tests, strict typecheck, lint, and production build passed. |
| Portrait tablet split workspaces hid the action/context rail | Shared `[data-tablet-document-split]` rule keeps the medium-tablet rail visible with a compact `minmax(13rem, 28%)` rail. | Contract suite passed; real authenticated four-viewport UAT remains required for each affected route. |
| Table header typography drifted between registers | Shared `Table` emits `data-ui-table="true"`; v2 table authority sets the first header row to 10px with a shared line-height. | Contract suite and build passed; visual sampling remains required for tables that bypass the shared component. |
| Production Jobs used a route-specific filter variant | Production Jobs now uses the shared query grammar. | Contract suite and build passed. |
| Release evidence/version drift | Footer/package/docs version updated to `8.64.65`; this ledger records the distinction between implementation evidence and UAT evidence. | `npm test`, `npm run typecheck:strict`, `npm run lint`, and `npm run build` passed locally. |

The remaining rows below are intentionally retained as open gates. They require authenticated role transitions, real Supabase data, mutation fixtures, or viewport screenshots; they cannot be closed by static CSS or a successful build alone.

## Reopened defects from user UAT

| ID | Acceptance criterion | Status |
|---|---|---|
| UI-0819-R1 | Dashboard does not duplicate the same pending approval queue in the page and Workspace Updates. | verified at 1180×820 as Super Admin: the page retains `Actions awaiting you`; Workspace Updates contains no `MY PENDING ACTIONS` section. |
| UI-0819-R2 | Outlet wastage chart fills its assigned analytical column on desktop and portrait tablet. | verified at 820×1180: rendered SVG width is at least 90% of its analytical panel. |
| UI-0819-R3 | Outlet Daily Records shows the right action/context rail at 820×1180. | verified at 820×1180: the rail is visible, at least 180px wide, and positioned beside the primary workspace. |
| UI-0819-R4 | Staff register content does not collide or overflow. | verified at 1440×900 plus the four-viewport register audit: grouped Staff, Assignment, and Status columns render without page overflow. |

## Outstanding acceptance scope

| Scope | Current evidence status |
|---|---|
| Key list pages at phone, portrait tablet, landscape tablet, and desktop | verified for 20 registers at 390×844, 820×1180, 1180×820, and 1440×900: Branches, GRN, Items, Outlet Daily, Products, PO, PR, Recipes, Roles, Staff, Stock Balance/Card/Counts/Transfers/Wastage, Supplier Invoices/Aging/Items/Suppliers, and UOM Conversions |
| Supplier Items and remaining register table width, clipping, density | Supplier Items is verified by the four-viewport geometry audit; routes outside the named 20-register matrix remain unverified page-by-page |
| PR creation: one supplier per PR, supplier-filtered items, UOM, Add line, new item request | supplier-scoped selection, UOM mapping, top/bottom Add line, and lossless unmatched-description contracts verified; authenticated invalid supplier/item guidance verified without creating a record; final valid submission and downstream new-item completion remain unverified |
| PR review permissions: Kitchen, Manager, Purchasing, Finance | verified for read-only workspace and action-leakage safety across six accounts; the state-changing Manager → Purchasing → Finance transition sequence still lacks a disposable fixture and is not claimed |
| Outlet Daily export, inline validation, and complete status transitions | implemented in part / full authenticated workflow not verified |
| Unified Item, Supplier, and Branch creation/maintenance | not verified end-to-end |
| Dashboard state colors and role-specific presentation | not verified across roles |
| All form errors scroll, focus, highlight, and explain inline | PR supplier/item validation verified at 1180×820; Outlet Daily line validation is implemented; remaining forms are not yet verified form-by-form |
| Supplier duplicates and supplier-code authority | pending data reconciliation; no cloud mutation in this UI batch |
| Migration state, real Supabase data, and production regression | not verified in this UI batch |
| AP Aging, Recipe, and Purchase Order alignment/workflow details | implemented in part / viewport and workflow UAT pending |

## Release gates for this repair batch

1. Historical TypeScript gate: passed on v8.64.64 after the PR validation and verification-infrastructure changes; the current v8.64.65 strict gate is recorded in the shared closure pass above.
2. Targeted contracts: 15/15 PR sourcing/lossless-entry/role contracts passed; the authenticated PR field-guidance browser contract passed against the cloud-connected localhost without creating a record. The reopened-annotation suite is now 4/4, and the safe read-only role workspace matrix is 6/6 for Super Admin, Finance, Manager, Purchasing, Kitchen, and Outlet. Earlier evidence remains 30/30 unit contracts and 5/6 P0 browser contracts; one fixture-dependent case was skipped and remains unverified.
3. Authenticated register browser UAT: 20 routes × 390×844, 820×1180, 1180×820, and 1440×900 passed (80 route/viewport checks).
4. Cloud migration/data verification: intentionally not claimed by this UI-only repair.
5. Historical production build: v8.64.64 passed across all 76 routes after the latest field-guidance and verification-infrastructure changes; the current v8.64.65 build passed locally and is recorded above.
6. Localhost:3001: restarted outside the restricted runtime and authenticated Dashboard verification passed against the configured cloud Supabase environment.
