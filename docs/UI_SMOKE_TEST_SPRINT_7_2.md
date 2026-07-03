# Sprint 7.2 UI Smoke Notes

Version shown by the app should be:

- v0.2.4
- Sprint 7.2

## Screenshot Folders

- Main screenshot folder: `test-results/ui-smoke-sprint-7-2`
- Failure/artifact folder: `test-results/ui-smoke-sprint-7-2-artifacts`

## Before Issues Found

- Inventory used a wide right rail and extra top action row that could squeeze the main content.
- Dashboard duplicated quick actions and recent activity instead of focusing on attention and operating picture.
- Documents behaved like another operational hub instead of an audit/register page.
- Sidebar footer carried explanatory copy instead of just version tracking.
- Hub cards and recommended tags added unnecessary visual height.
- Purchase Request item line used a very wide fixed column grid and still referenced barcode wording.
- Staff role assignment allowed administrator-level users to see the owner role option.

## After Changes

- Shared page header, right rail, record workspace, hub cards, and category cards were compacted.
- Sidebar footer is now version and sprint only.
- Top bar uses left title/breadcrumb, centered search, and right updates/account.
- Dashboard now focuses on four KPI cards, compact attention, today's operations, finance forecast, notifications, and readiness.
- Documents is register-first with compact insights and the audit table.
- Inventory has a single top-right primary action and no loose top action row.
- Data Onboarding keeps the same readable content but has smaller, right-aligned action buttons.
- Purchase Request item rows use a responsive grid and search by item code/name only.
- Administrator role assignment now hides owner-level role options unless the current user is `super_admin`.

## Routes Visually Tested

The headed smoke was run against the currently deployed Vercel app:

- `/dashboard`
- `/daily-operations`
- `/procurement`
- `/procurement/purchase-requests`
- `/purchase-requests`
- `/purchase-requests/new`
- `/inventory`
- `/items`
- `/items/new`
- `/suppliers`
- `/suppliers/new`
- `/stock-transactions`
- `/stock-balance`
- `/stock-card`
- `/production`
- `/production/jobs`
- `/production/jobs/new`
- `/documents`
- `/data-onboarding`
- `/settings`
- `/staffs`
- `/staffs/new`
- `/account`
- `/settings/backups`
- `/activity`

Role dashboard/sidebar smoke also ran for kitchen, purchasing, manager, finance, and admin.

## Pages Still Not Acceptable

- Deployed `/purchase-requests/new` still reports horizontal overflow at `1354px > 1280px`.
- This reflects the currently deployed app during the smoke run. The working tree includes a responsive PR line-grid fix and needs a post-deploy rerun.
- Deployed `/staffs/new` still exposes `Super Admin / Owner` to the admin test account. The working tree includes the role helper fix and needs a post-deploy rerun.

## Validation Summary

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run test:e2e`: ran. Network-enabled run passed 13 tests and failed 2 deployed-app checks listed above.
- `npx.cmd playwright test tests/e2e/ui-smoke.spec.js --headed`: ran. 5 passed and 1 deployed-app overflow check failed on `/purchase-requests/new`.
