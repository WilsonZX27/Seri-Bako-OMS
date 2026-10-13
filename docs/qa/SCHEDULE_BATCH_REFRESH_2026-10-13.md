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

Read the existing-authority projection of `attendance_schedule_refresh` keyed by `(company_id, staff_id, work_date)`. Never grant broad direct table access to staff merely for integration.

Fields: `source_revision` (monotonic bigint), `source_hash` (opaque digest), `calculated_revision`, `status`, `updated_at`. A new result's `calculation.schedule_source_revision` and `calculation.schedule_source_hash` record the exact input version used.

A staff confirmation must bind both the result revision and this source version/hash. Treat a mismatch, a missing calculated revision, or status other than `ready` as stale/unconfirmed. Recheck under the same transaction/row lock when accepting a confirmation or generating a confirmed export. A changed schedule must never retain a previous employee acknowledgement. Existing payroll confirmation tables/flows are owned by the other worker and have not been modified here; their confirmed-state guard must be integrated before release. The current protection covers the existing attendance review/adjustment/period-lock/approved-report model.

The queue upsert holds its row while calculating. A concurrent later schedule change increments the source version and requeues after that transaction, making the earlier result visibly stale. A bounded call handles up to 100 days; the review UI continues pending batches. No external scheduler/notification automation was created.

## Validation

- 1559 Node tests passed; TypeScript, full ESLint and production build passed.
- Both migrations/functions applied only to the disposable local synthetic database.
- Rollback SQL: stable request replay; collision rejection; second-day append preserves the exact first row; punches before roster; union/deduped Sunday-to-Monday evidence split between upload weeks; unchanged unrelated result; idempotent refresh; reviewed result preserved and flagged after schedule changes.
- Synthetic browser: matching/manual corrections, explicit outlet selection, stale preview invalidation, dropdown bounds and no dialog overflow at 320/390/1440; source remarks/balances stay separate. All schedule import POSTs blocked in that UI test.
- Actual catalog acceptance, production rollout, independent-session concurrency stress and payroll confirmation integration remain outstanding.
