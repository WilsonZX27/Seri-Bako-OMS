# Seri Bako OMS — Strict System and SOP Audit

Audit date: 2026-07-23 (Asia/Kuala_Lumpur)  
Mode: static implementation audit, local build/test evidence, and route/SOP inventory.  
Scope: every checked-in `page.tsx` route, shared UI system, server-action boundaries, route authorization, core operational workflows, test gate, dependency surface, and legacy/compatibility paths.

This is an engineering audit, not a claim that production data was inspected. It intentionally does not run the default Playwright suite because its configured fallback target is the deployed Vercel application and several scenarios mutate business data.

## Executive verdict

The current system is substantially safer than the 2026-07-22 baseline: tenant-boundary migrations, inventory posting RPCs, concurrency work, document-number controls, backup scoping, branch-level inventory read models, and contract coverage have been added. The repository builds and 196 contract tests currently pass.

The core inventory system is now operationally simplified and database-owned. The remaining work is deliberately non-critical: compatibility-route ownership, mock-mode retirement, a small amount of visual-token drift, and isolated-environment integration verification.

### Remediation completed during this audit

- `/activity` now has its own `dashboard.view` gate, matching its all-role navigation entry.
- Migration `092_stock_operation_terminal_transition_atomicity.sql` makes unposted transfer and wastage cancellation/rejection locked, permission-gated, branch-scoped and atomic with the linked document, revision and activity log. It forbids terminal relabelling once posting has occurred.
- Mutation-capable Playwright runs are fail-closed without an explicit isolated target; a remote target additionally requires `ALLOW_REMOTE_E2E=1`.
- The mobile shared control token is now 44px and keeps the 36px compact desktop/tablet token from `sm` upward.
- Release/reset documentation now uses migration ceiling 092. The four unused direct dependencies were removed after a build check.
- Migration `093_branch_level_inventory_read_models.sql` moves ledger, balance, valuation, low-stock, and stock-count list filtering/paging to branch-level database read models.
- Shared UI feedback now uses semantic success, warning, danger, info, and neutral tokens across authentication, priority, workspace, destructive-action, and KPI entry points. Commit `6a8004f` is deployed to production.
- The retired Location administration/onboarding path and the superseded application-level inventory engine were removed after confirming no active imports; branch-level inventory remains the supported operating model.
- Migrations `094`–`098` make Transfer/Wastage, GRN, Production Job and Purchase Return creation retry-safe database aggregates, and make their critical terminal transitions update the linked document history atomically.

The migration and code changes above passed a full local database reset through migration 098, 197 contract tests, typecheck, lint and an optimized production build. Production data and a production-mutating browser suite were not used.

## Coverage inventory

| Route classification | Count | Audit treatment |
|---|---:|---|
| Workspace/List pages | 53 | Reviewed for shell, filter, table/list, empty state, primary action, route gate and responsive pattern |
| Document/Form pages | 30 | Reviewed for workflow action placement, form ownership, mutation boundary and state progression |
| Compatibility or redirect pages | 20 | Reviewed as retained aliases; no redirect should grow separate business behavior |
| Specialized hub/entry pages | 4 | Reviewed for navigation and shared-shell integration |
| Authentication and entry pages | 3 direct pages plus redirect states | Reviewed for terminal routing and staff-state separation |
| **Total `page.tsx` files** | **110** | **All classified** |

Canonical functional areas covered by the route inventory are: authentication and setup; dashboard/activity; administration/company/branches/staff/roles/numbering/backups/imports; suppliers/items/UOMs/products/recipes; purchase requests/orders/receiving/returns/invoices; stock balance/card/ledger/count/transfer/wastage/opening stock; production jobs; outlet daily records; reports and operational analysis.

The 20 redirect routes are compatibility surfaces, including locations, settings, stock-balances, legacy procurement paths, legacy roles pages, and onboarding aliases. They are deliberately small today, but must remain an allowlisted compatibility layer instead of becoming parallel feature implementations.

## SOP workflow review

| Workflow | Expected SOP boundary | Current implementation assessment | Verdict |
|---|---|---|---|
| Staff onboarding and identity | Active staff link before operational access; setup/change-password is terminal | Current route resolver and temporary-password handoff are materially improved; service-role paths derive an active actor before company writes | Pass with regression coverage required |
| Master data | Company-owned, soft-archived, auditable | Server actions generally derive actor company before service-role writes | Pass, but duplicated admin action code remains |
| PR → PO → GRN | State-specific authority and atomic create/post behavior | PR/PO creation and key transitions have dedicated atomic RPCs; UI and route gates are consistent in the main path | Pass for core path |
| Purchase return / supplier invoice | Posted GRN lineage; no inventory mutation from invoicing | Return creation, cancellation and posting are database-owned; invoicing remains non-inventory | Pass for stated scope |
| Stock count | Branch seed → physical count → review → approve → atomic post | Posting uses dedicated RPCs; branch-switch client state issue was fixed in commit `cec0cdc` | Pass for posting path |
| Transfer / wastage | Draft lifecycle; posted movement must never be relabelled cancelled/rejected | Migration 092 provides locked terminal-transition RPCs; parent, document, revision and activity update in the same transaction | Pass |
| Production | Approved job → atomic input/output posting | Creation plus submit/approve/reject/cancel and posting are database-owned, locked operations | Pass for stated scope |
| Manual stock movement / opening stock | Explicit source, ledger traceability, no partial records | Inventory RPCs are stronger than baseline; remaining manual/document composition needs fault-injection verification | P2 verification required |
| Backup / export | Owner-only, same-company content, no source-workspace artifact retention | Company-scoped export and retention policy are present; production historical impact was not queried | Pass code path; operational verification deferred |
| Imports | Validation before controlled write; no duplicate/partial import | Shared import workflow exists; local safe integration test gate should be made explicit | P2 release-process gap |

## UI and engineering health score

| Dimension | Score | Evidence-based finding |
|---|---:|---|
| Accessibility | 3/4 | Shared focus ring, semantic controls and many ARIA labels exist; isolated browser-flow verification remains outstanding. |
| Performance | 3/4 | Server rendering, shared components and database-side inventory read models are in place; real-volume measurement follows data import. |
| Responsive design | 3/4 | Workspace/List and Document shells share mobile controls and responsive surfaces; isolated browser-flow verification remains outstanding. |
| Theming | 3/4 | Semantic feedback tokens and operational 2px panels are standardized; 18 remaining direct colors are mostly intentional badges, input borders and text hierarchy. |
| Anti-pattern resistance | 3/4 | The product does not exhibit generic AI hero/gradient/card-grid design. Main issue is component drift, not decorative excess. |
| **Total** | **16/20** | **Production-ready operational foundation; remaining work is controlled refinement and isolated-environment verification.** |

### Anti-pattern verdict

Pass for visual intent: the shared operational shell, dense data views, restrained palette and real workflows are appropriate for an OMS. Fail for system discipline: several pages still use `rounded-lg`, direct `red/emerald/amber/slate` classes and one-off success/error panels despite a declared 0–2px control and 4px panel system. This creates a product that looks mostly coherent until users move between modules.

## Prioritized findings

### P1 — Activity entry and route authorization disagree

**Status: fixed in this audit; protected by `sop-consolidation-contract.test.js`.**

- **Location:** `src/lib/information-architecture.ts`, `src/server/auth/route-permissions.ts`.
- **Evidence:** Activity is visible to all six roles with `dashboard.view`, while middleware resolves `/activity` through `reports.view`. Outlet Staff can see the navigation entry yet be redirected away.
- **Impact:** A valid operational audit trail appears broken for the frontline role.
- **Required correction:** Give `/activity` an explicit `dashboard.view` route permission, matching the information architecture and role scope. Add a route-contract regression test.

### P1 — Transfer and wastage cancellation/rejection remain split from document state

**Status: fixed in migration 092 and deployed to the linked remote database.**

- **Location:** `src/server/actions/stock-operations.ts`.
- **Evidence:** `cancelStockWastage` and `rejectStockWastage` directly update the business row; transfer status handling separately updates transfer, document and activity records. Neither path uses one state-conditional database operation.
- **Impact:** A posted or racing record can acquire a misleading terminal label, while the ledger effect remains. This violates the SOP rule that history is corrected by controlled reversal, not relabelled.
- **Required correction:** One locked database transition/reversal contract per transfer and wastage action; forbid cancellation/rejection after any posting effect; update document, revision and activity within the same transaction.

### P1 — E2E default target is a deployed application

**Status: fixed in this audit; browser tests now fail closed without an explicit isolated target.**

- **Location:** `playwright.config.js`.
- **Evidence:** `TEST_BASE_URL` falls back to `https://seri-bako-oms-official.vercel.app`; many E2E specs mutate data.
- **Impact:** A developer or CI command can perform test actions against production unintentionally. This also explains why the default `npm test` gate excludes E2E.
- **Required correction:** Make mutation-capable E2E require an explicit local/disposable target and a fixture-reset contract. Keep production smoke read-only and separately named.

### P1 — Mobile interaction size conflicts with the approved design contract

**Status: fixed in this audit through the shared mobile control token.**

- **Location:** `src/app/globals.css`.
- **Evidence:** `--sb-control-height` is 2.5rem (40px) before the `sm` breakpoint; the product contract requires 44px mobile controls.
- **Impact:** Repeated operational entry on phones is harder and falls below the stated touch-target standard.
- **Required correction:** Set the mobile token to 44px, retain 36px from `sm`, then remove local `h-8`/`h-9` mobile overrides where they affect primary interaction.

### P2 — Inventory and count lists use application-memory pagination

- **Location:** `src/server/queries/inventory.ts`, `src/server/queries/stock-counts.ts`, `src/server/queries/production-jobs.ts`.
- **Evidence:** Several high-use queries fetch complete `stock_ledger_view`, `stock_balances_view`, `stock_counts`, related lines or `production_jobs`, then filter/sort/paginate in JavaScript.
- **Impact:** It is acceptable for pilot-sized data but will become slow and memory-heavy after real imports and daily ledger growth.
- **Required correction:** Push branch/search/status filters, order and range/count into SQL/Supabase; aggregate count metadata in a query/RPC instead of loading every child line.

### P2 — Document lifecycle implementation is duplicated and partially non-atomic

**Status: core inventory aggregates fixed through migrations 094–098; remaining work is non-inventory cleanup.**

- **Location:** `src/server/actions/stock-operations.ts`, `stock-counts.ts`, `goods-receivings.ts`, `purchase-returns.ts`, `production-jobs.ts`, `recipes.ts`.
- **Evidence:** Multiple module-local `createDoc`/`createLinkedDocument`/document status helpers compose parent, document, lines and activity through sequential requests.
- **Impact:** More code paths to review, inconsistent recovery behavior, and a larger surface for orphan records.
- **Required correction:** Keep one explicit domain RPC per aggregate creation/transition; move common document revision/activity behavior into database-owned helpers. Do not introduce a generic application “transaction helper”.

### P2 — UI token and radius drift is systemic

**Status: substantially fixed in the UI consolidation pass.**

- **Location:** 18 direct semantic color-class occurrences and two intentional `rounded-lg`/larger identity-surface references across `src/app` and `src/components`.
- **Impact:** Status colors, panel density and visual affordances vary by page; future UI changes require hunting local class overrides.
- **Required correction:** Replace state colors with `--sb-success`, `--sb-warning`, `--sb-danger`, `--sb-info`, neutral tokens; normalize operational panels to `rounded-[2px]` or shared primitives. Preserve pill badges only where status/chips require them.

### P2 — Mock and compatibility branches add a large inactive code surface

- **Location:** `src/lib/mock-mode.ts` plus query/action branches; 20 compatibility redirects.
- **Evidence:** Mock arrays are empty, while many queries/actions retain mock-mode branches. Compatibility redirects are appropriate but have no declared retirement inventory.
- **Impact:** Every behavior change must reason about an unused alternate path; test and maintenance cost rises without operational value.
- **Required correction:** First prove whether mock mode is still a supported developer workflow. If not, remove it in one tested cleanup PR. Keep redirect pages, but document an allowlist, owner and expiry/review date.

### P2 — Observability is not consistently structured or redacted

**Status: substantially fixed for common operational failure paths.**

- **Location:** A smaller set of specialised API routes and compensating cleanup paths still use direct `console.error`/`console.warn` calls.
- **Impact:** Log fields and secret-redaction guarantees vary by path, making incident review harder.
- **Required correction:** Route server failures through `src/server/observability/logger.ts`; retain short user-safe messages and structured server context.

### P2 — Migration and release ceiling documentation is stale

**Status: fixed in this audit; the published reset ceiling is 093, matching the deployed schema.**

- **Location:** `README.md`, `PRODUCT.md`, `ARCHITECTURE.md`.
- **Evidence:** These previously claimed migration 090 while newer migrations were checked in and deployed.
- **Impact:** Reset/runbook decisions can be made against the wrong schema baseline.
- **Required correction:** Update all authoritative release-baseline references to 093 and add a contract assertion for the documented ceiling.

### P3 — Unused direct dependencies

**Status: fixed in this audit after import, type and production-build verification.**

- **Location:** `package.json`.
- **Evidence:** No repository imports were found for `react-hook-form`, `@hookform/resolvers`, `@radix-ui/react-label`, or `@vercel/speed-insights`.
- **Impact:** Small dependency/install/audit surface increase.
- **Required correction:** Remove only after a lockfile/build verification; retain a dependency if it is intentionally imported by generated or deployment-only code.

## Positive controls to preserve

- The shared Workspace/List and Document shell pattern is the right basis for simplification.
- Tenant actor derivation occurs before service-role administration writes in reviewed foundation paths.
- The current inventory posting RPCs, concurrency controls and document-number rules are much stronger than the previous baseline.
- The route resolver keeps authentication, invitation, password-change and inactive-user states distinct.
- The static Impeccable detector found no deterministic visual anti-pattern hits.
- The repository has a meaningful contract suite (197 passing tests), and the production build currently succeeds.

## Consolidation sequence

1. **P1 SOP hardening:** Activity route consistency, safe E2E targeting, transfer/wastage state machine.
2. **P1 mobile baseline:** repair the 44px mobile touch token and audit localized compact controls.
3. **P2 aggregate consolidation:** replace sequential document/header/line creation with domain RPCs; then remove duplicated helpers.
4. **P2 list performance:** database-side paging/filtering for inventory, count and production queries.
5. **P2 UI normalization:** migrate arbitrary colors/radii to shared tokens and primitives, module by module.
6. **P2 source reduction:** decide mock-mode support, inventory redirects, remove approved unused dependencies, and consolidate logs.
7. **Final verification:** local disposable E2E workflow suite, typecheck, lint, contract suite, build, then a fresh audit.

## Verification boundary

Not performed in this audit: production data inspection, a production-mutating E2E run, or an external security scan. Those are separate activities and must not be conflated with the code evidence above.
