# E2E Testing

## Dynamic Scheduling and Attendance

Use disposable local data and the eight-role matrix. Verify roster submission/publication, return/reject comments, own-schedule visibility, pure swap versus material escalation, immutable history, both NGTeco samples, preview-before-mutation, duplicate import, exception review, adjustment revision, period lock and Owner reasoned unlock. Responsive targets are 320, 390×844, 768, 820×1180, 1180×820 and 1440×900.

Seri Bako OMS Playwright tests read `.env.test.local` automatically through `playwright.config.js`.

## Required variables

Set the variables for each role you want to test:

```env
TEST_BASE_URL=https://seri-bako-oms-official.vercel.app

TEST_SUPER_ADMIN_EMAIL=
TEST_SUPER_ADMIN_PASSWORD=
TEST_PEOPLE_OPERATIONS_EMAIL=
TEST_PEOPLE_OPERATIONS_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
TEST_MANAGER_EMAIL=
TEST_MANAGER_PASSWORD=
TEST_PURCHASING_EMAIL=
TEST_PURCHASING_PASSWORD=
TEST_KITCHEN_EMAIL=
TEST_KITCHEN_PASSWORD=
TEST_FINANCE_EMAIL=
TEST_FINANCE_PASSWORD=
TEST_OUTLET_EMAIL=
TEST_OUTLET_PASSWORD=

```

Role-specific tests skip only the role whose credentials are missing. If credentials are present but login fails, the test fails with the role and email address only. Passwords are never printed.

## Run

```powershell
npm.cmd run test:e2e
```

For local production smoke testing, build first, start the app, and set:

```env
TEST_BASE_URL=http://127.0.0.1:3000
```
