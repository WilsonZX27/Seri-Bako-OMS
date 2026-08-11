const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Outlet Staff daily-record access is repaired by an idempotent permission migration", () => {
  const migration = fs.readFileSync("supabase/migrations/113_repair_outlet_staff_daily_record_access.sql", "utf8");
  assert.match(migration, /insert into public\.permissions/i);
  assert.match(migration, /outlet_daily_record\.view/);
  assert.match(migration, /outlet_daily_record\.create/);
  assert.match(migration, /outlet_daily_record\.update/);
  assert.match(migration, /where r\.role_code = 'outlet_staff'/i);
  assert.match(migration, /on conflict \(role_id, permission_id\) do nothing/i);
  assert.doesNotMatch(migration, /alter table public\.outlet_daily_records disable row level security/i);
});
