# Attendance and UI convergence closure ledger

Version: `9.2.51`  
Scope: browser comments 23–52 and the 31 August–6 September 2026 schedule workbook.

## Implemented locally

- Shared searchable SelectControl across every business TSX surface (the legacy wrapper is the sole native-select exemption), whole-surface date picker, conditional mobile action spacing and explicit More-sheet rhythm.
- Actual Attendance desktop date groups and phone employee cards; employment type under name; `x of y punches`; zero durations hidden; payroll Payable and calculation JSON removed from the normal surface.
- Schedule template dropdown, AM/PM Working Time controls, approved-RO balance and edge choice, actual-OT claim route, atomic submit, audited Manager edit-and-publish and mandatory return reason.
- Attendance Settings prioritises Device Source mapping and collapses Holiday/Pay and Shift Template administration into compact maintenance sections.
- People Documents uses a desktop list/add split and mobile stacking; permission save sits before the permission matrix.
- Strict workbook parser, catalog endpoint, idempotent Draft-import RPC and immutable Published/Locked guard.

## Workbook dry-run boundary

- Source SHA-256: `fc2cf5383331f2f1678a9e1d9ae918d252768b2bda870069a8ccbc9aeb2c4ec6`.
- Workbook structure: 10 expected worksheets; 209 parseable cells in the fixed date window.
- Confirmed blockers in source data include `CLEAR OT`, `Resign` and one `01:30–22:00` span. They are reported and never guessed.
- The current local run has no authenticated OMS catalog, so canonical branch/staff matching and Draft differences remain intentionally unresolved. No schedule was written.

## Evidence boundary

- `implemented`: local source and migration only.
- `locally verified`: TypeScript passed; ESLint passed for `src`; 1,224 contract tests passed; the production build generated all 102 pages using local placeholder Supabase variables. The build proves compilation only.
- `local schema gate`: blocked before migration execution because Docker Desktop started but its daemon did not become responsive; no linked database was contacted.
- `authenticated Preview UAT`: not yet performed.
- `remote migration applied`: migration `279_schedule_atomic_submit_manager_edit.sql` applied to the linked Supabase project; a follow-up dry-run reported the remote database up to date.
- `data imported`: no.
- `published`: no.
- `Production verified`: no.
