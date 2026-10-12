import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const query = readFileSync("src/server/queries/topbar.ts", "utf8");
const notifications = readFileSync("src/server/queries/notifications.ts", "utf8");
const menu = readFileSync("src/components/layout/top-bar-activity-menu.tsx", "utf8");

test("topbar preserves explicit availability for advisory queues", () => {
  assert.match(query, /availability:\s*\{[\s\S]*pendingActions: !pendingActionsUnavailable[\s\S]*notifications: !notificationsResult\.unavailable/);
  assert.match(query, /topbar\.document-approvals/);
  assert.match(query, /topbar\.production-\$\{filter\.status\}/);
  assert.match(menu, /Pending actions are temporarily unavailable/);
  assert.match(menu, /pendingActionsAvailable && !pendingApprovals\.length/);
  assert.match(menu, /Notifications are temporarily unavailable/);
  assert.match(menu, /notificationsAvailable && !notificationCount/);
});

test("notification scope and validation reads fail closed instead of returning a false empty tray", () => {
  assert.match(notifications, /if \(staffError\) throw new Error/);
  assert.match(notifications, /for \(const result of \[staffRolesResult, staffBranchesResult\]\)/);
  assert.match(notifications, /roles\(role_code, status, deleted_at\)/);
  assert.match(notifications, /if \(notificationsResult\.error\) throw new Error/);
  assert.match(notifications, /if \(recipientsResult\.error\) throw new Error/);
  assert.match(notifications, /if \(pendingRequestsResult\.error\) throw new Error/);
  assert.match(notifications, /if \(activeStockCountsResult\.error\) throw new Error/);
});

test("activity log link no longer claims an unqueried feed is empty", () => {
  assert.match(menu, />Activity Log</);
  assert.match(menu, />Open full activity log</);
  assert.doesNotMatch(menu, /No recent activity\./);
});
