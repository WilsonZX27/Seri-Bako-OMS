# Preview v9.2.119 — UI review candidate

This version is for Preview review. Production is unchanged. The detailed annotation ledger is `docs/qa/2026-10-21-closure.md`.

## Changes since the previous Preview branch tip

- Purchase Requests: keep 11px phone metadata and 12px compact-row metadata through the medium desktop range; let long suppliers wrap; close the 1180px search-toolbar gap; give the desktop total enough width for a multi-digit RM amount; correct singular item and line wording.
- Daily Records: keep filters and record count visible, align the three summary values, explain an empty outlet scope, clarify the completion report, and use one mobile create action. A populated local sample confirmed compact metrics and the wide table layout.
- Asset inspection: keep annotated 12px guidance and item names, align the mobile location heading, clarify the one-checklist-per-location rule, and stack the date and bulk-check controls on narrow screens. A local Mock sample and 360/393/768px screenshots are included in the QA evidence.
- Navigation and notifications: preserve attention indicators across pending workflow categories, including Attendance; show 16px semantic notification icons and a button-style activity-log entry. Local Mock notification read and navigation states were checked.
- Attendance: preserve the complete Owner workspace; local Mock now shows an honest empty summary instead of a database-unavailable warning. Production attendance queries and permissions are unchanged.
- Other scoped corrections: single mobile create action on reviewed operational lists, 36px desktop controls, and local Mock empty states for Supplier Invoices.

## Review limits

Local checks used Mock data or temporary samples. Real record permissions, submit and approval flows, all roles, page speed on Preview, and the remaining historical annotation inventory require authenticated Preview review. The full local suite reports 1661 passed and two pre-existing role-matrix assertions failed; see the QA ledger for their scope. Typecheck and lint pass. This Preview is not a production release or a claim that the full-site closure is complete.
