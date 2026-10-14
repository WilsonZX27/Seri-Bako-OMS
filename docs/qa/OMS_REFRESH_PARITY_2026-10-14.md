# Automatic attendance refresh parity — local verification

The browser exposed a real data-consistency defect: opening Attendance Review processes queued schedule refreshes, but the day-scoped calculator still used the older policy. It replaced the four-punch calculation with `weekly-close-v2`, dropped actual break fields, and could infer payable work from anomalous punches. The weekly import calculator alone was already corrected by migration 352.

Migration 354 replaces the three day-scoped calculation layers with the corresponding four-punch policy, retaining explicit employee/date scopes and adjacent-week batch support. It adds active submitted/approved/credited OT claims to the existing refresh protection gate. No historical backfill, permission expansion or production migration occurred.

## Verified outcomes

- Two independently authenticated People users completed reversal submission, self-approval refusal with retained comment, separate approval, punch correction, new OT submission and separate credit approval. Final database balance: **30 RO minutes; 1,800 approved OT seconds**.
- Both schedule-first and punch-first synthetic scenarios passed. Four timestamps and midnight work survived refresh; duplicate/missing/extra/order anomalies remained unpayable. A second refresh left every result byte-for-byte unchanged.
- A scoped recalculation changed no unrelated daily-result rows (hash comparison). Adjacent-week batch metadata did not suppress the explicitly requested date.
- An unchanged refresh retained an approved attendance confirmation. Released payroll and active credited OT returned `needs_review` without overwriting protected results. These checks were rolled back.
- Revised 353 was fully applied on the main local database; 354 was applied on both main and independent replay databases. The complete four-punch SQL regression passed on replay, including time correction invalidating a stale signature. Local migration ledger provenance remains separate from direct `psql` function application; no production ledger claim is made.
- Populated PDF was downloaded through the actual browser export dialog. Final export refused an unclosed period while retaining PDF/status/outlet selections. Four independently authenticated foreign-company role contexts were denied PDF access and OT reversal; ledger count remained unchanged. A separate same-company browser probe temporarily removed the synthetic role’s sensitive-export and OT-approval grants: PDF and reversal were refused and ledger unchanged; grants restored in finally.
- All seven exported days were compared with the local database and XLSX cached values. Monday net work 07:55, Tuesday cross-midnight 07:00, Sunday net work 09:00 and approved OT 00:30 agree. Anomaly totals and PPH remain blank. PDF now includes all raw punches in remarks when more than four exist.
- PDF oversized title/note and duplicate-date tests reject unreadable output with an XLSX alternative. Monthly multilingual pagination remains covered.

Evidence: `evidence/2026-10-14/refresh-parity/`, including source SHA-256 values, browser evidence, PDF, XLSX, render and JSON comparisons. Synthetic fixture credentials stay in private `/tmp` files and are not committed.

## Verification commands

- `node scripts/integration/verify-people-browser-local.cjs` (requires a newly seeded private two-People fixture; mutates only that synthetic workflow)
- `node scripts/integration/verify-refresh-order-local.mjs` (transaction rollback)
- `node scripts/integration/verify-scoped-refresh-local.mjs` (transaction rollback)
- `node scripts/integration/verify-populated-pdf-and-denials-local.cjs`
- `scripts/integration/compare-attendance-exports-local.py` (PyMuPDF runtime; read only)

This is local synthetic acceptance, not real employee/payroll acceptance or authorization to deploy.
