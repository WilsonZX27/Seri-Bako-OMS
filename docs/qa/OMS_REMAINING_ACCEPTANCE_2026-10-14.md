# Consolidated remaining acceptance — local candidate

This inventory supersedes overlapping “remaining” sections in the integration, attendance-policy and OT/PDF checkpoint reports. It is a scope inventory, not a claim that every route/state has passed. The 123-route component ownership matrix remains the exhaustive route index: `OMS_INTEGRATION_UI_MATRIX_2026-10-13.json`.

## Earlier checkpoint after abe81e30 (historical)

- Recipe backend validation was reproduced: submitting an invalid ingredient left the page on an error boundary and discarded the form. Create/update now return preflight validation errors before mutations; the form retains controlled fields and shows an inline alert. Actual localhost browser repro now retains the synthetic note. Runtime tests exercise the real recipe schema, both actions, no database access on invalid input and unchanged permission rejection.
- The recipe catch is deliberately limited to parsing/reference validation. Ambiguous failures after header/document/line writes still require transactional/idempotent implementation before automatic resubmission can be considered safe.
- Reconciliation SQL regression now covers missing OT permission, a foreign-company claim, already-used credit, self-approval, locked attendance period and released payroll, in addition to the full reversal/correction/new-claim path. Migration 353 now explicitly rejects released payroll before ledger changes instead of waiting for the existing deferred payroll guard. Updated function applied only to the independent replay database. Main browser database remains 352.
- 1,608 tests passed; source lint/typecheck and Node 22 production build passed. Recipe browser evidence came from that rebuilt server.

## Current local acceptance (Recipe 355 and dialog follow-up)

The implementation and bounded verification below are complete locally. Broader route-state and conditional-fixture verification remains explicitly outstanding; these are not approval blockers or known defects.

| Area | Current result / remainder |
| --- | --- |
| People browser workflow | Passed two independently authenticated People users through reversal, self-approval refusal, separate approval, time correction and corrected OT credit. Final ledger30minutes and approved OT1800seconds. |
| Roles / tenant scope | Passed foreign-company staff/manager/other-manager/owner browser/API denials, and same-company missing sensitive-export/OT-approval grant denial; no ledger mutation. SQL permission/tenant denials remain complementary evidence. |
| Migration replay | Revised353 fully applied mainlocal;354 and355 applied both local databases. Full four-punch SQL passed independent replay. No production migration. |
| Form backend retention | Seven forms passed14actual rejected submissions/retries. Supplier Item/UOM/Stock Wastage repaired. Recipe update/reference-outage separately passed2checks. |
| Data-populated production charts | Seven history scenarios passed: three widths, missing points, pointer/keyboard, loading, failure+retry, empty and long label. Two assetcharts×3modes also passed. Packaging adds12 passing populated/long/empty/loading/error cases using a read-only synthetic RPC fixture; this does not verify SQL aggregation. |
| Recipe additional paths | Atomic create/update/copy completed:15 injected rollback cases, same-key replay, concurrent create/update/copy, permission/tenant and active/archived refusals, numerical costing parity. Final-build browser proves retained input and frozen key/timestamp across failure and a masked committed acknowledgement, without duplicate snapshots. See recipe write-boundary report. |
| Custom dialogs | 6owners×3modes passed, including nested Escape and focus return. Five additional dialog branches×2widths passed10cases with zero writes. The dialog/chart supplement now contains53 explicit cases; full conditional branches remain unverified. |
| PDF export | Populated seven-day PDF/XLSX/database comparison, Final refusal+retained selections, scoped denials, monthly multilingual pagination, oversize rejection passed. Two populated outlets also passed the actual browser ZIP download; both PDFs were read back, including Chinese employee/outlet text and four punch times. Oversized names/notes are rejected explicitly. |
| Broader route states | Historical123routes/1107cells:544substantive,563partial/unverified. This is an applicability/evidence backlog, not563known defects; targeted new evidence must be joined by owner. Packaging follow-up complete.37 historical content cells classified N/A with source evidence; remaining cells require owner-specific reconciliation. |

Final source gates:1,617/1,617 tests, strict TypeScript, source ESLint and Node22 production build passed with Recipe/Packaging changes. Final browser probes used that build. Both local databases match migration355’s exact function body SHA256 `f46bb3166798db04488af69d0e595aca99e84161164ca69fc5c9da1d8ab133d0`. See `OMS_REFRESH_PARITY_2026-10-14.md`, `OMS_SEVEN_FORM_RETENTION_2026-10-14.md`, `OMS_DIALOG_CHART_ACCEPTANCE_2026-10-14.md` for exact evidence boundaries.

## Remaining local verification

- Conditional fixtures: posted Stock Count Void; legacy count review; PR review/repair/unresolved lines; eligible GRN missing-DO guard; account with avatar; controlled session timeout. These are local fixture work, not external blockers.
- Populated chart owner families still needing evidence reconciliation: Outlet Daily wastage, Demand, Inventory, Procurement variance, Production variance, Costing readiness, Recipe/product margin and Stock Count variance. Shared chart behavior does not establish their data transformations.
- See the dialog/chart report for exact prerequisites and the unchanged historical route matrix for broader acceptance scope. No claim of complete application-wide acceptance is made.

## Requires real material, user acceptance or physical equipment

- Real employee alias/mapping correctness and user acceptance of the supplied schedule workbook/ambiguous business meanings. Synthetic mappings cannot certify actual personnel identities.
- Real production planning configuration/data quality and final business acceptance. No inferred yields/minima are approved by these local tests.
- Production operational acceptance, real attendance signatures/payroll and deployed browser workflow, only after separate release authorization and review. No production write is needed to finish the local rows above.
- Physical iOS/Android keyboard/viewport behavior and printer pagination; desktop emulation/PDF raster checks are supporting evidence only.
- Library external upload remains rejected by automatic approval review; requires direct human authorization for the identified files/destination before retry. Local reports/evidence remain available, so this does not block local development.

## Delivery boundary

No push, deployment, production migration or production data write. No takeover of the user's pending Chrome session. New files and synthetic evidence are local checkpoint material. The list above intentionally distinguishes pending work from external blockers; none of the local rows requires another user confirmation.
