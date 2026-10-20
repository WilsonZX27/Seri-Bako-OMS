const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "attendance", "page.tsx"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-sidebar.tsx"), "utf8");

test("Attendance requests the permission it checks before choosing the staff schedule fallback", () => {
  assert.match(page, /getPermissionMap\(\["attendance\.read", "schedule\.read", "attendance\.review", "attendance\.import"\]\)/);
  assert.match(page, /if \(!permissions\["attendance\.read"\]\)/);
});

test("desktop navigation uses 36px rows and mobile navigation retains 44px touch rows", () => {
  assert.match(sidebar, /mobile \? "min-h-11(?: text-xs)?" : "min-h-9(?: text-xs)?"/);
});
