const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const page = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");

test("rejected purchase requests show the latest recorded reason in the main workspace", () => {
  assert.match(page, /activity\.activity_type === "rejected"/);
  assert.match(page, /Purchase request rejected:\\s\*\/i/);
  assert.match(page, /Rejected — correction required/);
  assert.match(page, /Approver · \{formatDateTime\(rejectionActivity\.created_at\)\}/);
  assert.match(page, /formatDateTime\(rejectionActivity\.created_at\)/);
});
