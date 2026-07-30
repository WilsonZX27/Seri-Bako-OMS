const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/112_restrict_central_kitchen_pr_rpc_acl.sql",
  ),
  "utf8",
);
const preflight = fs.readFileSync(
  path.join(
    root,
    "supabase/verification/production_migration_112_preflight_readonly.sql",
  ),
  "utf8",
);
const verification = fs.readFileSync(
  path.join(
    root,
    "supabase/verification/production_migration_112_post_readonly.sql",
  ),
  "utf8",
);

test("migration 112 only repairs the Central Kitchen PR RPC ACL", () => {
  assert.match(
    migration,
    /revoke all on function\s+public\.create_central_kitchen_purchase_request_atomic\(jsonb\)\s+from public, anon;/i,
  );
  assert.match(
    migration,
    /grant execute on function\s+public\.create_central_kitchen_purchase_request_atomic\(jsonb\)\s+to authenticated;/i,
  );
  assert.match(migration, /has_function_privilege\(\s*'anon'/i);
  assert.match(migration, /has_function_privilege\(\s*'authenticated'/i);
  assert.doesNotMatch(
    migration,
    /\b(insert|update|delete|merge|create table|alter table|drop table|truncate)\b/i,
  );
});

test("migration 112 verification assets are read-only", () => {
  for (const sql of [preflight, verification]) {
    assert.match(sql, /begin transaction read only;/i);
    assert.match(sql, /rollback;/i);
    assert.doesNotMatch(
      sql,
      /^\s*(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b/im,
    );
  }
});
