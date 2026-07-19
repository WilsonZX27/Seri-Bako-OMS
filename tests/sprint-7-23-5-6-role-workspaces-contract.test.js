const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("workspace updates share one role and scope source", () => {
  const notifications = read("src/server/queries/notifications.ts");
  const dashboard = read("src/server/queries/dashboard.ts");
  const topbar = read("src/server/queries/topbar.ts");
  const activity = read("src/app/(app)/activity/page.tsx");

  assert.match(notifications, /const hasExplicitRecipient = Boolean/);
  assert.match(notifications, /if \(hasExplicitRecipient\)/);
  assert.match(notifications, /return scope\.companyWideAccess/);
  for (const source of [dashboard, topbar, activity]) assert.match(source, /getVisibleRecentActivitiesForCurrentUser/);
  assert.match(dashboard, /getVisibleNotificationsForCurrentUser/);
  assert.match(topbar, /getVisibleNotificationsForCurrentUser/);
});

test("role workdesks and workspace links use permitted real queues", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const procurement = read("src/app/(app)/procurement/page.tsx");
  const inventory = read("src/app/(app)/inventory/page.tsx");

  for (const heading of ["Owner Workdesk", "Finance Workdesk", "Manager Workdesk", "Purchasing Workdesk", "Kitchen Workdesk", "Outlet Today"]) {
    assert.match(dashboard, new RegExp(heading));
  }
  assert.match(dashboard, /Company-wide operational reviews/);
  assert.match(dashboard, /Protected controls/);
  assert.match(dashboard, /hideMobileConsole/);
  assert.doesNotMatch(procurement, /status=(?:in_review|awaiting_delivery|unpaid)/);
  assert.match(procurement, /status=manager_review/);
  assert.match(procurement, /status=admin_review/);
  assert.match(procurement, /status=finance_review/);
  assert.match(inventory, /\.filter\(\(counter\) => permissions\[counter\.permission\]\)/);
});

test("Finance, Purchasing, activity, and release boundaries are explicit", () => {
  const ia = read("src/lib/information-architecture.ts");
  const permissions = read("src/server/auth/permissions.ts");
  const version = read("src/lib/app-version.ts");
  const purchasingFallback = permissions.match(/purchasing: \[(.*?)\],\n  outlet_staff:/s)?.[1] ?? "";

  assert.match(ia, /href: "\/supplier-invoices"[\s\S]*roles: \["super_admin", "finance"\]/);
  assert.match(ia, /href: "\/activity"[\s\S]*roles: ALL[\s\S]*permission: "dashboard\.view"/);
  assert.doesNotMatch(purchasingFallback, /supplier_invoice\.view/);
  assert.match(version, /APP_VERSION = "7\.23\.5\.6"/);
  assert.match(version, /APP_SPRINT = "v7\.23\.5\.6"/);
});
