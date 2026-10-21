# v9.2.123 — local candidate

This version identifies the local follow-up after v9.2.122. It has not been pushed to Vercel or promoted to Production.

## Changes since v9.2.122

- Purchase Requests and Daily Records render their responsive toolbar variants in the server HTML, selecting one before hydration to avoid the compact-layout tree swap. Search and filter submissions retain their existing behavior.
- Attendance review shows a labelled Filter control on compact widths; its 1180px context disclosure now says “Week status & tools.”
- Asset Management names its mobile context “Asset actions.” The create FAB stays separate from the secondary action sheet, which uses the same page-specific name.
- Supplier Invoices gives search an accessible name, shows a labelled compact Filter entry, and aligns its 1180px Filter control to the 36px desktop action step.
- Purchase Returns clarifies the posted goods receipt path and when stock is deducted, gives creators and read-only roles suitable empty states, and labels the compact search and Filter controls.
- Purchase Orders and Goods Receiving use the same labelled compact Filter pattern, explain empty queues by role, and leave creation to the single mobile FAB when no filters are active.

## Verification and remaining work

The local Mock browser checks and dimensions are recorded in `docs/qa/2026-10-21-closure.md`. Strict TypeScript, focused ESLint and 1,668 unit/contract tests pass. This is local interface evidence; populated data, non-Owner roles, real attendance and procurement actions, notification clearing, hosted performance and final Preview widths still require authenticated checks. Migration 368 was not applied by this UI batch.
