# Sprint 7.1C UI Smoke Test

## Routes Tested

Super Admin smoke coverage is prepared for:

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

## Roles Tested

Prepared Playwright role coverage:

- Wilson Super Admin
- Administrator
- Kitchen
- Purchasing
- Manager
- Finance

## Screenshots Captured

Target folder:

`test-results/ui-smoke-sprint-7-1c/`

Screenshots are intentionally ignored by git.

Observed Playwright artifact folder:

`test-results/ui-smoke-sprint-7-1c-artifacts/`

## Pages Failed Visual Check

Page: `/inventory`
Status before: FAILED
Problems:
- Quick Insights used large cards in the right rail.
- Hub cards used oversized icons and large spacing.
- Recommended labels added visual clutter.
Fix:
- Rebuilt right rail as compact vertical stat list.
- Reduced hub icon size, card padding, and recommended label weight.
- Kept actions in the center and insights in the right rail.
Status after: PASSED pending browser screenshot review.

Page: `/dashboard`
Status before: FAILED
Problems:
- Dashboard felt crowded.
- Quick Actions and notifications were visually mixed with main content.
- KPI count and action content felt duplicated.
Fix:
- Moved secondary actions and notifications into the right rail.
- Kept main center focused on pending actions, recent movement, operations summary, and finance foundation.
- Kept Recent Operational Movement pointing to `/activity`.
Status after: PASSED pending browser screenshot review.

Page: `/purchase-requests/new`
Status before: FAILED
Problems:
- Playwright detected page-level horizontal overflow on the purchase request form.
Fix:
- Added app-shell horizontal overflow guard while preserving table-level scroll containers.
Status after: PASSED pending redeploy/browser screenshot review.

Page: `/procurement/purchase-requests`
Status before: FAILED
Problems:
- Route was listed for smoke testing but had no dedicated route.
Fix:
- Added canonical redirect to `/purchase-requests`.
Status after: PASSED.

## Fixes Applied

- Updated version metadata to `v0.2.3 / Sprint 7.1C`.
- Added `.env.test.local` loading to Playwright config.
- Fixed purchasing test credential variable names.
- Added `tests/e2e/ui-smoke.spec.js`.
- Added reusable `WorkspaceGrid`, `RightRail`, and `ActionPanel`.
- Added compact right-rail `CompactStatList`.
- Compact repaired Inventory and Dashboard layouts.
- Added app-shell overflow guard for wide forms.
- Confirmed obsolete item-identification wording returns no app matches.

## Remaining Issues

- Final visual acceptance depends on running Playwright against the configured test environment and reviewing generated screenshots.
- Headed Playwright may require a local desktop browser session.

## Visual Acceptance

Status: PARTIAL / FAILED ON DEPLOYED SITE.

- Focused UI smoke against the configured deployed `TEST_BASE_URL` passed for Kitchen, Purchasing, Manager, Finance, and Administrator dashboard/sidebar checks.
- Focused UI smoke failed for Super Admin route sweep on deployed `/purchase-requests/new`.
- Exact deployed failure: `/purchase-requests/new` horizontal overflow measured `1354px > 1280px`.
- Headed Playwright reproduced the same deployed `/purchase-requests/new` overflow failure.
- The working tree now includes an app-shell overflow guard and should be retested after deployment.
- Full acceptance should be rerun after deploying `v0.2.3 / Sprint 7.1C`.
