# Seri Bako OMS — Final UI/UX Audit Ledger

This is the working ledger for the final close-out. Every browser comment must have a source-level fix, a runtime check, and a responsive check before it is marked done.

## Verification rules

- Breakpoints: 390x852, 820x1180 portrait tablet, 1180x820 landscape tablet, and 1440x900 desktop.
- Shared behavior belongs in shared components or `src/app/design-system-v2.css`; do not add route-specific cascade overrides for shared controls.
- Preserve Supabase/RLS, server actions, ledger authority, and existing business state transitions.
- Every submit/action must show pending state and must not create duplicate action rails at tablet widths.
- A data-empty state is only valid after checking the query, permissions, and read-model freshness.

## Current comment matrix

| ID | Route / surface | Finding | Owner | Status |
|---:|---|---|---|---|
| 1 | Purchase Requests / new | Quantity stepper has awkward rounded segments | Shared QuantityStepper | Verified in production browser at 390x852 |
| 2 | Purchase Requests / new | Item, quantity, and UOM line wastes mobile height | Procurement form | Verified in production browser at 390x852 |
| 3 | Stock Balance | UOM should be changeable from the basket row | Stock balance basket | Verified in production browser at 390x852; native UOM select present |
| 4 | Stock Balance | Quantity input is not centered | Shared QuantityStepper | Verified in production browser at 390x852 |
| 5 | Stock Balance | Basket rows are too tall for large selections | Stock balance basket | Verified in production browser at 390x852; compact row and bottom rail spacing |
| 6 | Low Stock | Mobile Filter/records surface is broken | Low Stock + shared header | Verified in production browser at 390x852; fixed bottom sheet covers content/nav |
| 7 | Low Stock | Low-stock data disappeared | Inventory read path | Verified in production browser: 24 records via canonical-view fallback |
| 8 | Stock Transfers / new | Setup card feels structurally wrong | Stock operation form | Verified in production browser at 390x852 and 820x1180 |
| 9 | Stock Transfers / new | Nested card inside setup card | Stock operation form | Verified in production browser: setup and lines are sibling surfaces |
| 10 | Stock Transfers / new | Tablet duplicates the primary action in bottom rail | Document workspace/action rail | Verified in production browser at 820x1180; right rail only |
| 11 | Stock Transfers / new | Mobile action button sizing/spacing is inconsistent | Shared action rail | Verified in production browser at 390x852; inset action with bottom spacing |
| 12 | Purchase Returns / new | Mobile setup fields are misaligned | Purchase return form | Verified in production browser at 390x852 |
| 13 | Purchase Returns / new | Portrait tablet was not checked | Responsive verification | Verified in production browser at 820x1180 |
| 14 | Stock Balance | Tablet should use a true two-column workspace | WorkspaceGrid / page | Verified in production browser at 1180x820; right summary rail visible |

## Reliable Outlet Daily reads and Stock Count density pass — 2026-08-16

- Outlet Daily receiving totals now reject both `unavailable` and `legacy_unverified` line provenance, including stale estimates that must not be presented as confirmed receipt. The list, detail, trend, defaults, and today summary therefore share one fail-closed rule.
- Stock Count mobile entry is covered as a deliberate two-column card: identity and variance remain visible together, with the compact +/- quantity control below. This preserves the user-proposed near-square scanning pattern without inventing an image dependency.
- Outlet Daily list aggregation now indexes lines by record before calculating totals, removing repeated full-line scans without changing the fail-closed trust rule.
- The local release is `v8.64.6`; focused contract coverage and typecheck pass. Remote/browser verification remains open until the preview footer shows this release.

## Report preview continuity pass — 2026-08-16

The report annotations that called out hover/focus preview flicker are now fixed in the shared chart surfaces, not by route-specific CSS:

- Interactive ranking, AP Aging bucket, Production variance signal, and Inventory daily movement previews reserve a compact muted slot before selection.
- Hover, touch, and keyboard focus replace the instruction inside that same slot; the chart/card geometry no longer changes when exact values or a drill-through action appears.
- Contract coverage now asserts the stable slot and rejects the old `sr-only` idle-preview pattern. The local release was `v8.64.4` (`b1e8400`), with 686/686 tests, lint, typecheck, and a 75/75-page production build passing.
- Remote preview/browser verification remains open: the last supplied browser evidence still showed an older footer and therefore is not proof of this release.

This closes the specific report-preview layout-shift annotations; the remaining annotation backlog is not implicitly closed by this pass.

## Earlier comment matrix

The previous 19 browser comments remain part of this ledger and must not be regressed: Dashboard data/identity/density, shared mobile filters, Stock Count action rail and cards, Outlet Daily setup/action rail, Purchase Returns filter width, UOM menus, and global logo/scrollbar rules.

## Full re-audit pass — 2026-08-10 (annotation batch)

This pass rechecked the newly reported dashboard, filter, action-rail, procurement, receiving, inventory, master-data, and authentication surfaces after the shared convergence patch.

### Source changes in this pass

- Dashboard pending actions now live below the left command/quick-action column instead of creating a tall right-side stack; the main desktop grid remains an equal 6/6 split.
- Desktop legacy and UnifiedListHeader filters now share equal 9rem control widths, centered actions, and the same 36px desktop control height. Date-first filters and status triggers use the same geometry.
- Mobile action rails use equal columns; a single action spans the full rail. Nested More/primary actions are full-width and evenly spaced.
- Purchase Request lines now have one shared Item / Quantity / UOM header, visible line indices, compact four-column responsive alignment, and non-repeated visual field labels (accessible labels remain in the DOM).
- Goods Receiving setup now collapses after a PO is selected into a PO/date/branch quick summary with an explicit Edit/Done affordance; controlled values remain in the form when collapsed.
- Login shell keeps tenant branding when authenticated branding is available and uses a compact `SB` company mark as the safe unauthenticated fallback; auth card and mark use canonical panel radius/shadow tokens.
- Sidebar release footer now shows the current package version only (`v8.36.0`) without the stale sprint note.

### Runtime evidence

- Static workspace layout audit, mobile-390: 10 affected routes passed (Purchase Request new, Goods Receiving new, Production Jobs, Outlet Daily, Supplier Invoices, Suppliers, Items, Stock Card, Stock Counts, UOM Conversions).
- Static workspace layout audit, tablet-768: the same 10 affected routes passed; this covers the tablet breakpoint used by the responsive system and the 820px portrait behavior.
- Static workspace layout audit, desktop-1440: Dashboard plus the same 10 affected routes passed.
- Focused live geometry probe: mobile Purchase Request action rail measured 393px × 72px with two 179.5px columns; Submit PR and More both measured 179.5px × 44px with `space-evenly`. Goods Receiving single-action rail measured full available width after the `:only-child` rule.
- Desktop geometry probe: Production Jobs, Items, Outlet Daily, Purchase Orders, and UOM Conversions shared filter actions measured 144px wide; status, date, More filters, and submit controls measured 36px high after the canonical desktop override.
- `npm run typecheck:strict` passed after the form and shared CSS changes.

### Remaining evidence limits

- The three viewport audits were run as split batches to keep the authenticated local preview stable; the individual batches passed. This is not represented as one uninterrupted all-route process.
- The unauthenticated login surface cannot safely read tenant-specific Supabase branding before authentication; the `SB` mark is an intentional fallback, not a claim that the tenant logo is unavailable after sign-in.
- Full mutation E2E and production Supabase data freshness still require the user's authenticated environment; no business records or database state were changed in this pass.

## Evidence log

- `998ec08`: previous shared responsive interaction close-out.
- Working patch: QuantityStepper, field label semantics, procurement density, Stock Balance UOM/basket/tablet split, document action breakpoint, transfer surfaces, low-stock canonical-view fallback, Dashboard canonical low-stock count, stale Stock Count document filtering, and a stable desktop empty state for Actions awaiting you.
- Production browser evidence (local `next start` on port 3144): 390x852 Purchase Request, Low Stock, Stock Balance, Stock Transfer, Purchase Return and Dashboard; 820x1180 Stock Transfer and Purchase Return; 1180x820 Stock Balance; 1440x900 Dashboard.
- Additional local browser verification: UOM Conversions action menu opens at 390px and 1440px as a fixed portal (`role=menu`) within the viewport; Production Jobs uses the anchored desktop More-filters panel and a dedicated mobile Filter sheet without a nested More-filters control.
- Exact-width authenticated route audit: all 68 canonical workspaces were traversed at 390x844, 820x1180, 1180x820, and 1440x900 with no horizontal overflow, out-of-viewport interactive controls, or application error pages. The `/stock-balances` alias briefly produced a navigation-race during measurement; a stabilized rerun confirmed its redirect to `/stock-balance` and healthy content at all four sizes.
- Tablet split rail is now explicitly `16rem` at the `md` and `lg` tablet breakpoints; a stabilized post-build critical-route pass (56 route/viewport checks) found no overflow, out-of-bounds controls, or missing split workspaces.
- Playwright production smoke passed: selected mobile visual language (8 routes), dynamic workflow responsive (Transfer/Wastage/Production at 390/768/1440), auth-shell security (6 viewports), unauthenticated cross-site mutation rejection, experience/error states, and purchasing navigation smoke.
- Full canonical mobile visual route audit passed: all routes declared by `mobile-visual-language.spec.js` at 390x844 (2m 12s), with no legacy brown action, invalid radius, title offset, or horizontal overflow findings.
- Full canonical static workspace audit passed: all 68 canonical routes at 390, 768, and 1440; every route had parsed global styles, no page-level horizontal overflow, and no visible interactive control outside the viewport (5m 0s).
- Fresh post-patch Playwright static audit passed all 8 viewport profiles (320, 390, 640, 768, 820, 1024, 1280, 1440/2560 desktop profiles) across the canonical route set; 8/8 tests passed in 12.5 minutes with no overflow or styling failures.
- Playwright suites with legacy assumptions remain non-green: `ui-smoke` expects Action as the last table column although the current shared list grammar intentionally puts it first; `operational-lists` expects tables at 768/1024 and visible H1s on phones although current responsive ownership intentionally uses OperationalList below xl and the mobile context title. These are test-contract drift, not hidden runtime failures.
- Contract checks: security/API/header/filter/dialog/tablet-action contracts passed. The full legacy source-shape suite currently has 18 failures tied to pre-convergence assumptions (styles moved to `design-system-v2.css`, fallback reads intentionally retained for RPC degradation, old action/FAB strings, and the former table shadow token); runtime route and interaction evidence is recorded separately rather than masking those tests.
- Production checks passed: `npm run typecheck:strict`, `npm run lint`, `npm run build`, `npm audit --omit=dev --audit-level=high` (0 vulnerabilities), and `git diff --check`.
- Security close-out: the scoped baseline reviewed 36 security-relevant source/migration files and found no high-confidence auth, IDOR, tenant-boundary, upload, or data-leak issue. Two tenant-local export resource risks were validated and bounded: Stock Count workbook exports now cap counts (10,000), lines (50,000), and ZIP output (25 MiB); AP Aging exports now cap rows (50,000) and CSV output (25 MiB). Focused export regression tests and the 51-test security contract suite pass. The completed current working-tree diff scan (`fb418034-f215-4589-b516-203087d90fef`) reported 0 findings and generated canonical `report.md`/SARIF artifacts; its declared scope is the diff plus focused evidence, not a claim of repository-wide zero findings.
- E2E limitation: authenticated remote-fixture Playwright remains environment-bound and is not represented as a green full-suite result; the production-browser smoke paths above are the evidence for this patch.

## Current close-out pass — 2026-08-10

- Dashboard now uses a compact `lg:grid-cols-12` workspace: the green Operational pulse and stacked Quick Actions occupy the left four columns; pipeline, exceptions, payables, and alerts occupy the right eight columns. The pulse metrics are a stable 2×2 grid at every breakpoint, while the phone pipeline remains a single row of three compact tiles.
- The former Dashboard-only right Actions rail was removed so desktop actions no longer consume an empty vertical sidebar; tablet and phone actions remain in the main flow with one responsive source of truth.
- `UnifiedListHeader` now places desktop controls first, result count next, and terminal actions (Search/Reset/Filter) at the right. A shared 768–1279px compact rule allows a controlled wrap inside narrow content rails; 1280px+ retains the single horizontal rail. No page-specific filter CSS was added.
- Targeted authenticated static audit passed for `/dashboard`, `/production/jobs`, `/purchase-requests`, `/purchase-returns`, `/stock-balance`, `/supplier-invoices`, `/suppliers`, and `/uom-conversions` at 390, 768, 1024, 1280, and 1440 profiles after the compact-rail fix. Dashboard screenshot evidence was captured at 390, 768, and 1440; all selected route checks reported no viewport overflow or out-of-bounds interactive controls.
- `npm run typecheck:strict`, `npm run lint`, and `npm run build` passed after this pass. A live dev preview is available on `0.0.0.0:3000` for multi-device review: `http://localhost:3000/dashboard` and `http://192.168.0.25:3000/dashboard`.

## Latest refinement pass — 2026-08-10

- Restored Dashboard desktop Actions in the shared right console, alongside a compact Workspace context card. The main dashboard keeps the 12-column density model; the welcome identity stays left-aligned while role/scope remains right-aligned.
- Unified `ConsoleSection` into the same raised, rounded panel language used by Stock Wastage and Stock Balance. Stock Balance now labels the side panel `PR basket`, while its desktop floating basket trigger remains suppressed when the rail is visible to avoid duplicate entry points.
- Focused Playwright static audit passed `/dashboard`, `/stock-balance`, and `/stock-wastage` at mobile 390 and desktop 1440 (2/2 tests, no viewport overflow or out-of-bounds interactive controls). Screenshots were captured for both profiles.
- Re-verified `npm run typecheck:strict`, `npm run lint`, and `npm run build` after the refinement. No Supabase paths, server actions, or business-state transitions were changed.

## Annotation close-out pass — 2026-08-10 (current browser comments)

| ID | Route / surface | Finding | Shared fix / verification |
|---:|---|---|---|
| 1 | Dashboard desktop | Main workspace felt 1/3 + 2/3 and crowded | Dashboard content changed to equal `lg:col-span-6` / `lg:col-span-6`; verified at 1440 and 1024 without overflow |
| 2 | Items | Desktop filter rail overflowed into the right edge | Shared desktop `UnifiedListHeader` now wraps at the available work-surface width; action remains terminal and right-aligned; verified at 1440, 1024, 768 |
| 3 | Stock Card | Apply action was cut off | Same shared wrapping contract keeps Apply visible on its own right-aligned row; verified at 1440, 1024, 768 |
| 4 | Stock Counts | More filters control height differed from dropdowns | Shared filter controls and `FilterBarMore` summary now use `--sb-control-height`; verified at 1440, 1024, 768 |
| 5 | New Item | Supplier input and Create supplier action were vertically misaligned | Item form now aligns the action to the input control rather than the helper text; verified at 1440 and 768 |

Focused Playwright static audit passed these five routes at mobile 390, tablet 768, laptop 1024, and desktop 1440 profiles with no page overflow or out-of-bounds interactive controls. An additional authenticated exact-820px browser pass reported `overflow: 0` and no out-of-bounds interactive controls for all five routes.

## Outlet access repair — 2026-08-10

- Added an idempotent repair migration for active tenant `outlet_staff` roles. It backfills the canonical dashboard and outlet-daily-record view/create/update grants when a tenant role was created after the original seed migration.
- The repair does not grant company-wide access; existing `can_access_outlet_daily_branch` and RLS branch scoping remain authoritative.
- The local preview is running with the configured cloud Supabase environment, but automated outlet probing is blocked by the absent `TEST_OUTLET_EMAIL` / `TEST_OUTLET_PASSWORD` fixture. The tenant browser session remains the required final access check after migration 140 is applied.

## Strict continuation — 2026-08-11

- Re-ran the complete contract/E2E regression for `codex/uiux-round2`: **523/523 passed, 0 failed, 0 cancelled**.
- Re-verified `npm run typecheck:strict`, `npm run lint`, and `npm run build`: all passed; Next.js static generation completed **75/75 pages**.
- The regression now covers the current shared v2 ownership for control/panel radii (8px/12px), phone-only UnifiedListHeader/filter sheets, portal z-index and navigation suppression, document/task action rails, tablet split-rail ownership, safe-area/dynamic viewport behavior, controlled date inputs, dashboard snapshot/fallback isolation, payables gating, and procurement mobile/desktop section boundaries.
- This is a source/contract/build regression result. It is not a claim of authenticated cloud-browser evidence.
- Supabase cloud migration state and the real Outlet Staff `/outlet-daily-records` login/access path remain an explicit live-session gate; local Supabase or missing test credentials must not be used as proof.
- Existing dirty and untracked files were preserved. No reset, checkout, clean, commit, or push was performed.

## Strict browser continuation — 2026-08-11 (runtime + responsive)

- The first browser batch exposed a real runtime gate: the existing port-3000 `next start` instance returned HTTP 500 for `/login`. A fresh dev preview from this worktree returned 200; the stale instance was replaced with the current worktree dev server on `0.0.0.0:3000`.
- The machine's current Wi-Fi address is `192.168.10.102`; the previously used `192.168.0.25` is no longer assigned to this host. `http://localhost:3000/login` and `http://192.168.10.102:3000/login` both return 200.
- A 20-route authenticated static browser audit passed at both `390×844` and `1440×960` (2/2 Playwright tests; no overflow or out-of-bounds interactive controls).
- The exact Outlet Daily responsive workflow passed at `390×844`, `820×1180`, and `1440×900` (1/1): Workflow sheet, More sheet, mobile document action rail, tablet/desktop workflow, and safe-area ownership all passed.
- The browser audit found and fixed a genuine shared defect: the phone rule hiding repeated page headers also hid `[data-document-workspace-header]`, collapsing document workflow controls to 0×0. The selector now excludes the canonical document header, and the mobile header's auto column preserves intrinsic width.
- The Outlet Daily E2E spec was aligned with the shared contract: document action rails own the phone bottom safe-area slot, so the persistent mobile nav is expected hidden while that rail is present.
- A prior full 68-route × 3-viewport browser attempt exceeded the harness's 10-minute wall-clock limit and is not counted as pass/fail evidence. The bounded critical-route browser results above are the accepted run.
- Outlet Staff cloud-configured probe: authentication succeeds and `/dashboard` loads, but `/outlet-daily-records` redirects back to `/dashboard` with no denial page. Source permissions include the role grant and migration `141_repair_outlet_staff_daily_record_access.sql`; the supplied CLI evidence only showed migrations through 139. A read-only `supabase migration list` retry currently fails with `LegacyDbConfigLoginRoleNetworkError`, so remote migration state is not asserted here and migration 141 must be confirmed/applied by an operator with a working Supabase CLI connection.

## Strict full-matrix continuation — 2026-08-11 (CSS runtime + exact viewports)

- The local 3000 preview initially served the generated CSS URL as 404 while its dev cache emitted webpack manifest errors. The resulting unstyled DOM produced a false-looking 2000px logo overflow. The preview was restarted with an isolated `.next-audit` dist directory; the same CSS asset then returned HTTP 200 with 152,548 bytes and no bundler error. No application source or data was changed to mask this runtime issue.
- Added the exact requested viewport profiles to the canonical static audit harness: `820×1180`, `1180×820`, and `1440×900` (in addition to the existing profiles). All **68/68 canonical routes** passed independently at each exact profile: styles loaded, no page-level horizontal overflow, no visible interactive control outside the viewport, and no application error page.
- The shared Dashboard empty-state regression was fixed: `Actions awaiting you` remains a compact left-column panel when there are zero pending actions, instead of disappearing. This restores a stable information hierarchy and prevents the desktop workspace from collapsing unexpectedly.
- Read-only authenticated interaction evidence is green after serializing the local fetch adapter: the 10 non-dashboard UI/navigation/deduplication checks passed, and the super-admin 20-route smoke passed after correcting two stale Action-column assertions and allowing harmless dev compilation navigation aborts. No mutation workflow was run against cloud data.
- Re-ran the full source contract gate: **523/523 passed**. `npm run typecheck:strict`, `npm run lint`, and `npm run build` all passed; production generation completed **75/75 pages**.
- The supplied Supabase log export confirms a separate deployment/data-layer blocker rather than a CSS defect: repeated `57014 canceling statement due to statement timeout` entries pair with 500s from `get_stock_card_bounded`, `get_stock_ledger_bounded_page`, and `stock_balances_view`, plus one `42501 permission denied for table companies`. The pending source migration `142_optimize_bounded_inventory_reads.sql` is not evidence of remote deployment; no migration was pushed during this audit. These cloud errors must be resolved by applying/validating the canonical migrations and grants through a working Supabase CLI connection.
- No reset, checkout, clean, commit, push, local Supabase start, or business-state mutation was performed.

## Strict continuation — 2026-08-11 (cloud read-only probe + error truthfulness)

- A read-only authenticated cloud probe covered `/dashboard`, `/low-stock`, `/stock-balance`, `/stock-card`, `/stock-transactions`, and `/stock-counts`. The first five surfaces did not render an `Unavailable` placeholder; `/stock-card` did reproduce the known server-side RPC failure and incorrectly fell through to `No stock movements found`.
- `getStockCardResult` now preserves the RPC failure as an explicit status. Stock Card renders a shared error notice — `Stock Card data is temporarily unavailable` — and suppresses the misleading empty-state row until the service responds. The existing `getStockCard` array API remains compatible for exports/other callers; no tenant/RLS or business-state logic was changed.
- `npm run typecheck:strict` passed after this change. Remote migration status was queried with `supabase migration list --linked` in read-only mode; the CLI could not initialise its login role and returned `LegacyDbConfigLoginRoleNetworkError`. This is a connection-state limitation, not confirmation that migrations 140–142 are deployed. No `db push` or remote write was attempted.
- The cloud data blocker remains explicit: the supplied logs show repeated `57014` timeouts and 500s for bounded inventory RPCs, plus a `42501` `companies` permission error. A working operator connection must validate/apply the canonical remote migrations before Stock Card/ledger data can be declared restored.
- Focused cloud-configured static browser regression for `/stock-card` passed at all four required profiles: `390×844`, `820×1180`, `1180×820`, and `1440×900`; no style load, viewport overflow, out-of-bounds control, or app-error failure was observed. The first attempt was correctly blocked by the local-fixture safety guard and was not counted as a page failure.
- Re-ran the cloud-configured authenticated UI smoke with one worker: **6/6 tests passed** (super-admin 20-route navigation plus kitchen, purchasing, manager, finance, and outlet dashboard/sidebar smoke). This run performs navigation/assertions only; mutation workflows remain intentionally excluded from the cloud target.
- Authoritative read-only Supabase probe now confirms the Outlet Staff blocker: the configured active account signs in successfully, has `dashboard.view = true`, but `has_any_permission(['outlet_daily_record.view','outlet_daily_record.create','outlet_daily_record.update']) = false`; its primary role is `outlet_staff`, active, effective from `2026-07-27`. The app correctly redirects the protected route because the remote role-permission rows are missing; this is not a frontend route-map omission. Migration `141_repair_outlet_staff_daily_record_access.sql` contains the required idempotent metadata repair, but it has not been applied remotely in this audit.

## Strict continuation — 2026-08-11 (re-audit after interrupted run)

- The interrupted working tree was re-audited before further changes. No partial source patch was found. A genuine regression was found in the pending diff: `getLowStockItems` had lost its read-only `stock_balances_view` fallback. The fallback is restored so an empty/stale `stock_balances_summary` does not incorrectly become `No low stock items`; if both reads fail, the existing explicit error path remains authoritative.
- Full source regression is green: **523/523** contract tests, `npm run typecheck:strict`, `npm run lint`, and production `npm run build` all passed; the production build generated **75/75** pages. `npm audit --omit=dev --audit-level=high` passed with **0 production vulnerabilities** when run with the local system CA.
- The cloud-configured local preview was restarted on an isolated port and cache after proving that the previous Playwright command had accidentally been overridden to an older target by Node `--env-file`. Direct browser login to the isolated preview succeeds with the configured Super Admin identity.
- Exact viewport browser evidence is green for the ten user-comment/high-risk routes — Dashboard, Items, Production Jobs, Purchase Requests and New PR, Purchase Returns, Stock Card, Stock Counts, Supplier Invoices, and Suppliers — at **390×844**, **820×1180**, **1180×820**, and **1440×900**. Each route loaded global CSS, showed no application error page, had no page-level horizontal overflow, and exposed no visible interactive control outside the viewport.
- A single all-68-route cloud matrix was attempted but exceeded the browser harness wall-clock because the remote read layer serializes/occasionally times out. It is recorded as **timeout, not pass**. The smaller exact batches above are valid evidence; the remaining canonical routes still need bounded read-only batching before final close-out.
- Cloud-configured role/navigation smoke passed **6/6** for Super Admin, Kitchen, Purchasing, Manager, Finance, and Outlet dashboard/sidebar navigation. A stricter no-write navigation/permission pass then passed **8/9**; its one failure is the known authoritative Outlet Staff Daily Records grant defect. The failure is intentional evidence to retain until migration 141 is remotely applied and re-verified, not a test relaxation candidate.

### Completion of the bounded route matrix

- The remaining routes were then completed in four deterministic no-write batches rather than one monolithic run. The route coverage check confirms **68/68 canonical workspaces** were exercised at each exact profile: **390×844**, **820×1180**, **1180×820**, and **1440×900**.
- Every covered route passed its CSS-presence, application-error-page, document horizontal-overflow, and visible-interactive-boundary assertions. This includes all document creation routes, mobile/tablet action rails, list filters, right consoles, reports, administration, inventory operations, and the `/stock-balances` compatibility redirect.
- This proves the visual/runtime layout contract for the canonical owner-accessible workspace set. It does not erase the separately reproduced Outlet Staff authorization failure; that role-specific route remains blocked by remote permission metadata until migration 141 is applied and then re-run.

## Final no-write Outlet authorization retest — 2026-08-11

- Re-ran only the established Outlet Staff access flow against the cloud-configured isolated preview: sign in succeeds, then `/outlet-daily-records` still fails to expose its heading and redirects away. The focused Playwright assertion remains intentionally failing at `tests/e2e/role-permissions.spec.js:56`; it must not be weakened to convert this authorization defect into a pass.
- This is a live remote-permission gate, not a local CSS, routing, or test-fixture issue. The next allowed resolution is an operator-applied/verified migration 141 grant repair followed by this exact no-write retest. No Supabase data, RLS policy, business-state flow, commit, reset, checkout, or clean operation was performed.

## Remote migration and final verification close-out — 2026-08-11

- The operator applied and verified remote migrations `141_repair_outlet_staff_daily_record_access.sql` and `142_optimize_bounded_inventory_reads.sql`; the supplied migration-list evidence shows local and remote history synchronized through 142. This supersedes the migration-precondition blocker recorded immediately above.
- Migration 142 initially failed because the `expanded` CTE emitted computed `coalesce(...)::numeric` expressions without column aliases, while the following CTE referenced `quantity_in`, `quantity_out`, `unit_cost`, and `total_cost`. The migration source now assigns those explicit aliases in both union branches. The underlying remote `stock_transactions` and `stock_transaction_lines` columns were present; no table rewrite or RLS relaxation was required.
- The exact focused Outlet Staff no-write authorization flow was re-run against the cloud-configured isolated preview after the migration. Sign-in succeeded, `/outlet-daily-records` opened, and the role remained denied from procurement workspaces: **1/1 passed** in 16.1 seconds.
- Post-migration live read coverage was split into bounded serial batches to respect the remote Supabase adapter: Stock Balance / Movement Ledger / Stock Card passed in 52.7 seconds; Purchase Requests / Purchase Orders / Goods Receiving / Supplier Invoices / Items / Production Jobs / Outlet Daily Records passed in 75.1 seconds. Each route exposed a usable table or operational-list surface without horizontal overflow. Stock Card did not show the temporary-unavailable fallback message.
- The exact canonical responsive matrix remains green for **68/68 routes** at **390×844**, **820×1180**, **1180×820**, and **1440×900**. The monolithic nine-route live-read attempt that exceeded its wall clock remains correctly recorded as a timeout; the bounded batches above are the completion evidence and are not represented as one uninterrupted process.
- Final source and production gates are green: **523/523 tests**, strict TypeScript, ESLint, `git diff --check`, and Next.js production build with **75/75 pages** generated. The final build completed in 53 seconds.
- No reset, checkout, revert, clean, commit, push, destructive database action, local Supabase substitution, or business-state mutation was performed by this close-out. Existing unrelated temporary and untracked files remain preserved and excluded from the verified change scope.
