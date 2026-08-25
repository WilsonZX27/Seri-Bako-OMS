const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migration = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "216_reconcile_audit_log_schema.sql"), "utf8");
const backup = fs.readFileSync(path.join(__dirname, "..", "src", "server", "backup", "export.ts"), "utf8");

test("audit-log closure preserves legacy evidence and exposes the canonical write shape", () => {
  assert.match(migration, /add column if not exists old_values jsonb/i);
  assert.match(migration, /add column if not exists new_values jsonb/i);
  assert.match(migration, /old_values\s*=\s*coalesce\(old_values, old_data\)/i);
  assert.match(migration, /new_values\s*=\s*coalesce\(new_values, new_data\)/i);
  assert.match(migration, /entity_id\s*=\s*coalesce\(entity_id, record_id, company_id, id\)/i);
  assert.match(migration, /alter column entity_type set not null/i);
  assert.match(migration, /alter column entity_id set not null/i);
});

test("Owner backup writes only the reconciled audit-log contract", () => {
  const auditWrite = backup.slice(backup.indexOf('db.from("audit_logs")'), backup.indexOf('db.from("audit_logs")') + 800);
  assert.match(auditWrite, /entity_type:\s*"system_backup"/);
  assert.match(auditWrite, /new_values:/);
  assert.match(auditWrite, /created_by:/);
  assert.doesNotMatch(auditWrite, /new_data:/);
});
