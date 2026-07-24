# Seri Bako OMS UI Responsive Audit — 2026-07-24

## Verdict

**Conditional GO for UI release.** The shared shell and static workspaces meet the agreed responsive contract. Dynamic, data-dependent detail workflows still require an authenticated local fixture run before production sign-off; this is an evidence gate, not a detected layout defect.

## Scope

- 90 current App Router page/loading/error/not-found surfaces under `src/app/(app)`.
- Shared shell, navigation, tables, forms, document workspaces, mobile action bars, overlays, and media rules.
- Viewports: 320, 390, 640, 768, 1024, 1280, 1440, and 2560px.
- Static route matrix: 76 canonical workspaces × 8 viewports = **608 page checks**.
- Current implementation contract: [`DESIGN.md`](../../DESIGN.md).

## Evidence

| Check | Result | Evidence |
|---|---:|---|
| Static workspace layout audit | **608/608 pass** | `tests/e2e/static-workspace-layout-audit.spec.js` and `test-results/static-workspace-layout-audit/`; each route now checks page overflow plus visible interactive controls staying inside the viewport, excluding intentional contained table scrolling |
| Stock Count mobile visual review | **Pass** | `test-results/static-workspace-layout-audit/stock-counts--new.png` |
| Contract/unit tests | **200/200 pass** | `npm.cmd test` |
| TypeScript | **Pass** | `npm.cmd run typecheck` |
| Lint | **Pass** | `npm.cmd run lint` |
| Production build | **87/87 routes generated** | `npm.cmd run build` |
| Stock Count dynamic Playwright | **1/1 pass** | `tests/e2e/stock-count-responsive.spec.js` on local production server; mobile/tablet/desktop assertions passed |
| Transfer/Wastage/Production responsive workflow audit | **1/1 pass** | `tests/e2e/dynamic-workflow-responsive-local.spec.js`; all three new-form routes at 390/768/1440px, visible title, parsed styles, no page overflow, and in-bounds controls |
| Procurement closure dynamic Playwright | **2/3 pass** | PR creation/submission and Manager/Purchasing/Finance review gates passed; final payment/close scenario stopped at local Auth throttling after repeated role switches |

## Responsive conformance

- Mobile-first base layout is used; tablet and desktop enhancements begin at 640/768/1024/1280px.
- Page structures use grid/flex and `minmax(0, 1fr)` rather than fixed page widths.
- Tables are contained by the shared `sb-table-region`; mobile operational lists replace dense tables.
- Global media elements are constrained to `max-width: 100%` and `height: auto`.
- The document root prevents page-level horizontal overflow while local tables retain intentional contained scrolling.
- Mobile controls use the shared 44px control token; Stock Count physical quantity fields use a larger touch-friendly field (`min-width: 9rem` on mobile).
- Mobile document actions reserve bottom space and use a neutral action-bar border; the action bar does not imply a completed state.
- Reduced-motion behavior is defined globally.

## Page-level review highlights

### Inventory and Stock Count

- Count Date, Tolerance, and Branch remain visible at the start of the flow.
- Count notes and line notes use progressive disclosure, reducing vertical fatigue.
- Physical quantity and unit remain adjacent; theoretical quantity and variance remain visible for decision-making.
- Branch changes reset editable rows through the server-backed query boundary, preventing PJS10/ALMA cross-display residue.
- Empty branch inventory is explicit and actionable rather than a blank form.

### Lists and operational workspaces

- Dense desktop tables have compact mobile list equivalents.
- Filters wrap on mobile and move secondary filters into a contained sheet/popover below 1280px.
- Long identifiers and names use `min-w-0`, truncation, or wrapping; no page-level overflow was observed in the 608-check matrix.
- Primary actions remain visible in the mobile action bar; secondary actions are not allowed to crowd the primary action.

### Documents and forms

- Document status and next action are placed before secondary metadata.
- Tablet document inspectors appear at 768px and full right rails at 1280px+.
- Upload, comment, approval, cancel, posting, and backup actions retain distinct consequences and accessible focus states.
- Loading, empty, error, and read-only permission states are represented by shared system components.

## Remaining release gate

Complete the remaining dynamic local fixture suite after the local Auth throttle is cleared:

1. Transfer and Wastage: draft → review → posting/cancel controls (mutation/state-transition coverage; responsive form audit is now pass).
2. Complete the final procurement payment/PO-close scenario after local Auth throttling clears.
3. Supplier Invoice: invoice detail, payment controls, and AP report responsive behavior.
4. Production Job: input/output lines, posting guardrails, and narrow viewport overflow (responsive form audit is now pass).

No formal data import, production deployment, or production database operation is part of this audit.
