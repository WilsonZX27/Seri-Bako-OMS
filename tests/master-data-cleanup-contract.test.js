const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const query = read("src/server/queries/master-data-cleanup.ts");
const page = read("src/app/(app)/administration/master-data-cleanup/page.tsx");
const nav = read("src/lib/information-architecture.ts");
const routes = read("src/server/auth/route-permissions.ts");

test("Master Data Cleanup is a protected read-only route with existing master record links", () => {
  assert.equal(fs.existsSync("src/app/(app)/administration/master-data-cleanup/page.tsx"), true);
  assert.match(nav, /\/administration\/master-data-cleanup/);
  assert.match(routes, /"\/administration\/master-data-cleanup": \["items\.view"\]/);
  for (const href of ["`/items/${row.id}`", "`/products/${row.id}`", "`/suppliers/${row.id}`"]) assert.equal(query.includes(href), true);
  assert.doesNotMatch(page, /Location|Barcode/i);
  assert.match(page, /This report is read-only/);
  assert.match(page, /No records are merged or deleted here/);
});

test("Master Data Cleanup checks codes, core fields, and inactive references without mutations", () => {
  assert.match(query, /const normalized =/);
  assert.match(query, /Duplicate or variant code/);
  assert.match(query, /Missing base UOM/);
  assert.match(query, /Missing product name/);
  assert.match(query, /Missing supplier contact/);
  assert.match(query, /Inactive but referenced/);
  assert.match(query, /severity: "critical"/);
  assert.match(query, /severity: "warning"/);
  assert.doesNotMatch(query, /\.insert\(|\.update\(|\.delete\(/);
});

test("Master Data Cleanup follows the current footer with the scoped Outlet Staff seed", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "7\.23\.7\.0"/);
  assert.match(version, /APP_SPRINT = "v7\.23\.7\.0"/);
  assert.match(read("supabase/migrations/066_create_outlet_staff_role.sql"), /outlet_staff/);
});


