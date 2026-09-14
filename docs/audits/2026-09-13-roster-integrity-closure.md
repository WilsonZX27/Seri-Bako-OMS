# OMS v9.2.59 roster integrity closure

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
- Production Supabase unified-log Explorer returned its own backend error for both focused and aggregate 24-hour queries on 2026-09-14. Vercel Hobby exposed one hour only; that visible hour contained zero Warning/Error/Fatal events. This is an observability limitation, not proof of a clean 24-hour window.

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
