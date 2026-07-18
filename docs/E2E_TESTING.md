# E2E Testing

Seri Bako OMS Playwright tests read `.env.test.local` automatically through `playwright.config.js`.

## Required variables

Set the variables for each role you want to test:

```env
TEST_BASE_URL=https://seri-bako-oms-official.vercel.app

TEST_SUPER_ADMIN_EMAIL= wilson@seribako.com.my
TEST_SUPER_ADMIN_PASSWORD= 11223344
TEST_ADMIN_EMAIL= test.admin@seribako.com.my
TEST_ADMIN_PASSWORD= 11223344
TEST_MANAGER_EMAIL= test.manager@seribako.com.my
TEST_MANAGER_PASSWORD= 11223344
TEST_PURCHASING_EMAIL= test.purchase@seribako.com.my
TEST_PURCHASING_PASSWORD= 11223344
TEST_KITCHEN_EMAIL= test.kitchen@seribako.com.my
TEST_KITCHEN_PASSWORD= 11223344
TEST_FINANCE_EMAIL= test.fin@seribako.com.my
TEST_FINANCE_PASSWORD= 11223344
TEST_OUTLET_EMAIL= test.outlet@seribako.com.my
TEST_FOUTLET_PASSWORD= G%bBdzRdAXX$%3

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
