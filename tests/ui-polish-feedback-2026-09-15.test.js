const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const requests = fs.readFileSync("src/app/(app)/purchase-requests/page.tsx", "utf8");
const requestDetail = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");
const orders = fs.readFileSync("src/app/(app)/purchase-orders/page.tsx", "utf8");
const calendar = fs.readFileSync("src/app/(app)/outlet-calendar/page.tsx", "utf8");
const planner = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");

test("purchase registers use the requested two-line information order", () => {
  assert.match(requests, /label="PR number \/ Priority"/);
  assert.match(requests, />Location \/ Requested by</);
  assert.match(requests, /DocumentNumber value=\{request\.request_no\}[\s\S]*?PriorityBadge priority=\{request\.priority\}/);
  assert.match(requests, /request\.branch_name[\s\S]*?request\.requested_by_name/);
  assert.match(orders, />Order value<[\s\S]*?order\.line_count\} lines[\s\S]*?formatCurrency\(order\.order_total\)/);
});

test("unmatched requested items use one red identity without duplicate copy", () => {
  assert.match(requestDetail, /aria-label="Non-catalog item" className="font-medium text-\[var\(--sb-danger\)\]">\{line\.requested_description\}/);
  assert.doesNotMatch(requestDetail, />Non-catalog item · Purchasing match required</);
});

test("urgent compliance is a danger surface and schedule rows omit roles", () => {
  assert.match(calendar, /title="Due soon & expired" kind="danger"/);
  assert.doesNotMatch(planner, /\? "Supervisor"[\s\S]*?\? "Kitchen" : "Staff"/);
});
