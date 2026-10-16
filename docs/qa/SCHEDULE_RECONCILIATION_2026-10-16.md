# Schedule workbook reconciliation — verification, 16 October 2026

## Current production status

The integrated v9.2.106 application is deployed on system.seribako.com.my. Migrations 357–360 are applied. Migration 357 passed the asset database lifecycle suite and a guarded live rollback rehearsal before commit. Existing business row counts were preserved. Missing history entries 339–344 were reconciled only after their effective contracts were verified; their older DDL was not replayed. Earlier local-only and pending-deployment statements below describe prior stages, not current release status.


The requested flow combines Outlets, CK ALMA and CK PJS10 before resolving employee days. Explicit destinations take priority; equivalent working rows and rest days merge. Different destination times still require a decision. No file-order priority is introduced.

## Final behavior

- Select up to ten Excel workbooks together (10 MB each; 30 MB total). Identical files are read once. Source hash, sheet and row provenance are retained.
- Read ALMA's adjacent repeated date header without losing the first employee. Locate PJS's selected week from actual date anchors and validated adjacent week sequences; the sheet number does not establish a date. Incomplete year context is confirmed once.
- Support an explicit AM/PM time pair inside one cell. Long spans over sixteen hours remain flagged; PM is never silently changed to AM.
- A uniquely associated coloured destination note can use its explicit source hours at an authorised destination. Near-spelled destinations require confirmation once. Empty employee rows for the selected week do not require matching.
- Persist confirmed employee aliases, location/date context, destination spelling and ordinary named-shift mappings by source profile and location. Each successful import audits the rules used. Reusable OT shift rules are rejected.
- OT remarks uniquely associated with a coloured employee/date hold that time row for manual confirmation. Unattached remarks remain note-only and never infer an employee. Every OT entry and OT remark intersecting the selected week appears in a separate special-conditions dialog. The Owner/user enters the intended schedule and instructions for that exact source, employee and date. No future-week reuse or automatic OT credit. Approved RO balance adjustments and OT claims retain their established approval workflow.
- Compare existing draft days with the preview: unchanged days need no write, reviewed draft changes create retained revisions. Submitted, published, locked and amended weeks, and existing RO-adjusted days, remain protected.
- Save all selected locations in one transaction. Check exact current revision IDs after locking; reject stale previews. A failure rolls back the whole batch, including retired revisions, new rows, rules and receipt. Stable receipts support retries.
- A fingerprint exception is dated, Owner-confirmed and bound to staff UUID. Aiden is suggested only when exactly one authorised identity matches his name; no name-based exemption is embedded in the calculator. The live identity still needs its one-time Owner confirmation. Ordinary staff remain subject to the original rules.
- MORNING/AFTERNOON/NIGHT for an exempt employee are untimed roster notes, kept in the immutable import receipt and displayed on the roster. Those notes cover only that employee/date in schedule completeness validation. They do not supply worked or paid hours. New calculations suppress missing-fingerprint requirements for exempt staff; approved/released payroll is not retroactively rewritten.

## Verification

- 1,635 Node regression tests passed, including twelve new reconciliation tests and updated contracts for the intentional behavior changes.
- TypeScript, ESLint and the optimized production build passed (local placeholder configuration; no Production service used).
- Disposable PGlite ran the actual 348, 358 and 359 migrations against synthetic identities. Verified atomic multi-location save, replay, stale revision rejection, transfer between drafts, retained history, rollback after a later outlet fails, protected weeks, branch/tenant/permission checks, rule persistence, Owner-only policy changes, date boundaries, revocation, untimed-note coverage and no invented hours.
- Browser: the three supplied workbooks were selected together against a local simulated staff catalogue. The UI recognised the twelve relevant location sheets, enabled batch selection and displayed six untimed chef duties. This is parser/UI evidence, not a live staff identity or eligibility reconciliation.
- Browser: the OT dialog required its inputs, accepted a clearly labelled local QA-only instruction, then changed only the selected OT row to confirmed. Other OT entries still required review. No business import or fingerprint-policy mutation was sent to Production.
- Browser console reported no errors. Native time input automation did not retain time values in the local browser; the OT dialog now shares the existing roster's AM/PM time selector, which passed the same flow.

Private workbook extracts, real staff names, simulated identity catalogues and local screenshots remain outside this patch. The original uploaded workbooks were read only. Production's browser session was expired, so no live catalogue, employee-policy activation or end-to-end Production write was verified.

## Deployment

Apply migrations 358 and 359 together before deploying their API/UI consumers, after separately checking the target's existing migration history. Migration 357 remains a separate earlier candidate; do not infer its Production status from repository numbering. This patch does not apply any Production migrations or publish a deployment.

## Production activation and follow-up, 16 October 2026

Production deployment b195c871 is Ready and promoted. Migrations 358/359 were applied atomically after a live rollback rehearsal. The Owner-requested head-chef exemption is active from 12 October. Current schedule rows (1,438) and attendance result rows (1,023) were unchanged; no roster was imported or OT conditions confirmed.

The live three-file preview exposed two additional defects. Shared remark colours could bind another employee's named OT note; full catalogue name/confirmed alias corroboration is now required, otherwise the note stays a separate manual review. Explicit support destinations were still constrained by permanent branch membership in migration 348; migration 360 aligns this with the existing roster editor's company-wide eligibility, while retaining tenant, authorised destination, dated role, concurrency and published/locked schedule protections. No staff_branches memberships are inserted. The catalogue includes the editor's existing eligible candidates and retains historical week staff.

Synthetic regressions cover shared-colour misassociation, explicit-name linking, and destination import without permanent branch membership; the foreign-company rollback guard still rejects. Production schema changes are rehearsed under rollback before apply. Final browser preview and deployment evidence are recorded after release.

Migration 360 passed the live rollback rehearsal and was applied with function ACL and business-count guards. All 1,637 Node regressions, TypeScript, ESLint, the optimized build (synthetic local Supabase environment), and the PGlite migration/RPC suite passed. The Owner-confirmed employee spelling alias was saved with source/location scope; no OT conditions were persisted.
