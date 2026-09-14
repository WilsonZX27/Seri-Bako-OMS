# OMS v9.2.67 roster integrity closure

## v9.2.67 Production closure — 2026-09-14

- Remote `main` and `release` resolve to `0e531bc2`; the Production shell renders `v9.2.67`.
- Forward-only migrations `284`, `285`, and `286` are recorded remotely. A follow-up dry-run reports the remote database as current. The local schema gate records migration `286`, 115 tables, 6 views, and 206 security-definer functions.
- The complete contract suite passed 1241/1241. Lint, strict TypeScript, and the 102-route Production build passed for the released code. The focused roster, Outlet Daily, Calendar, Settings, role, and viewport contracts were re-run after deployment and passed 105/105.
- A fresh focused authenticated local UAT ran `/attendance/schedule`, `/attendance/settings`, `/outlet-daily-records`, and `/outlet-calendar` across Super Admin, People Operations, Finance, Manager, Purchasing, Kitchen, Outlet Supervisor, and Outlet at 390×844, 820×1180, 1180×820, and 1440×900. All 32 role/viewport combinations passed in 4.6 minutes. The stricter Production-like-clone runner correctly refused an expired/missing clone marker before opening a browser; no Production credential or stale clone was fabricated to bypass that guard.
- Authenticated Production workbook UAT used `09 SERI BAKO SEPT SCHEDULE 2026 (1).xlsx` without modifying the source file. Verified employee-days for 2026-08-31 through 2026-09-13 were persisted into eight editable outlet drafts per week. Existing Submitted, Published, and Locked employee-days remained canonical and were not duplicated.
- The 2026-09-07 replay improved the preview from 185 safe / 44 review to 208 safe / 20 review after historical eligibility repair. Parser-v2 replay then suppressed seven assignments already owned by the Published Gurney roster. Cross-outlet immutable OFF/leave/rest dispositions now satisfy the home-roster completeness check without inventing a duplicate assignment.
- The 2026-08-31 preview retained 23 source ambiguities for deliberate correction, including unattached destination notes, `CLEAR OT`, an unavailable employee, multiple destination shifts, and one 01:30–22:00 span. These records were not inferred, submitted, or published. This is the intended fail-closed boundary, not an incomplete import success claim.
- Queensbay 2026-08-31 remains a persisted Draft with imported comments and an enabled submit action. Submission remains a deliberate operator decision because two part-time rows are intentionally sparse and the workbook still contains unresolved source facts outside this outlet.

## Supabase 24-hour runtime evidence — 2026-09-14

- Unified Logs returned 25.6k successful requests, 7 warnings, and 11 entries classified as errors across all products. Applying the dashboard's `Error 5xx` filter returned no HTTP rows; the currently visible Schedule RPC calls (`get_schedule_staff`, `get_schedule_staff_candidates`, `get_schedule_external_assignments`, and `validate_schedule_week`) returned HTTP 200.
- Query Performance shows the week-aware `get_schedule_staff` path at 334 calls, 87 ms mean, and 293 ms maximum. `get_schedule_staff_candidates` averaged 57 ms with a 238 ms maximum; `get_schedule_external_assignments` averaged 67 ms with a 324 ms maximum. This does not support a database-side Schedule publication outage.
- The expensive system-wide reads are outside Schedule: the legacy `low_stock_items` query averaged about 5.1 seconds, `stock_balances_view` variants averaged about 3.6–5.4 seconds, and `get_dashboard_core_snapshot` averaged about 1.6 seconds. `has_any_permission` was called about 545k times but averaged 3 ms. These are separately actionable performance debts; they are not evidence that a roster mutation failed.
- Database CPU remained low in the observed window, while memory commitment briefly exceeded the displayed commit limit and swap usage was high. The long workbook chooser/upload observation therefore cannot be attributed to a failed Schedule RPC from current evidence; browser file transfer plus workbook reconciliation remain the plausible measured boundary.

## v9.2.60 follow-through — company workbook UAT

### v9.2.61 Production catalog repair

- Authenticated Production UAT surfaced `42703: column staffs.branch_id does not exist` before any workbook assignment was written.
- The catalog now reads the canonical `staffs.default_branch_id` field and retains the fail-closed import boundary.

### v9.2.62 Production eligibility and partial-draft repair

- Authenticated write UAT then exposed a second contract mismatch: staff returned by outlet visibility were not necessarily eligible under the date-effective primary-role rule enforced by `save_schedule_week`.
- Preview now applies that same role rule before constructing assignments. Verified rows from a source-affected outlet may enter a Partial Draft; each ambiguous or ineligible employee-day remains empty and stays in the imported audit metadata for deliberate correction.

- Added an authenticated Schedule workbook preview using the existing import RPC and permission boundary. It reconciles the chosen week with live branches, schedulable staff, true employee home assignment and current roster status.
- Ready outlets import as one audited draft batch; source-blocked and Submitted/Published/Locked outlets remain unchanged. The UI exposes exact reasons and never converts a blank, location note or HR instruction into OFF/leave.
- The September 2026 company workbook revealed real source ambiguities before Production write: `CLEAR OT` and `Resign` instructions, one `01:30–22:00` span, an untimed Central Kitchen move and unattached destination/event notes. These require business facts rather than inference.
- The first Production log attempt was unavailable. A later authenticated retry on 2026-09-14 successfully returned the full 24-hour counts and Query Performance evidence recorded above; the earlier one-hour observation is superseded.

Date: 2026-09-13
Scope: Attendance Schedule integrity and correction, cross-outlet staff movement, mobile layout closure, Outlet Daily, Outlet Calendar and Attendance Settings.

## Product decisions

- A shift is canonical in one destination outlet roster. The employee's home outlet receives a read-only projection only.
- A full-time employee day cannot remain unresolved at submission. OFF and leave are genuine dispositions, not transfer placeholders.
- Borrowed staff belong to the destination roster only on days with destination shifts; permanent employee ownership is unchanged.
- Published schedules remain correctable by authorised Managers until Attendance is locked. Correction requires a reason and retains immutable before/after evidence.
- Central Kitchen participates as a real roster location. Event and temporary work is recorded through an optional bounded work-site label on the canonical shift; it does not create a fake branch or inherit inventory and permission scope.

## UI closure

- Publish uses a confirmation dialog; return identifies the Supervisor; corrected publication remains reason-bound.
- Phone Schedule actions attach to the bottom safe area; day controls have an intentional gutter; Add employee stays pinned to the desktop employee column.
- Outlet Daily phone rows separate Qty sent, Received and Wastage in a bounded three-field grid.
- Outlet Calendar renders Due soon & expired in the phone content flow.
- Device mappings combine source and location on phones and reduce Unbind to a labelled icon action.
- Attendance result context labels a reviewed calculation as Calculated rather than Posted.

## Verification boundary

Contract, lint, strict TypeScript, Production build, local schema gate, responsive E2E, linked migration, deployment and authenticated Production UAT must be recorded independently. No Production claim is made by this file alone.
