# Sprint 7.1 UX Audit

## Pages Reviewed

- Dashboard
- Inventory workspace
- Settings
- Staff detail danger actions
- Top bar account and Workspace Updates
- Items, Suppliers, Purchase Requests, and Purchase Orders list actions

## Issues Found

- Dashboard repeated approval and urgent procurement counts in both KPI cards and the Attention Needed panel.
- Recent Operational Movement linked to the stock transactions area, which made the activity label feel misleading.
- Inventory Quick Insights lived in the main content column instead of the right rail.
- Staff danger actions used permanent warning cards that took too much screen space.
- Account actions were split between profile needs and a visible top bar sign-out button.
- Owner backup export was not available from Settings.

## Duplicated Pages Or Functions Found

- Dashboard quick-action content overlapped with Daily Operations.
- Inventory action cards overlapped with top action shortcuts.
- Operational activity was shown as dashboard content and Workspace Updates content.

## Navigation Confusion

- Added `/activity` as the canonical place for recent operational movement review.
- Kept Daily Operations as the staff-friendly hub and avoided expanding dashboard quick tools.
- Added `/settings/backups` as an owner-only Settings route.

## Recommendations Completed

- Added Super Admin / Owner-only System Backup page and server-only ZIP route.
- Added account menu with My Profile, Change Password, and Sign out.
- Added profile edit, profile picture upload/remove, and own-password change actions.
- Added inactivity warning and auto logout for authenticated app routes.
- Converted staff danger actions to confirmation dialogs.
- Moved Inventory Quick Insights to the right rail.
- Removed duplicate Dashboard Attention Needed treatment.
- Added generic CSV export endpoint and small export buttons to core lists.
- Updated app metadata to `v0.2.1` and `Sprint 7.1`.

## Speed And Performance Notes

- Backup generation is owner-only and runs only on demand.
- Backup skips optional missing tables instead of retrying or blocking export.
- Dashboard cleanup avoids repeating the same high-level alert data in multiple large panels.
- Inventory layout keeps insights separate from main action cards, reducing scanning cost.

## Remaining Future Improvements

- Add persistent notification read tracking instead of session-only seen state.
- Expand CSV export buttons to every secondary master list after permission checks are reviewed.
- Add Playwright role scripts using `.env.test.local` credentials when the local test environment is available.
- Add a richer activity detail page with filters once activity volume grows.
