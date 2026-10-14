# Consolidated remaining acceptance — local candidate

This inventory supersedes overlapping “remaining” sections in the integration, attendance-policy and OT/PDF checkpoint reports. It is a scope inventory, not a claim that every route/state has passed. The 123-route component ownership matrix remains the exhaustive route index: `OMS_INTEGRATION_UI_MATRIX_2026-10-13.json`.

## New verification after abe81e30

- Recipe backend validation was reproduced: submitting an invalid ingredient left the page on an error boundary and discarded the form. Create/update now return preflight validation errors before mutations; the form retains controlled fields and shows an inline alert. Actual localhost browser repro now retains the synthetic note. Runtime tests exercise the real recipe schema, both actions, no database access on invalid input and unchanged permission rejection.
- The recipe catch is deliberately limited to parsing/reference validation. Ambiguous failures after header/document/line writes still require transactional/idempotent implementation before automatic resubmission can be considered safe.
- Reconciliation SQL regression now covers missing OT permission, a foreign-company claim, already-used credit, self-approval, locked attendance period and released payroll, in addition to the full reversal/correction/new-claim path. Migration 353 now explicitly rejects released payroll before ledger changes instead of waiting for the existing deferred payroll guard. Updated function applied only to the independent replay database. Main browser database remains 352.
- 1,608 tests passed; source lint/typecheck and Node 22 production build passed. Recipe browser evidence came from that rebuilt server.

## Local work still possible without user action

| Area | Exact remaining verification / implementation |
| --- | --- |
| People browser workflow | Two independently authenticated People users through correction-source selection, reversal submit, self-approval refusal, separate approval, punch edit and new OT claim; verify database ledger after each browser step. SQL coverage is not a substitute. |
| Roles / tenant scope | Browser API refusal for ordinary staff/manager lacking OT authority and a second tenant; positive People path with existing production-shaped permissions. Current new negative paths are SQL identity simulations. |
| 353 migration replay | Revised 353 full application from a fresh 352 database (latest change used CREATE OR REPLACE on the replay function), plus immutable schema/source evidence. No need for production access. |
| Form backend retention | Asset Transfer, Outlet Daily Record, Stock Count, Stock Transfer, Stock Wastage, Supplier Item, UOM Conversion still need actual rejected backend submission and retained-value/retry checks. Previous native validity tests do not cover this. |
| Recipe additional paths | Reference-read outage; update-form browser rejection; failure after a partial multi-table write requires safe recovery/idempotency design. No mutation-failure retry guarantee is claimed. |
| Custom dialogs | Complete per-component open/close, Escape, focus return, scrolling menu, long content, failed request retention and phone/zoom state coverage, using ownership matrix rather than repeatedly sampling already-passed states. Include RO correction and PDF export modal failure states. |
| Data-populated charts | Synthetic multi-point production forecast/wastage histories, pointer/keyboard selection, missing points, long labels, loading and unavailable states. Empty synthetic routes and upper-page contact sheets do not close this. |
| PDF export | Populated browser/API-to-download comparison against the same source rows as XLSX, single PDF and multi-outlet ZIP, rejected Final request with retained selections, other-role denial, multilingual long-name/note limits. Renderer populated three-page and empty-period Owner browser ZIP already passed. |
| Broader route states | Remaining cells in 123-route matrix: loading/empty/error/long/expanded/narrow/200% not backed by runtime evidence. Existing default-page screenshots cannot be promoted to all-state acceptance. |

## Requires real material, user acceptance or physical equipment

- Real employee alias/mapping correctness and user acceptance of the supplied schedule workbook/ambiguous business meanings. Synthetic mappings cannot certify actual personnel identities.
- Real production planning configuration/data quality and final business acceptance. No inferred yields/minima are approved by these local tests.
- Production operational acceptance, real attendance signatures/payroll and deployed browser workflow, only after separate release authorization and review. No production write is needed to finish the local rows above.
- Physical iOS/Android keyboard/viewport behavior and printer pagination; desktop emulation/PDF raster checks are supporting evidence only.
- Library external upload remains rejected by automatic approval review; requires direct human authorization for the identified files/destination before retry. Local reports/evidence remain available, so this does not block local development.

## Delivery boundary

No push, deployment, production migration or production data write. No takeover of the user's pending Chrome session. New files and synthetic evidence are local checkpoint material. The list above intentionally distinguishes pending work from external blockers; none of the local rows requires another user confirmation.
