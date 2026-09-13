# OMS v9.2.59 roster integrity closure

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
