# Local OT reconciliation and attendance PDF checkpoint

This candidate is local only. No push, deployment, production migration, real payroll or business-data mutation was performed. Previous checkpoint: `8a8fe768f71ea77e7ebe993611e40754ac4e9cc1`.

## Changes and evidence

- Migration 353 links a separately approved negative correction to its original credited OT claim. Pending correction leaves credit unchanged; approved correction allocates the original earning completely, cancels the claim and clears approved OT. A subsequent punch correction can then invalidate the employee signature and allow a corrected claim. Previously used credit is blocked.
- Synthetic rollback verified used-credit rejection, self-approval rejection, 60-minute reversal, signature preservation for the money-only reversal, signature invalidation after time correction, and a new 30-minute claim leaving exactly 30 net RO minutes.
- Competing approvals on one OT claim and on one reversal each produce exactly one success. Two competing 30-minute allocations against a 40-minute earning produce only one allocation, totaling 30.
- The synthetic People fixture initially omitted `comp_time.read`. Migration 265 already grants read/submit/approve to `people_operations`; the fixture was corrected to match that existing policy. No production role permissions were expanded.
- PDF uses the same permission-scoped sheet data and sensitive export route as XLSX, including final-period checks. It shows four punches, net work, approved and pending OT separately, Short Hours, and blank PPH; no monetary or new salary rules.
- The Noto SC font is subset before embedding because pdf-lib/fontkit's own subsetting rendered missing glyphs. Independent MuPDF raster inspection now shows complete Chinese and Latin text. Synthetic 31-day output is three landscape pages and 27,339 bytes. Font license/provenance is bundled; Next build tracing includes the static font.
- Actual local Owner browser download produced a 42,298-byte ZIP containing three valid PDF files, one per synthetic outlet. This was an empty-record period: populated values/pagination are covered by the separate 31-day renderer fixture. Do not call the browser result populated business-data acceptance.

## Gates

1,607 Node tests passed; TypeScript and source ESLint passed. Node 22 production build passed. Download and concurrency evidence is in `evidence/2026-10-14/ot-pdf/`. Original test/build logs remain under `/tmp/oms-final-tests.log`, `/tmp/oms-new-lint-final.log`, `/tmp/oms-restored-types.log`, `/tmp/oms-pdf-build.log`.

## Remaining acceptance

Migration 353 is applied only to the independent replay database. Separate-role browser reconciliation, released-payroll/locked-period negative paths specifically for 353, and production-like populated download acceptance remain outstanding. Main local browser database remains at 352. Broader backend form failure retention, recipe preflight error handling, and remaining custom-dialog/chart states from the prior handoff remain open. This checkpoint does not claim completion of those tasks or readiness to deploy.

Library delivery remains blocked by automatic approval review of external upload; no Library files were created and no retry was made. Local report and synthetic evidence remain available here.
