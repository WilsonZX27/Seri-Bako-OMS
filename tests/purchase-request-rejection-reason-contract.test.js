const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const page = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");

test("rejected purchase requests show the latest recorded reason in the main workspace", () => {
  assert.match(page, /activity\.activity_type === "rejected"/);
  assert.match(page, /Purchase request rejected:\\s\*\/i/);
  assert.match(page, /Why this request was returned/);
  assert.match(page, /Correct the issue below, then resubmit the purchase request\./);
  assert.match(page, /Reason:/);
  assert.match(page, /created_by_name/);
  assert.match(page, /formatDateTime\(rejectionActivity\.created_at\)/);
  assert.doesNotMatch(page, /Correct the request, save it, then submit it to Manager Review again/);
});
