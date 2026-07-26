# OMS UX System Audit — 2026-07-25

Status: in progress (baseline captured; remediation waves continue)

## Scope

- 76 canonical authenticated workspaces from `tests/e2e/static-workspace-layout-audit.spec.js`.
- Responsive contract: 320, 390, 640, 768, 1024, 1280, 1440, and 2560 CSS pixels.
- Core workflows: dashboard, stock count, stock balance/ledger, transfers, wastage, purchasing, receiving, production, daily operations, reports, master data, administration, account and access states.
- Evidence: current-run 390px screenshots under `test-results/static-workspace-layout-audit/`; targeted Stock Count Playwright evidence under `test-results/stock-count-responsive/`.

## User and workflow model

The product is used by kitchen and outlet staff under time pressure, usually on a phone or tablet, with managers and owners reviewing exceptions on larger screens. The dominant jobs are: see what needs attention, record a physical quantity, create/approve a request, receive a delivery, post a controlled inventory movement, and resolve an exception. A good flow must make the next action obvious, preserve context, and avoid forcing staff to learn the data model before completing a task.

## Baseline findings

### P0 — workflow clarity and reachability

1. **High-frequency actions were not consistently reachable on mobile.** The shell exposed the full navigation only through a menu and exposed page-specific actions through a separate bottom action bar. This made “what do I do next?” dependent on knowing the IA. Remediation started in the current wave with a role-aware Quick access menu in the top bar (`src/components/layout/quick-access-menu.tsx`).
2. **Stock Count needs an explicit progress mental model.** This was remediated in the previous wave: blank physical values, count progress, search/remaining filters, contextual remarks and a single mobile/tablet primary action. Targeted evidence: `test-results/stock-count-responsive/`.

### P1 — hierarchy, density and responsive composition

1. Several list and report surfaces give titles, metadata, explanatory copy and actions nearly equal visual weight. This increases scanning cost on 390px screens. Current evidence includes `dashboard.png`, `reports.png`, `suppliers.png` and `account.png`.
2. Form headers on procurement and stock workflows can still consume more vertical space than the task data. The next remediation wave will consolidate secondary metadata into compact summaries while retaining accessible labels.
3. Desktop-only right consoles are now suppressed until `xl`; tablet workspaces stay full width. This is verified by the Stock Count contract and should be propagated to remaining document workspaces.
4. Page action bars are useful for record workflows but should not compete with global task navigation. The shell audit will standardize when the bar is primary, secondary, or hidden.

### P2 — consistency and polish

1. Empty states, filter rows and action labels are not yet fully consistent across every master-data page.
2. Typography needs a deliberate hierarchy: page title, section title, primary value, supporting metadata and helper text should not all look like body copy.
3. Mobile sheets and dialogs need a shared “task first” pattern with a short title, one-sentence explanation, and one primary action.

The shared form label now uses a compact 12px hierarchy while controls retain a 44px touch target and readable value text. This is a global remediation, not a page-specific exception.

The shared empty state now uses a tighter mobile rhythm, and mobile record actions are labelled “More actions” so the bottom sheet describes what the user will actually open.

The Inventory Workspace overview now uses a compact mobile metric rhythm and the same 12px page gutter as other workspaces; desktop retains the wider dashboard spacing.

The mobile FilterBar result summary now shares the second control row instead of forcing a third row; the approved compact-filter regression and Stock Count responsive regression both pass.

The dynamic Transfer/Wastage/Production workflow audit now passes across phone, tablet, and desktop after giving the local Next dev server a bounded 45-second first-route compile window; layout and overflow assertions remain unchanged.

The receiving form's mobile primary action now says “Save receiving draft”. The previous “Record Receiving & Attach DO” label implied that the delivery-order attachment happened in this form, while the actual flow saves the GRN first and attaches the DO on the saved record before posting. The label now matches the server action and the side-panel next-step guidance.

The third UX review wave rechecked the remaining high-frequency mobile surfaces: purchase request/order creation, stock transfer, stock wastage, manual stock movement, production job creation, system backup, imports, and administration. At 390px these surfaces keep a single-column task flow, 44px-class controls, visible section context, and an actionable sticky primary where the workflow has one. No additional code change was justified by the evidence; tablet right-rail behavior remains delegated to the shared `xl` breakpoint contract.

The pre-release Playwright pass confirmed Stock Count responsive behavior and dynamic Transfer/Wastage/Production layouts, plus the inventory posting smoke flows. The procurement workflow suite now recognizes the canonical empty-state copy (`No requests match these filters`) and skips correctly when no live review fixture exists. The shared document-workspace contract now asserts the current tablet rule (right inspector hidden below `xl`) and scopes live approval links to table rows. Local E2E still requires the isolated test credentials and a stable local Supabase/Next process; missing live fixtures are reported as skips rather than product failures.

The disposable local release fixture was then refreshed with the Manager approval capability required by the focus-trap scenario, and the focused representative document-width plus mobile approval-sheet tests passed 2/2. Purchase Order creation is now treated as a form-shell fallback rather than incorrectly requiring document-workspace metadata.

## Classification

- **Current authority:** `src/app`, `src/components`, `src/lib/information-architecture.ts`, `src/app/globals.css`, current migrations, current tests and `DESIGN.md`.
- **Compatibility/operations required:** `scripts/`, `supabase/functions/`, maintenance/reset/backup scripts, E2E fixtures and local-only test helpers.
- **Historical reference:** dated audit documents and prior scan outputs.
- **Potential residual:** only files proven unreferenced by import/search and not required by migrations, scripts, tests or deployment are eligible for a later deletion pass. No deletion is performed in this baseline wave.

## Validation status

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm test -- --runInBand`: 200/200 pass.
- `npm run build`: pass; 87/87 routes generated.
- Stock Count responsive Playwright (390/768/1440): pass (1 test).
- Role workdesk capture produced all 36 screenshots for Owner, Finance, Manager, Purchasing, Kitchen and Outlet Staff across 1440/1024/768/430/390/360px. The deterministic manual-server rerun passed all 6 role tests, including activity destinations, denied routes and overflow checks.
- Full static 390px capture: all 76 screenshots were produced in a deterministic single-session run; the runner exceeded its command wall-clock timeout after capture, so this is evidence capture, not a green full-suite result yet. The audit runner was changed from parallel to serial to remove local Next/Supabase resource contention and navigation-race noise.

## Next remediation waves

1. Finish shell/navigation hierarchy and shared mobile action rules.
2. Compact procurement, receiving, production and daily-operation forms.
3. Standardize list/report cards, empty states, filters and typography.
4. Run all roles at all eight breakpoints, then typecheck, lint, full tests and build.
5. Produce a final GO / Conditional GO / NO-GO closure decision and checkpoint the branch.
