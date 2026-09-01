const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("People Operations has a real workspace permission set and Employees landing", () => {
  const migration = fs.readFileSync("supabase/migrations/234_repair_people_operations_workspace_access.sql", "utf8");
  const ia = fs.readFileSync("src/lib/information-architecture.ts", "utf8");
  assert.match(migration, /on conflict\(company_id,role_code\).*deleted_at=null/s);
  assert.match(migration, /'dashboard\.view'/);
  assert.match(migration, /'people\.read'/);
  assert.match(migration, /'people\.compliance\.manage'/);
  assert.match(migration, /'staffs\.read'/);
  assert.match(ia, /href: "\/people"[^\n]+defaultFor: \["people_operations"\]/);
});
