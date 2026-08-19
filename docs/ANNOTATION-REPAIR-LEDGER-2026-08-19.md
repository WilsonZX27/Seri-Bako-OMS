# Annotation Repair Ledger — 2026-08-19

This is an evidence ledger, not a completion claim. A build, source inspection, or unauthenticated route load does not prove a responsive or role workflow is accepted.

Status vocabulary:

- `verified`: reproduced in the stated real viewport/role and passed the relevant interaction.
- `implemented / awaiting UAT`: source owner changed and static gates pass; visual or workflow acceptance is still required.
- `not verified`: no current evidence sufficient for acceptance.
- `blocked`: a named dependency prevents verification.

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
