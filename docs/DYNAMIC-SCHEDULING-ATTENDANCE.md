# Dynamic Scheduling and NGTeco Attendance

## Authority and weekly boundary

OMS is authoritative for the approved Monday–Sunday roster and recognised attendance. NGTeco supplies raw fingerprint events only. Malaysia local time (`+08:00`) and exact source seconds are preserved; a unique exact name match may assist a user-confirmed mapping, while `Person ID` remains the stored employee identity.

`View Attendance Punch` is the calculation source. Required columns are `Person ID`, `Person Name`, `Punch Date`, `Attendance record`, `Verify Type`, `TimeZone`, and `Source`. Dates use `MM/DD/YYYY`; time uses `HH:mm:ss`.

`Attendance Report` is reconciliation-only. Its NGTeco late, early, break, work, overtime and total durations are stored beside OMS results and can never update them.

## Workflow and permissions

Supervisor drafts an assigned-outlet roster, submits it, and Manager approves/publishes it. People can see all schedules but cannot decide them. Staff sees only their published schedule and may request a change. A pure same-outlet swap that preserves hours, outlet, coverage, cost and OT may be approved by Supervisor; all material amendments require Manager.

Employee home assignment, roster ownership and actual shift location are separate. A transferred employee is scheduled once by the destination outlet or Central Kitchen; the home outlet sees an authorised read-only projection and does not count the person in its coverage. Event and temporary-site work may carry a bounded work-site label on that canonical shift without creating a branch or widening permissions. Every full-time home-outlet day must resolve to a local assignment or a submitted/published external shift before submission. Published schedules may be corrected by an authorised Manager while unlocked; the reason and before/after revisions are retained. Attendance period lock is the final edit boundary.

The Schedule workbook tool previews one selected Monday–Sunday window from the established monthly `.xlsx` file against live OMS identities. It imports only outlets whose source cells are unambiguous and whose week remains editable. A duplicate home-row time is suppressed only when exactly one destination outlet owns that employee/date; standalone work-site labels, HR notes, incomplete time pairs and implausible spans stay blocked until a person supplies the missing business fact. Submitted, Published and Locked schedules are never silently replaced by workbook import.

Each shift template owns four editable time settings: **Check In Start**, **Check In**, **Check Out**, and **Check Out End**. The outer pair is the punch-matching window; the inner pair is the paid schedule boundary. Template settings also own required break minutes, maximum recognised working minutes, late grace seconds, cross-day behaviour, and an OT rule (`disabled` or `approved_only`) with threshold, maximum, and 1/5/10/15/30-minute rounding. These settings are snapshotted into each assignment revision, so later template edits do not rewrite published history.

The fixed `outlet_supervisor` role is an Outlet Staff capability superset. It does not inherit Manager or Owner permissions.

## Calculation

Events are sorted inside the approved shift matching window. Explicit IN/OUT types are used when supplied; otherwise events alternate IN, OUT. Intervals are pairs 1–2, 3–4 and 5–6. Odd counts and missing required break punches are exceptions; missing punches are never invented.

Recognised start is the later of actual IN and scheduled start. Recognised end is the earlier of actual OUT and scheduled end. Positive overlaps are summed and capped by the template maximum; normal full-time outlet templates cap at 30,600 seconds (510 minutes). Part-time templates use their lower cap. Early/post-shift time is visible but unpaid, and OT is never inferred.

Adjustments create a new result revision and immutable before/after history. Locked periods reject adjustments. Owner-only unlock requires a reason.

## Import and operations

Upload preview parses and validates without mutation. Confirmation records the SHA-256 file hash, uploader, parser profile, period, raw row JSON and immutable event fingerprints. Event uniqueness is tenant + Person ID + exact timestamp + device + punch type, so overlapping exports remain idempotent while every batch keeps its source-row association.

Apply forward-only migrations in numeric order. The documented migration ceiling is **286**. Migration 282 adds full-time day completeness, permission-gated cross-outlet projections and audited correction of published-but-unlocked schedules; migration 283 repairs composite-row handling in published corrections; migration 284 aligns workbook preview and persistence for audited historical role-history gaps; migration 285 adds parser-versioned corrective replay; migration 286 makes any immutable cross-outlet employee-day disposition satisfy completeness. The internal legacy `oil` value is displayed as **EL — Emergency Leave**. Keep migration application, deployment and Production verification as separate release evidence.

## Test checklist

- Run `npm test`, `npm run lint`, `npm run typecheck`, then `npm run build` serially.
- Run local schema verification and RLS tests against disposable local Supabase only.
- Verify Attendance at 320, 390×844, 768, 820×1180, 1180×820, and 1440×900/1440 widths.
- Exercise Draft → Submitted → Published, return/reject comments, staff request, pure swap, Manager escalation, import preview/finalise, exceptions, lock, and audited unlock.
