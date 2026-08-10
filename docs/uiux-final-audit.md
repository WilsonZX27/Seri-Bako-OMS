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
