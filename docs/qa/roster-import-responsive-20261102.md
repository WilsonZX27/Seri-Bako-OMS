# Schedule workbook phone reflow — local candidate

Source: authenticated57fb Owner Preview screenshot `/tmp/oms-57fb-preview-readonly/roster-390.jpg`,2026-11-02. Existing two buttons squeezed the flexible description into a narrow column, causing overlap. Existing Operate design and shared Button retained.

Only two class attributes in ScheduleWorkbookImport change: below640px use two-column grid, with description spanning both columns; at640px and above retain flex layout. Same copy, controls, handlers, focus order, permissions and SQL. No business-rule change.

Evidence `/tmp/oms-roster-import-responsive-evidence`: actual React component rendered with actual generated Tailwind and design-system-v2 CSS, at measured Preview canvas widths366/520/812 inside390/820/1440 viewports. All three actual after screenshots inspected. Phone description occupies full340px inner width; two164x48px controls sit12px below it. Tablet44px and desktop36px controls retained. Source57fb baseline and after geometry exactly equal at820/1440. No document overflow, button-center hit tests pass, keyboard Tab moves Download→Import, visible2px outline. Static rendered component test does not exercise hydration/import dialog or backend; physical Safari/touch not tested. Initial Chromium sandbox launch denial resolved by approved local-test escalation. Initial focus assertion wrongly expected box-shadow; actual shared focus uses outline, corrected test checks visible outline or shadow.

Changed-file ESLint and git diff --check pass. No full-system test rerun. No push, SQL installation or Production promotion.

## Minimal existing-account read-only acceptance

Use existing authorized accounts/sessions; do not create accounts, change roles or submit business data.
- Purchasing: allowed procurement/low-stock/basket entries and existing PR data; confirm no unexpected attendance/Owner sales-settings management access. Default permissions may restrict individual modules; record actual configured scope.
- Chef: assigned-location Schedule entry, existing week data, authorized workbook entry; confirm unrelated branch/payroll management remains denied according to configured capability.
- Outlet Staff (or existing Outlet Supervisor if that is the operating role): assigned outlet Daily record and allowed Qty Sent/Received controls, preserved existing values; Owner-only sales settings and other-outlet data must remain restricted according to current grants.

Account usernames for these three sessions have not been verified; role names are requested coverage, not an assertion that a named account has those grants. Existing Owner evidence is already retained. Read-only role checks do not require creating PRs, importing drafts, posting counts or approving claims. Existing isolated write-path tests remain separate regression evidence; no live business-write requirement is introduced by this report.
