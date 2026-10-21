# v9.2.124 — local candidate

This local candidate follows v9.2.123. It has not been pushed to Vercel or promoted to Production.

## Change since v9.2.123

- Daily Records keeps date and branch filters visible and moves Status and permission-gated Qty Sent state into the labelled Filter entry. The active count reflects only applicable secondary filters; Reset and existing query parameters remain intact.
- Review notes were expanded with current local checks for Daily Records, Purchase Requests, asset checklist/metrics, Attendance, notifications and Supplier Invoices. These are not a sign-off of all historical annotations.

## Verification and remaining work

- Local responsive and interaction observations are recorded in `docs/qa/2026-10-21-closure.md`.
- Before this version-only bump, strict typecheck, lint, whitespace check and 1,669 tests passed against the same UI source.
- Re-run the app-version contract after this bump. Other full-system historical annotation work, populated/live business data, role-specific behavior and production performance remain open.
- Production was not changed and no migration was run.
