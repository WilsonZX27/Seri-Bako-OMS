# Local batch import and schedule comparison candidate

This is local implementation evidence, not a production release. No production import, migration, push, merge or deployment was performed.

## Integration coordination

Temporary migration identifiers, awaiting coordinator numbering after 346/347:

- `202610140001_schedule_partial_import.sql`: `schedule_workbook_receipts`; private append validator; append import and scoped history RPCs.
- `202610140002_schedule_attendance_refresh.sql`: `attendance_schedule_refresh`; assignment-change trigger; private employee-day calculation layers; permission-checked refresh RPC.

Neither migration replaces the existing save/submit/publication or weekly calculation functions. Maintenance, export and payroll access policy are outside this change. The import append transaction briefly takes a table write lock to serialize its existence check with roster writes; validate operational contention before production rollout. The scoped calculator copies existing pay-rule layers, which must be kept in sync with future pay-policy changes.

## Actual workbook check

Local user-provided `10 SERI BAKO OCT SCHEDULE 2026 (1).xlsx` is 114966 bytes, SHA256 `2afec619e6145fc62ff65f0ff24d941d73f713a9788ce42bb2af6baefafcbbe5`.

All ten visible sheets read successfully for 12–18 October: GURNEY PLAZA, QUEENSBAY, PUBLIKA, IOI PUCHONG, JAKEL SQUARE, TRX, PETALING STREET, SUNWAY PYRAMID, MID VALLEY, VELOCITY. Structural scan found 42 employee source rows, 221 preserved note regions and two unattached schedule notes. Hidden rows/columns are reported, not inferred.

**Real employee matching is not yet verified.** The available tools do not expose the user's production browser session, which was previously at idle-timeout. No authorized live employee catalog was available. The structural scan deliberately supplied no staff; its employee-not-found counts are not evidence of a matching failure. Private workbook-derived output is ignored under `outputs/qa/schedule-matching/private-new-workbook-structure.json`, never a tracked fixture.

## Current behavior

- One upload previews every included sheet. Suggested outlet mappings can be corrected or explicitly excluded together.
- Week is editable inside the existing compact dialog; no outside navigation/re-upload required. Source dates still cannot be silently moved.
- Employee matching focuses on uncertain rows; matched rows remain inspectable. Missing end-time overrides are scoped to a sheet.
- Every duplicate employee-day candidate is excluded, leaving unrelated valid rows available.
- Explicit outlet and row selections append only new days. Existing current rows are preserved exactly; submitted/published/locked rosters cannot be appended.
- Per-outlet results survive failures, and the same selected payload has a stable server-side request hash. Retrying retrieves its receipt. Corrected remaining rows can be previewed and appended later. Recent successful receipts are available from the catalog.
- Every assignment mutation queues its employee-day with a monotonic source revision/hash. Successful schedule mutations and punch imports invoke the bounded refresh runner where the actor already has attendance calculation permission. No role permissions were added.
- The review page displays pending/calculating/failed/waiting/needs-review states and retry. Users without existing calculation permission leave work queued for an authorized attendance reviewer; this is not a new privileged background service.
- Scoped calculation unions immutable evidence across finalized uploads and uses the original matching window, including midnight/week boundaries. Repeated uploads do not duplicate event IDs.
- Reviewed, adjusted, locked or approved-report days are marked needs-review, preserving the old result. Nonworking/deleted/ambiguous source shifts require review instead of silently retaining an authoritative stale calculation.

## Confirmation/export integration contract

Confirmed process: **People prepares → Staff checks → Supervisor verifies → Manager approves → People calculates payroll, validates and publishes.** The self-service worker owns those transitions and permissions; this patch does not implement or change them.

Shared pure helper: `src/lib/attendance/review-version.ts::attendanceReviewContentVersion`, contract **attendance-review-v2** (supersedes the initial v1 proposal). It returns the explicit `attendanceContent` projection, SHA-256 `version`, and separate `calculationReady` freshness indicator. The confirmation UI must display this projection's attendance facts, or coordinate its display whitelist before adopting the digest. Fields include scheduled/actual clock and break times, worked/presence/payable time in seconds, late/early time, punch counts/evidence and visible exception statuses, scoped by employee/date/location identity. It excludes all salary, payroll amounts/rates, monetary meal allowance and unknown fields. Monetary allowance confidentiality and payroll-calculation versions belong to the payroll workflow, not this attendance digest.

`review_status`, result IDs/calculation revision numbers, source hashes, source revision numbers and bookkeeping timestamps do not enter the employee-content digest. They remain separate audit/freshness references. Recalculation may produce a new result ID while the exact displayed attendance remains unchanged; this must **not** force Staff to sign again. Salary/rate changes invalidate the separate payroll calculation even if attendance is unchanged. A source change first blocks freshness until calculation completes, then the workflow compares actual attendance content before deciding whether confirmations are stale.

When content changes before payroll publication, the workflow must retain the prior signature as history, mark the chain stale, and return it to People preparation; Staff, Supervisor and Manager must confirm the new version. Do not copy signatures onto revised content. A payroll-locked or published period must keep its released snapshot immutable and use the established correction/reopening process. `calculationReady` is only a freshness check, **not** authority to approve or publish payroll. The workflow worker must connect its new payroll-lock/confirmation guard before release; the existing guard in this patch does not claim knowledge of schema that worker has not supplied.

Read the existing-authority projection of `attendance_schedule_refresh` keyed by `(company_id, staff_id, work_date)`. Never grant broad direct table access to staff merely for integration.

Fields: `source_revision` (monotonic bigint), `source_hash` (opaque digest), `calculated_revision`, `status`, `updated_at`. A new result's `calculation.schedule_source_revision` and `calculation.schedule_source_hash` record the exact input version used.

A staff confirmation binds the displayed-attendance content digest. Persist result/source revisions as audit references, and check calculation readiness against current locked source/result rows when accepting later transitions; do not use a changed audit ID alone as a reason to revoke unchanged attendance confirmation. The workflow RPC must make its fresh comparison atomically under the relevant row locks; the pure helper by itself is not a database transaction or payroll approval guard. Missing source readiness, an uncalculated source or status other than `ready` blocks a new acceptance until resolved. Existing legacy-day admission remains an explicit workflow policy. Existing payroll confirmation tables/flows are owned by the other worker and have not been modified here; their payroll-locked/published-state guard must be integrated before release. The current database protection covers attendance review/adjustment/period-lock/approved-report state.


The queue upsert holds its row while calculating. A concurrent later schedule change increments the source version and requeues after that transaction, making the earlier result visibly stale. A bounded call handles up to 100 days; the review UI continues pending batches. No external scheduler/notification automation was created.

## Validation

- Final gates after the v2 correction: **1565 Node tests passed, 0 failed**; TypeScript, full ESLint and production build passed. Full-suite rerun replaces reliance on the earlier focused-only check.
- Both migrations/functions applied only to the disposable local synthetic database.
- Rollback SQL: stable request replay; collision rejection; second-day append preserves the exact first row; punches before roster; union/deduped Sunday-to-Monday evidence split between upload weeks; unchanged unrelated result; idempotent refresh; reviewed result preserved and flagged after schedule changes.
- Synthetic browser: matching/manual corrections, explicit outlet selection, stale preview invalidation, dropdown bounds and no dialog overflow at 320/390/1440; source remarks/balances stay separate. All schedule import POSTs blocked in that UI test.
- Actual catalog acceptance, production rollout and payroll confirmation integration remain outstanding. Independent-session import and refresh concurrency checks described below now pass.

The v2 content-version checks cover workflow-only stability, displayed attendance changes, salary/rate/monetary-allowance exclusion, identity-only rematerialization, source freshness, and malformed punch payload exclusion. No additional migration or role grant is required by this helper.

## Extended verification after the confirmation-flow change

- Six simultaneous identical import requests: one append and five idempotent receipt responses.
- Two distinct keys competing for the same staff-day: one success and one explicit non-overwrite conflict.
- Two-outlet partial success, failed second outlet, corrected retry: the first outlet's exact row remains unchanged.
- Staff without draft permission, foreign-company outlet access, and direct access to private day-calculation RPCs are denied.
- Roster-before-punches starts in `waiting_punches`; after immutable evidence arrives, six simultaneous refreshes create one revision.
- A Sunday-to-Monday shift with punches split between upload weeks totals once in its originating week, with no duplicate next-week day.
- Injected day-calculation failure rolls back the attempted result revision, records failure, and succeeds exactly once after retry.
- A locked period preserves its prior complete result and transitions the queue to `needs_review`.
- A real concurrent schedule edit blocked behind a running refresh requeues the newer source after the first worker commits; its revision remains greater than the calculated revision until another refresh succeeds.
- Mocked browser partial-failure test passes: select both outlets, retain the first success, retry only the failed outlet with the same payload, and disable import after both succeed. No browser import reached the database. Reproducible script: `scripts/attendance/verify-schedule-batch-ui-local.cjs` (requires the existing local release fixture and port 3188 server).
- Local scripts use only the named disposable Docker database and synthetic fixture users; this run's records are cleaned up. Scripts: `scripts/attendance/verify-schedule-concurrency-local.mjs` and `verify-schedule-refresh-concurrency-local.mjs`.

## Live catalog blocker and minimum user step

The required session is the user's existing **OMS browser tab at `https://system.seribako.com.my`**, last observed at `/access-status?reason=idle-timeout`. The minimum user action is to sign in there again with their normal authorized account. The workbook need not be downloaded again. The coordinating browser-capable task can then read only `/api/attendance/schedule/import-catalog?week=2026-10-12` in that same session and provide its private local catalog result for this verifier. No passwords, cookies, service-role credentials, expanded grants or real imports are needed or requested. This execution environment itself has no callable production-browser/session reader; signing in alone does not give these local tools that session.

Final log evidence: `/tmp/schedule-final-full-tests.log`, `/tmp/schedule-final-full-lint.log`, `/tmp/schedule-final-types.log`, `/tmp/schedule-final-build.log`, `/tmp/schedule-final-import-concurrency.log`, `/tmp/schedule-final-refresh-concurrency.log`, `/tmp/schedule-final-append-sql.log`, `/tmp/schedule-final-refresh-sql.log`, `/tmp/schedule-batch-resume-ui.log`. All use the local candidate and synthetic fixture; no production mutation or expanded credential grant occurred.
