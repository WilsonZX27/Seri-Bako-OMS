# Attendance export and self-service — local integration candidate

## Status and scope

Independent worktree `/tmp/oms-attendance-weekly`, branch `codex/attendance-weekly-export`, based on parent-verified production commit `2dc8c0f441fe43ee02c285d8397e6dd0cc3d6b3c`. The live deployment was not independently re-verified here (connector access was unavailable). The primary dirty checkout and the other workers' checkouts were not edited. No production migration, grant, payslip publication, payment, push or deployment was performed.

Wilson rejected the previous layout. His latest image is the layout target; opening in Excel is not layout acceptance. Milo confirmed receiving the rejection. This remains a reviewable candidate, not user acceptance.

## Existing capability and gaps

Production-baseline export already has week/month selection, branch-scoped permission checks, draft/final labeling and multi-outlet ZIP output. It had string-valued times, no usable calculation cells in the supplied repaired Draft, top-position signatures and an incomplete OOXML theme. Existing attendance review is not employee version-bound acknowledgement followed by scoped supervisor/manager review. Historical salary/passport access retired by migration 316 is not restored.

The supplied Draft contains Excel `fileRecoveryPr repairLoad=1`: its now-valid XML cannot establish validity of the original downloaded bytes. Parent's OT sample has thousands of formulas but also existing REF/VALUE errors and suspect ranges/unit conversion. These are not accepted payroll policy. An older generated baseline reproduced Excel's repair/cannot-repair dialog; structural repair removes the incomplete theme and preserves the current baseline's correct `calcPr` ordering. No unsupported claim is made that every historical repair had the same cause.

## Latest image reproduction

| Reference detail | Candidate |
| --- | --- |
| Three green top blocks: month / employee / outlet | A:D / E:H / I:L, larger bold title text |
| Separate right DRAFT and Generated on block | N:P, M gap; Malaysia-local timestamp |
| Two metadata rows with Name, I/C, Outlet, Staff code, Period, Employment | Same label/cell placement; identity value deliberately blank |
| Sixteen equally spaced columns and original labels | Date, Day, WORKINGTIME, AM In/PM Out, four fingerprint times, Total Working, OVERTIME, Short Hours, PPH (Triple Pay), Outstanding Exceptions, Normal / Events, Meal Allowance, Remarks |
| Exceptions on the date row | Peach M header/body; never displaced into summary |
| Blank row below grouped header | Row 7 |
| Two summary rows end at PPH | A:I merged labels, J:L formula cells; pale green then gray |
| Four equal signature boxes below summaries | A:D / E:H / I:L / M:P; exact Prepared By / Checked By / Verified By / Approved By labels; blank signature area |
| Clean gaps, no extra explanation rows | Border-free whitespace; no added formula/notes columns |
| Landscape print | Per-sheet A4 landscape print area; two synthetic employees produce two PDF pages |

Differences are explicit: synthetic identities/data; I/C blank; PPH/Meal contents blank pending an authorized payroll projection/policy (headers remain); missing values remain blank, not invented zero. Long names and notes increase row height to avoid clipping. Mac Excel renders AM/PM uppercase despite the lower-case custom format. This is not a pixel-identical claim or permission to infer payroll rules.

## Workbook calculation contract

Dates/times/durations are numeric Excel values, with date, 12-hour clock and `[h]:mm` styles. Clock input preserves seconds even when the display hides seconds. Complete two/four-punch intervals use a real `MOD` formula in Total Working only where that formula agrees with the reviewed OMS result; invalid/overlapping/incomplete inputs produce blank. Adjusted/inferred working durations remain explicit reviewed inputs. OT and short-hours daily values remain reviewed inputs. No `=constant` masquerades as a calculation. Weekly J:L totals reference the actual date rows; minute conversions multiply Excel days by 1440. Blank and zero are distinct. More than four punches are preserved in Remarks.

**Outstanding policy decision:** specify the approved daily OT, short-hours and PPH algorithms (thresholds, rounding, breaks, overnight/holiday rules) before claiming those daily columns fully recalculate from punches. The sample workbook is not sufficient authority. Current source results are preserved; no new pay rules were invented.

Synthetic artifacts outside the repository:

- `/tmp/oms-layout-generated.xlsx`: raw bytes from the final generator.
- `/tmp/oms-layout-candidate.xlsx`: same candidate opened, punch F8 edited, recalculated and saved by native Excel.
- `/tmp/oms-layout-candidate.pdf`: native Excel print of that edited candidate, both sheets.
- `/tmp/oms-layout-candidate-1.png` and `-2.png`: inspected PDF renders; long-name/long-note case has no clipping.
- `/tmp/oms-weekly-final.xlsx`: earlier summary test, J8 changed to 0.0625 days; J16 cache 0.0625 and J17 cache 90, formulas retained.

Native Excel opened the final generated file without a repair prompt, then saved and reopened the edited file without a repair prompt. Editing F8 from noon to 13:00 changed I8 from 7:00 to 8:00, with its formula retained after save and no `fileRecoveryPr`. The app was already in manual calculation mode; F9 was used. The package requests automatic/full recalculation, but we did not change the user's app-wide calculation preference or claim automatic-mode UI verification. ZIP CRC, XML/relationship/order/bounds checks also inspect saved actual HTTP response bytes, not only generator output.

## Self-service implementation

`/attendance/confirmations`: People selects one employee or all active employees for a period; sequential preparation has progress and per-employee failure reporting. Retrying identical ready source is idempotent. Employees see their own schedule, punches, worked time, late/early status and can confirm the displayed version or request correction. Scoped supervisors verify their own outlet slice; scoped managers approve their own slice. Every participating outlet must finish its stage. People then calculates manually verified MYR lines, approves and releases through `/attendance/payslips`; employees see only their own released document. Account-menu links make these pages reachable for every existing employee role without granting payroll access.

The minimal implementation is workflow confirmation, not a claim of legally compliant electronic signatures. No email/attachment distribution is needed. No public storage bucket or unauthenticated attachment URL is introduced. Generic backup/export classifies the four new tables as sensitive/excluded; an independently authorized protected database backup path must be agreed before activation.

`350_attendance_confirmation_and_payslips.sql` adds:

- `attendance_confirmations`, immutable version snapshots and source-content digest.
- `attendance_confirmation_events`, actor/branch/action/version/time/reason audit.
- `employee_payslips`, separate private calculation lineage, version and release state.
- `employee_payslip_events`, private payroll history.
- RLS, RPC-only writes, exact active `people_operations` plus explicit new permission for payroll/prepare; no Owner/Finance grant.
- Source changes supersede attendance and unreleased payroll. Pay-only changes supersede payroll, retaining time acknowledgement. Released payroll rejects source mutation pending an explicit correction workflow.
- Private `attendance_payroll_locked(company, staff, date)` integration predicate.

`351_attendance_refresh_payroll_lock.sql` is the integration binding to the schedule worker's migration 349 at `f4b08aae23f11dd3310cb80ed6270c8f7954693b`: it preserves that refresh function and adds the private released-payroll predicate to its existing protected-result check. Released days become `needs_review` before calculation. Do not apply 351 without 348/349/350; re-diff it if 349 changes. We did not edit the schedule worker's tree.

## Shared source / no double writes

The schedule worker owns source queue and recalculation. Confirmation does not write current attendance results or assignments. Preparation/review/payroll require ready queue state, calculated_revision == source_revision, and matching result `schedule_source_revision`/`schedule_source_hash`; a missing queue is not silently current. Invalid punch JSON shape fails closed and nested objects never enter the time projection.

The SQL period digest excludes result IDs/calculation/source lineage. It is a period-snapshot contract, not byte-equal to the worker's per-day `attendance-review-v2` JavaScript digest. Both distinguish visible attendance from private payroll lineage; integration must not interchange these hashes. Parent should independently verify combined transaction lock ordering and concurrent refresh/review/release with real separate PostgreSQL sessions. Deferred guards prevent stale publication/source overwrites; this PGlite test does not establish cross-session concurrency behavior.

## Evidence and remaining gates

- Full repository suite: 1544 tests passed after final pagination/integration changes; the final API signature adjustment also passed its six focused runtime tests. Typecheck, lint and production build passed. Build used synthetic localhost public Supabase settings and Node 24.21.0; project requests Node 22, so the combined Node 22 release gate remains with integration.
- PGlite executes real migrations 350/351 and tests employee/tenant/branch/People ACL, inactive access, direct-write/private-helper denial, sequence, multi-branch slice/completion, stale hashes, version recreation without inherited signatures, pay-only changes, released-source rollback, malformed punches, and actual refresh outcome `needs_review` without modifying attendance.
- API runtime tests cover inactive session, cross-origin rejection, malformed body, uncached response, missing migration fail-closed, exact dispatch/foreign-field stripping, and People-only payroll mutation.
- In-app browser (not user's Chrome) component harness: mobile 390×844 staff confirm and own released payslip; tablet 820×1180 supervisor/manager actions; desktop 1440×900 People prepare and calculate/approve/release. All data and responses synthetic. This validates component interactions/layout, not an authenticated database-backed end-to-end environment. Temporary public harness route was removed and localhost server stopped.
- Native PDF reviewed on both pages against the reference checklist above. User layout acceptance remains outstanding.
- No production migration/grants applied. Combined real-schema/authenticated browser/concurrency verification, approved daily formula policy, protected backup and release authorization remain integration gates. Do not label this candidate production-ready.
