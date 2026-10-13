# Schedule workbook matching — local verification, 13 October 2026

## Delivery boundary

Independent branch `codex/schedule-staff-matching-20261013`, based on `1384545d` (the existing compact import dialog/date recovery fix). Remote `origin/main` remains `cbf531c6`; it does not contain that complete importer baseline. Review the baseline relationship before integration. The separate maintenance release `a79e9870` is untouched. No push, merge, deployment, production migration, staff mutation or production schedule import was performed.

## Changes

- Import catalog retains the existing authenticated, company-scoped schedule RPC and now exposes its Staff ID (`staff_code`). It does not broaden outlet scope, create employees or change eligibility. Invited staff remain governed by the existing date-effective eligibility result. Migration 345 is not modified or bundled.
- The parser recognizes explicitly labelled Staff ID/name columns before the date columns. It never treats POSITION, contact information or row numbers as Staff ID. Numeric ID text and zero-padded Excel formats are preserved, with canonical numeric comparisons and duplicate detection.
- Staff ID takes priority, with compatible abbreviated names. Normalised names support case, punctuation, full-width text and Chinese whitespace. Unique whole-word keywords can match; common keywords, duplicate IDs/names, unknown IDs and ID/name disagreement require confirmation. Manual selections remain restricted to the current permitted outlet catalog and date eligibility.
- Every source employee row has a file-hash/sheet/row/outlet-bound identity. Selecting another employee invalidates the old preview. Rechecking rebuilds assignments and revalidates immutable schedule collisions. Other readable rows remain in the preview.
- Known destination markers including GURNEY link to the same matched person's unique destination shift on the same date. Their real source times are retained; no universal support shift is invented. Preview metadata retains both source rows. Competing working-time records have an in-dialog source-shift chooser, and selecting one invalidates the preview until rechecked.
- A one-letter destination spelling variation offers a confirmation candidate. It never changes the destination automatically. Business labels such as HALF DAY or REPLACE OT remain unresolved rather than being guessed or silently hidden by another outlet's shift.
- Hidden sheets/rows/columns are skipped, with explicit notices. Blank-name rows never inherit a neighbouring employee. Multiple visible date windows matching the same week are blocked with an explanation. The source format `8:30: AM` is accepted as an explicit 08:30 time.

## Original-source evidence and limits

The supplied October workbook was independently downloaded and inspected in the parent task's cloud environment. That inspection reported ten visible outlet sheets, A=names, B=positions, no Staff ID column, varied date-header rows, hidden historical columns/rows, and complementary support-marker/destination-time records. The local tests use equivalent synthetic names and cells; no actual workbook or staff data is committed.

This Mac could resolve the exact Library file but its required download helper returned `Library prepare_materialize is not available`, including one retry with the supported runtime. This was a tool availability failure, not a permission rejection. Downloads were not retried indefinitely or replaced with an unauthorized path. **The exact complete workbook has not been parsed by this changed code on the Mac.** The latest error screenshot was downloaded through the supported local transfer and its pixels inspected: it showed GURNEY destination-time issues and a duplicate employee/day issue.

No production staff catalog was queried in this task, so exact real employee-to-OMS mappings remain unverified. End-to-end verification against the original workbook and authorized staff catalog is still required before release. Any separate pending migration 345/production eligibility fix remains a separate decision; these tests do not claim to validate its deployment.

## Verification

- `node --test tests/*schedule*.test.js`: **57 passed, 0 failed**.
- `npx tsc --noEmit`: passed.
- ESLint for the three changed TypeScript/TSX files: passed.
- `git diff --check`: passed.
- Dedicated local Next server at port 3188, isolated Supabase and synthetic login; the import catalog was intercepted with synthetic data. Import POST was prohibited by the test harness.
- Browser checks passed for Staff ID abbreviation, unresolved row retention, manual employee mapping, stale-preview disabling/recheck, overlapping-shift selection, and explicit misspelled-destination confirmation.
- 320, 390 and 1440 px: dropdown bounds and dialog horizontal overflow checks passed. The 320 px screenshot was visually inspected. These are targeted checks, not a claim of exhaustive device or screen-reader certification.

Local-only evidence: `outputs/qa/schedule-matching/ui-check.cjs`, `matching-320.png`, `matching-390.png`, and `matching-1440.png`. All screenshot contents are synthetic. No schedule was submitted.
