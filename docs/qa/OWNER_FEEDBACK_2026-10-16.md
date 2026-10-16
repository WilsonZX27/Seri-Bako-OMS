# Owner feedback repair — 16 October 2026

Status: local patch; not deployed. No Production business records or configuration were changed. Migration 357 is prepared and tested in an ephemeral PGlite database only.

## Source authority

The original workspace is at 42a228ae with extensive pre-existing changes. The current released-source checkout is `outputs/oms-integration-2026-10-13` at 0a1d442d, version 9.2.106. The live screenshots and source in this checkout agree: asset routes explicitly hid the console. This patch is in that checkout, preserving the original workspace.

## Feedback disposition

| Comments | Result |
| --- | --- |
| 1–5 | Remove asset console hiding; restore Checklist, Maintenance and new Transfer context. Move Report a problem from the canvas to a red console action with warning icon. |
| 6 | Remove Viewing trend text; highlight the complete selected packaging row. |
| 7–8 | Replace bare empty messages with clear confirmation/payslip readiness, responsibilities and next steps. Existing People/Staff permissions remain authoritative. |
| 9 | Verified source: Awaiting Finance maps to Posted without finance close time. Posted GRNs already affect the ledger; draft receipts do not. Physical Stock Count remains an actual count, not a second receipt entry. |
| 10–12 | Compact attendance credit/pending values; use accessible icon actions for adjustment, reporting, schedule and OT. |
| 13–15 | Import → Fix import → Review → Import; workbook and week share two desktop columns. Modal reserves viewport space; scroll stays in its body and actions remain visible. |
| 16–19, 23 | Keep week/period pair; pair format/status; automatically inspect status when date/period changes; remove Refresh and outlet divider lines; two-column equal-height outlet selections. |
| 20–22 | Equal-height holiday branch choices, Select all, and expandable branch lists instead of long inline location text. Holiday forms stack below 1280px to prevent cramped tablet controls. |
| 24 | Fix comparison select using uncontrolled form state. The previous controlled value had no update callback. |
| 25 | Functions differ: Planning forecasts quantities and outlet allocations; Jobs records recipe batches and posts ingredient/output inventory. Neither function was deleted. |
| 26–28, 30 | Full-width evidence/help; shorter setup copy; detailed setup remains collapsed. |
| 29 | No Production settings were changed. Baked products should not all be assigned Same-day history without confirming same-day use. By order only is available; yield 1 represents pieces. Outlet minimums need actual operational confirmation. |
| 31–32 | Show hidden appears beside the Supply period header, with a compact-view counterpart. |
| 33 | Remove the visible Close button from PlanningDialog; Escape and backdrop dismissal remain. |
| Image 1 | Attendance workbook body uses Arial regular, not Arial Narrow. Header emphasis stays bold. |
| Production PDF | Portrait A4, combined production and outlet columns, repeated headers only for actual overflow. Supplied six-page PDF now fits one page. |

## Other-location transfer

Migration 357 permits `kind=other` with no branch, for non-operating asset destinations such as Hostel. Owner registers its name from the transfer console. Existing access policy already restricts non-branch destinations to the Owner; this patch does not widen anyone's scope. Source and destination retain request/approve/dispatch/receive steps, reservations, transit and receipt history.

The ephemeral database rehearsed Rice grinder 1; Silver Tray Long 74; Silver Tray Short 26; Cashier Box 2; Yellow Tray 7; Chicken Bowl baskets 8; Ice box 1; Ice maker 1; Sink Big 1; Sink Small 1. It checked source reduction at dispatch, no destination holding before receipt, exact destination addition, repeated receipt rejection, location-registration retry, non-Owner denial and foreign-company isolation. These quantities are synthetic test fixtures, not verification that the real asset register holds these amounts. Basket quantities still require physical/unit confirmation before real transfer.

Water chestnut starch 44 cartons / 660kg is inventory, not equipment. It was not submitted as an asset transfer. A stock destination and its unit conversion must be configured and verified before moving this stock to Hostel; the new asset location does not automatically create an inventory branch.

Asset registration, edits, holdings, checks, maintenance, attachments, history and transfer lifecycle exist, but full operational completeness is not claimed: this patch's new destination workflow is not deployed and the real PJS10 manifest has not been matched to asset IDs or submitted.

## Read-only live findings

On 16 October, the item master search returned four Five Spice products. Stock Balance showed ORIENTAL00080, FIVE SPICE POWDER 730G, CK @ PJS10, 3.6 KG. No Quick item appeared in that search. This is a point-in-time observation, not proof that no differently named Quick item exists.

## Verification

- TypeScript and ESLint passed.
- 1,623 repository tests passed, including updated portrait export and Arial coverage.
- Application production build passed with synthetic loopback configuration; no hosted build or deployment performed.
- Asset PGlite regression passed, including migration 357 and the ten-item synthetic manifest.
- Supplied PDF: all 38 product rows, 76 outlet values, production, event and retained quantities reconciled exactly. Null, zero and non-applicable tray values remain distinct. Output is one A4 portrait page.
- Actual shared components were checked in an isolated local fixture that blocks business writes: import parsing across ten outlets, immutable/current-day exclusions, 8 selectable outlets, separated correction/review, visible footer, 390px and desktop overflow checks, two-column export selection, and equal 56px branch choices.
- Responsive intent: desktop console starts at 1280px; 1024–1279px uses the shared task rail; 768–1023px stacks actions; phones use shared mobile actions. Show hidden follows the production form's existing 1280px desktop breakpoint.

Artifacts: `artifacts/feedback-2026-10-16/`. Screenshots are explicitly synthetic component verification, not acceptance screenshots of a deployed release. A real multi-role hosted acceptance pass and Production migration/deployment remain outstanding.
