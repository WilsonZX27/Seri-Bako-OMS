const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/269_attendance_people_and_kitchen_access_repair.sql", "utf8");

test("Kitchen canonical and legacy roles receive both GRN posting aliases", () => {
  assert.match(migration, /permission_code in \('grn\.post', 'goods_receiving\.post'\)/);
  assert.match(migration, /role_code in \('kitchen', 'kitchen_staff'\)/);
  assert.match(migration, /on conflict\(role_id, permission_id\) do nothing/);
});

test("Outlet Compliance gives Kitchen status-only access and keeps outlet roles blocked", () => {
  assert.match(migration, /role_code in \('outlet_staff','kitchen','kitchen_staff'\)/);
  assert.match(migration, /role_code='outlet_supervisor'/);
  assert.match(migration, /'outlet_compliance\.upload','outlet_compliance\.document\.read'/);
  const navigation = fs.readFileSync("src/lib/information-architecture.ts", "utf8");
  const complianceItems = navigation.split("\n").filter((line) => line.includes('href: "/outlet-compliance"') || line.includes('href: "/outlet-calendar"'));
  assert.ok(complianceItems.some((line) => /roles: \[[^\]]*"kitchen"/.test(line)), "Kitchen may read its assigned compliance status.");
  for (const item of complianceItems) {
    assert.doesNotMatch(item, /"outlet_staff"/);
    assert.doesNotMatch(item, /"outlet_supervisor"/);
  }
});

test("weekly attendance review has bounded paging and supporting indexes", () => {
  const query = fs.readFileSync("src/server/queries/attendance.ts", "utf8");
  assert.match(query, /pageSize=100/);
  assert.match(query, /\.range\(\(page-1\)\*pageSize,page\*pageSize-1\)/);
  assert.match(migration, /daily_attendance_review_scope_idx/);
  assert.match(migration, /daily_attendance_review_statuses_idx/);
});
