# Consolidated remaining acceptance — local candidate

This inventory supersedes overlapping “remaining” sections in the integration, attendance-policy and OT/PDF checkpoint reports. It is a scope inventory, not a claim that every route/state has passed. The 123-route component ownership matrix remains the exhaustive route index: `OMS_INTEGRATION_UI_MATRIX_2026-10-13.json`.

## Earlier checkpoint after abe81e30 (historical)

- Recipe backend validation was reproduced: submitting an invalid ingredient left the page on an error boundary and discarded the form. Create/update now return preflight validation errors before mutations; the form retains controlled fields and shows an inline alert. Actual localhost browser repro now retains the synthetic note. Runtime tests exercise the real recipe schema, both actions, no database access on invalid input and unchanged permission rejection.
- The recipe catch is deliberately limited to parsing/reference validation. Ambiguous failures after header/document/line writes still require transactional/idempotent implementation before automatic resubmission can be considered safe.
- Reconciliation SQL regression now covers missing OT permission, a foreign-company claim, already-used credit, self-approval, locked attendance period and released payroll, in addition to the full reversal/correction/new-claim path. Migration 353 now explicitly rejects released payroll before ledger changes instead of waiting for the existing deferred payroll guard. Updated function applied only to the independent replay database. Main browser database remains 352.
- 1,608 tests passed; source lint/typecheck and Node 22 production build passed. Recipe browser evidence came from that rebuilt server.

## Current local acceptance (after refresh-parity repair)

Five of the nine original groups have the scoped acceptance below. Four still contain additional engineering or verification work; these are not approval blockers.

| Area | Current result / remainder |
| --- | --- |
| People browser workflow | Passed two independently authenticated People users through reversal, self-approval refusal, separate approval, time correction and corrected OT credit. Final ledger30minutes and approved OT1800seconds. |
| Roles / tenant scope | Passed foreign-company staff/manager/other-manager/owner browser/API denials, and same-company missing sensitive-export/OT-approval grant denial; no ledger mutation. SQL permission/tenant denials remain complementary evidence. |
| Migration replay | Revised353 fully applied mainlocal;354 applied bothlocaldatabases. Full four-punch SQL passed independent replay. No production migration. |
| Form backend retention | Seven forms passed14actual rejected submissions/retries. Supplier Item/UOM/Stock Wastage repaired. Recipe update/reference-outage separately passed2checks. |
| Data-populated production charts | Seven history scenarios passed: three widths, missing points, pointer/keyboard, loading, failure+retry, empty and long label. Two assetcharts×3modes also passed. Packaging-specific follow-up remains under broader workspace acceptance. |
| Recipe additional paths | Preflight retention passed. Atomic create/update/copy and version/snapshot concurrency still being implemented; current multi-request writes can leave partial state. See recipe write-boundary report. |
| Custom dialogs | 6owners×3modes passed, including nested Escape and focus return. 37sourceowners’ complete conditional/long/error branches are not all verified. |
| PDF export | Populated seven-day PDF/XLSX/database comparison, Final refusal+retained selections, scoped denials, monthly multilingual pagination, oversize rejection passed. Empty multi-outletZIP had passed earlier; populated multiple-outletZIP and exhaustive long multilingual combinations remain. |
| Broader route states | Historical123routes/1107cells:544substantive,563partial/unverified. This is an applicability/evidence backlog, not563known defects; targeted new evidence must be joined by owner. Packaging populated/long/empty transition follow-up underway. |

Current source gates:1,615 tests, strict TypeScript, source ESLint and Node22production build passed before ongoing Recipe/Packaging follow-ups. See `OMS_REFRESH_PARITY_2026-10-14.md`, `OMS_SEVEN_FORM_RETENTION_2026-10-14.md`, `OMS_DIALOG_CHART_ACCEPTANCE_2026-10-14.md` for exact evidence boundaries.

## Requires real material, user acceptance or physical equipment

- Real employee alias/mapping correctness and user acceptance of the supplied schedule workbook/ambiguous business meanings. Synthetic mappings cannot certify actual personnel identities.
- Real production planning configuration/data quality and final business acceptance. No inferred yields/minima are approved by these local tests.
- Production operational acceptance, real attendance signatures/payroll and deployed browser workflow, only after separate release authorization and review. No production write is needed to finish the local rows above.
- Physical iOS/Android keyboard/viewport behavior and printer pagination; desktop emulation/PDF raster checks are supporting evidence only.
- Library external upload remains rejected by automatic approval review; requires direct human authorization for the identified files/destination before retry. Local reports/evidence remain available, so this does not block local development.

## Delivery boundary

No push, deployment, production migration or production data write. No takeover of the user's pending Chrome session. New files and synthetic evidence are local checkpoint material. The list above intentionally distinguishes pending work from external blockers; none of the local rows requires another user confirmation.
