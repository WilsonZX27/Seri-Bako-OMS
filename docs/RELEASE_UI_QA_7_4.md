# Sprint 7.4 Release UI and Performance QA

Status: implementation and verification complete

Audit date: 2026-07-14

Baseline commit: `278ec29`
Database state: intentionally empty operational/master data; auth and organization setup retained.

## Audit health baseline

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 2/4 | Shared labels and focus rings exist, but 32px controls and links, unlabeled table headers, non-modal drawers, and inconsistent live error treatment miss the mobile/WCAG baseline. |
| Performance | 2/4 | Request-scoped React cache and parallel page queries are used, but shell startup still performs duplicate profile/auth work and 15 sidebar count queries plus topbar activity queries on every navigation. |
| Responsive design | 1/4 | Sidebar collapses, but the right console disappears below `xl`, tables rely on 34 local overflow wrappers, and 32px controls are too small for touch use. |
| Theming | 2/4 | Brand tokens exist, but two overlapping token vocabularies, 126 arbitrary text utilities, hard-coded status colors, and 150 `rounded-md` or larger usages dilute the contract. |
| Anti-patterns | 2/4 | The core app is restrained, but the login uses decorative gradients, blur, split-screen marketing copy, and a wide shadow; repeated cards and uppercase tracked micro-labels remain common. |
| **Total** | **9/20 — Poor** | Shared-system corrections are required before release QA. |

Anti-pattern verdict: the authenticated shell is directionally credible, but the login looks template-generated and component vocabulary changes between old and newer routes. The largest trust defect is inconsistency, not lack of decoration.

### Baseline inventory

- 100 page routes and 74 component files.
- 40 client components; interactive boundaries are generally leaf-level.
- 126 arbitrary text-size classes and 150 medium-or-larger radius utilities.
- 36 routes render shared tables; 34 page/component files add local horizontal scrolling.
- Existing positive patterns: request-scoped `cache()` for profile/reference options, extensive `Promise.all`, shared `PageHeader`, `Button`, form controls, status badges, workspace shells, error/empty states, and server-side permission checks.

## Route inventory and classification

Classification: A workspace, B list, C document/form, D authentication/system.

## Historical Mockup Handling

Historical images in `docs/stitch-*.png` and `docs/Seri Bako OMS Design System.png` are optional mood references, not product specifications.

- Retained: deep green operational identity, warm neutral workspace, compact rectangular controls, amber/brown action accent, and restrained operational tone.
- Rejected: old page structures, topbar workflow/create actions, optional desktop right rails, outdated navigation groups, fabricated dashboard metrics, oversized headings, excessive empty canvas, desktop-first layouts, and mockup-specific font pairing.
- Precedence: current working workflows first, then `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, `README.md`/`DEPLOYMENT.md`, and validated shared shell/components. Historical images never override these rules.
- Sprint 7.4 review: shared token/control sizing, semantic labels, table containment, compact login, and mobile context drawer changes are based on the current written contract and observed app behavior. No current change reproduces a historical page structure.

### A — Workspace mode

`/dashboard`, `/daily-operations`, `/data-onboarding`, `/inventory`, `/procurement`, `/production`, `/quick-tools`, `/reports`, `/settings`

### B — List mode

`/activity`, `/administration/imports`, `/branches`, `/documents`, `/document-sequences`, `/goods-receivings`, `/items`, `/locations`, `/low-stock`, `/procurement/purchase-requests`, `/production/jobs`, `/products`, `/purchase-orders`, `/purchase-requests`, `/purchase-returns`, `/recipes`, `/roles`, `/settings/backups`, `/staffs`, `/stock-balance`, `/stock-card`, `/stock-counts`, `/stock-transactions`, `/stock-transfers`, `/stock-wastage`, `/supplier-invoices`, `/supplier-items`, `/suppliers`, `/uom-conversions`

Compatibility/system list routes: `/`, `/imports/[entity]`, `/stock-balances`.

### C — Document/form mode

`/account`, `/company`, `/branches/[id]`, `/branches/new`, `/documents/[id]`, `/document-sequences/[id]`, `/document-sequences/new`, `/goods-receiving/scan`, `/goods-receivings/[id]`, `/goods-receivings/new`, `/goods-receivings/scan`, `/items/[id]`, `/items/new`, `/locations/[id]`, `/locations/new`, `/opening-stock/import`, `/production/jobs/[id]`, `/production/jobs/new`, `/products/[id]`, `/products/new`, `/purchase-orders/[id]`, `/purchase-orders/new`, `/purchase-requests/[id]`, `/purchase-requests/new`, `/purchase-returns/[id]`, `/purchase-returns/new`, `/recipes/[id]`, `/recipes/[id]/edit`, `/recipes/new`, `/roles/[id]`, `/roles/new`, `/staffs/[id]`, `/staffs/new`, `/stock-count/scan`, `/stock-counts/[id]`, `/stock-counts/new`, `/stock-counts/scan`, `/stock-transactions/[id]`, `/stock-transactions/new`, `/stock-transfer/scan`, `/stock-transfers/[id]`, `/stock-transfers/new`, `/stock-transfers/scan`, `/stock-wastage/[id]`, `/stock-wastage/new`, `/stock-wastage/scan`, `/supplier-invoices/[id]`, `/supplier-invoices/new`, `/supplier-items/[id]`, `/supplier-items/new`, `/suppliers/[id]`, `/suppliers/new`, `/uom-conversions/[id]`, `/uom-conversions/new`.

### D — Authentication/system state

`/login`, `/forgot-password`, `/set-password`, `/change-password`, `/setup`; route-group and root `error.tsx`, `loading.tsx`, and `not-found.tsx` boundaries.

## Prioritized findings

### P1 — release blocking

1. **Mobile actions disappear with the right console.** `RightConsoleProvider` hides the console below 1280px with no alternate surface. Detail/form workflow actions can become unreachable. Fix in the shared shell with an accessible mobile context drawer.
2. **Control targets are undersized.** Shared buttons, inputs, selects, and nav links are 28–32px high. Apply a 44px mobile target and compact 36px desktop density.
3. **Login conflicts with the release brief.** Decorative gradients, blur, split layout, oversized promotional copy, and full-page pending overlay create layout and perceived-performance problems. Replace with one compact operational surface and stable inline status feedback.
4. **Typography has no enforced semantic scale.** Global 12px body text plus 126 arbitrary classes makes hierarchy and readability route-dependent. Consolidate tokens and shared component defaults; retain only proven data-density exceptions.
5. **Table actions are inconsistent.** Several list tables place quick-view/edit in the first column while the contract requires checkbox first and action last. Normalize representative/core lists and make the shared last column reachable on mobile.

### P2 — significant but non-blocking

1. **Shell queries are expensive.** Sidebar performs 15 independent count requests; topbar loads activity, notifications, permissions, and actors. Existing parallelism prevents waterfalls, but request count remains high. Keep user context request-scoped and reduce/reuse only where security permits.
2. **Two token systems overlap.** `--sb-*` hex tokens and shadcn HSL tokens do not map consistently. Make shadcn tokens aliases of the Seri Bako contract.
3. **Drawer semantics/focus are incomplete.** Mobile navigation lacks dialog semantics, Escape handling, scroll lock, and explicit focus restoration.
4. **Table responsiveness is route-local.** Use one shared scroll container and sticky final action column; card transforms are reserved for routes where comparison is not essential.
5. **Loading feedback can obscure progress.** Login uses a full-screen overlay labelled “Loading data...”; favor immediate inline pending text and layout-shaped skeletons.

### P3 — polish/deferred candidates

- Replace remaining page-local status colors and large radii as touched; a blind whole-repo class rewrite is unsafe and deferred unless visual QA finds a release-visible defect.
- Native selects remain intentionally native for mobile usability. A custom select is not justified.
- No dark theme is planned; the product contract specifies a light operational workspace and dark green navigation.

## Shared UI contract

The canonical implementation lives in `src/app/globals.css` and `src/components/ui`.

| Role | Contract |
| --- | --- |
| Font | System UI sans stack; tabular data may use the existing mono stack. |
| Page title | 18px / 1.35 / 600 |
| Section and card title | 14px / 1.4 / 600 |
| Body and controls | 14px mobile, 13px compact desktop / 1.45 |
| Meta, labels, table headers | 12px minimum / 1.4 / 500–600; uppercase only for true compact metadata. |
| Spacing | 4, 8, 12, 16, 20, 24, 32px semantic scale. |
| Page gutters | 12px mobile, 16px tablet/desktop. |
| Controls | 44px mobile; 36px at `sm` and above; icon controls follow the same target. |
| Panels | 12px mobile and 16px desktop padding; 2–4px radius maximum. |
| Shell | 48px topbar, 236px sidebar, 340px desktop right console. |
| Focus | Visible 2px amber focus ring with offset; never removed without replacement. |

## Responsive rules

- 320–767px: navigation drawer, single-column workspace, 44px targets, context/actions in a bottom drawer, no page-level horizontal overflow.
- 768–1023px: single-column center with wider gutters; forms may use two columns; context drawer remains available.
- 1024–1279px: fixed desktop sidebar plus center workspace; contextual console remains a drawer so center content is not crushed.
- 1280px+: three-zone shell with persistent 340px console.
- Dense comparison tables scroll within their own labelled region. The final action column stays visible; non-essential columns may be hidden route-by-route only with evidence.
- Drawers use dialog semantics, Escape/backdrop close, focus restoration, and safe-area padding.

## Release QA matrix

| Surface | 320×568 | 360×800 | 390×844 | 430×932 | 768×1024 | 1024×768 | 1280×800 | 1440×900 | 1920×1080 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login and auth | Required | Required | Required | Required | Required | Required | Required | Required | Smoke |
| Shell/navigation/context | Required | Required | Required | Required | Required | Required | Required | Required | Smoke |
| Dashboard | Overflow/actions | Smoke | Smoke | Smoke | Layout | Layout | Full | Full | Smoke |
| Master list (`/items`) | Table/actions | Table/actions | Smoke | Smoke | Layout | Layout | Full | Full | Smoke |
| Procurement list/detail/create | Required | Required | Required | Required | Required | Required | Required | Required | Smoke |
| Inventory (`/stock-balance`) | Table/actions | Table/actions | Smoke | Smoke | Layout | Layout | Full | Full | Smoke |
| Admin (`/staffs`, `/roles`, `/company`, branches/locations) | Core paths | Core paths | Smoke | Smoke | Required | Required | Required | Required | Smoke |

Reusable automated assertions:

- `document.documentElement.scrollWidth <= window.innerWidth + 1`.
- Every visible button/link/form control has an accessible name and usable dimensions.
- Mobile navigation and context drawers remain within the viewport and close with Escape.
- Submit buttons disable synchronously, expose `aria-busy`, and do not issue duplicate requests.
- No critical route remains on a loading message indefinitely.
- Keyboard focus is visible and not hidden by fixed/sticky controls.
- Reduced-motion users receive no non-essential animation.

## Performance measurement plan

- Production build route output and first-load payload: record from `next build` where emitted.
- Server response and route navigation: Playwright navigation timing for representative routes; report environment and do not treat local/mock values as production.
- Mutation acknowledgement: browser event-to-disabled-state assertion; target is the next animation frame, not a fabricated millisecond value.
- Major database requests: code-level counts where observable. Baseline shell: profile/auth lookup plus 15 sidebar count queries and topbar queries; all are currently parallelized where independent.
- Core Web Vitals: capture only when a browser environment exposes stable values. Otherwise mark blocked rather than estimate.

## Resolved, deferred, and evidence

### Resolved in Sprint 7.4

- The required three-zone desktop shell remains intact at 1280px and above; smaller widths expose the same page-specific right-console content through an accessible context drawer.
- Mobile navigation and context drawers now provide dialog semantics, Escape/backdrop close, focus containment/restoration, scroll locking, safe-area spacing, and reachable 44px controls.
- Login is a compact single-column operational surface with stable inline errors, correct autocomplete/input modes, one-submit pending feedback, and no decorative split layout or loading overlay.
- Shared typography, spacing, controls, focus, panel, and table contracts are aligned through semantic tokens. Desktop controls retain compact 36px density while mobile targets are 44px.
- Core operational lists use checkbox-first and action-last table structure. The shared table region owns horizontal scrolling and keeps the final action column reachable.
- The app shell reuses the current profile lookup and the sidebar count fan-out was reduced from 15 to 10 without changing permissions or business behavior.
- Release identity is `v0.2.14 / Sprint 7.4`.

### Verification results

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings or errors. The existing Next.js 15 command reports only its upstream deprecation notice.
- `npm run build`: passed; 79 static pages generated, shared first-load JavaScript 102 kB, listed route first-load payloads 103–137 kB.
- Focused Sprint 7.4 Playwright suite against the optimized production server: 9/9 passed.
- Complete Playwright regression suite against the optimized production server: 36 passed, 12 intentionally skipped, zero failures. Skips require opt-in mutation data or historical fixtures that are absent from the intentionally empty reset database.
- Required viewport evidence covers 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, and 1920×1080 shell behavior.

### Performance evidence

- Local Next.js development navigation samples (not production claims): dashboard 1,237 ms, items 1,583 ms, purchase requests 1,251 ms, stock balance 1,242 ms, and company 1,284 ms total navigation time. These include local development compilation/runtime overhead.
- Production build payload evidence is recorded above. Core Web Vitals remain blocked because this local authenticated QA environment does not provide stable field data; no values were estimated.

### Deferred by product scope

- Supplier invoice accounting depth, full dispatch, and other future modules are not invented or expanded.
- No database migrations or reset SQL changes are planned; no database blocker has been found.
- No fake records or decorative dashboard data will be added for screenshots.

### Evidence locations

- Historical visual mood references only: `docs/stitch-*.png` and `docs/Seri Bako OMS Design System.png`.
- Sprint 7.4 screenshots, viewport findings, and local timing JSON: `test-results/release-ui-7-4/`.
- Automated coverage: `tests/e2e/release-ui-7-4.spec.js`.
