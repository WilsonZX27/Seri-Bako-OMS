const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const requests = fs.readFileSync("src/app/(app)/purchase-requests/page.tsx", "utf8");
const requestDetail = fs.readFileSync("src/app/(app)/purchase-requests/[id]/page.tsx", "utf8");
const orders = fs.readFileSync("src/app/(app)/purchase-orders/page.tsx", "utf8");
const calendar = fs.readFileSync("src/app/(app)/outlet-compliance/page.tsx", "utf8");
const planner = fs.readFileSync("src/components/attendance/schedule-planner.tsx", "utf8");

test("purchase registers use the requested two-line information order", () => {
  const renderRegister = require("./helpers/render-pr-register.cjs");
  const fixture = { id: "request-fixture", request_no: "PR/FIX/001", priority: "urgent", request_date: "2026-10-23", needed_by_date: "2026-10-24", branch_name: "CK @ ALMA", requested_by_name: "Fixture Submitter", supplier_state: "assigned", supplier_names: ["Fixture Supplier"], status: "manager_review", line_count: 2, estimated_total: 15.5 };
  const register = renderRegister({ request: fixture });
  assert.deepEqual(register.headers, ["", "Action", "PR number Priority", "Schedule", "Location Requested by", "Supplier", "Status", "Lines / RM"]);
  assert.deepEqual(register.cells, ["", "", "PR/FIX/001 Urgent", "23/10/2026 24/10/2026", "CK @ ALMA Fixture Submitter", "Fixture Supplier", "Manager Review", "2 lines RM 15.50"]);
  assert.match(register.rowHtml, /href="\/purchase-requests\/request-fixture" aria-label="Open PR\/FIX\/001"/);
  assert.match(orders, />Order value<[\s\S]*?order\.line_count\} \{order\.line_count === 1 \? "line" : "lines"\}[\s\S]*?formatCurrency\(order\.order_total\)/);
});

test("unmatched requested items use one red identity without duplicate copy", () => {
  assert.match(requestDetail, /aria-label="Non-catalog item" className="font-medium text-\[var\(--sb-danger\)\]">\{line\.requested_description\}/);
  assert.doesNotMatch(requestDetail, />Non-catalog item · Purchasing match required</);
});

test("urgent compliance is a danger surface and schedule rows omit roles", () => {
  assert.match(calendar, /title="Due soon & expired" kind="danger"/);
  assert.doesNotMatch(planner, /\? "Supervisor"[\s\S]*?\? "Kitchen" : "Staff"/);
});


test("PR sorting preserves active filters and resets page without binding to JSX layout", () => {
  const { headerHtml } = require("./helpers/render-pr-register.cjs")({ filters: { search: "Chiller & fridge", status: "manager_review", page: "3", sort: "request_no", dir: "asc" } });
  const hrefs = Array.from(headerHtml.matchAll(/<a[^>]+href="([^"]+)"/g), match => new URL(match[1].replaceAll("&amp;", "&"), "https://fixture.invalid/purchase-requests"));
  assert.equal(hrefs.length, 3);
  for (const url of hrefs) { assert.equal(url.searchParams.get("search"), "Chiller & fridge"); assert.equal(url.searchParams.get("status"), "manager_review"); assert.equal(url.searchParams.get("page"), "1"); }
  assert.deepEqual(hrefs.map(url => url.searchParams.get("sort")), ["request_no", "request_date", "status"]);
  assert.deepEqual(hrefs.map(url => url.searchParams.get("dir")), ["desc", "asc", "asc"]);
});

test("PR rendered columns keep explicit zero and unresolved supplier meaningful", () => {
  const { cells } = require("./helpers/render-pr-register.cjs")({ request: { id: "zero-fixture", request_no: "PR/FIX/002", priority: "normal", request_date: "2026-10-23", branch_name: null, requested_by_name: "Fixture Submitter", supplier_state: "assignment_required", supplier_names: [], status: "draft", line_count: 0, estimated_total: 0 } });
  assert.equal(cells[4], "— Fixture Submitter");
  assert.equal(cells[5], "Supplier assignment required");
  assert.equal(cells[7], "0 lines RM 0.00");
});
