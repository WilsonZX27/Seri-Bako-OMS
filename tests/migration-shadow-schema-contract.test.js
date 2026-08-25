const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function migrationFiles() {
  return fs.readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort();
}

function duplicateCreateTableDeclarations() {
  const declarations = new Map();
  for (const file of migrationFiles()) {
    const sql = fs.readFileSync(path.join("supabase/migrations", file), "utf8");
    for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)) {
      const table = match[1].toLowerCase();
      declarations.set(table, [...(declarations.get(table) ?? []), file]);
    }
  }
  return [...declarations.entries()].filter(([, files]) => files.length > 1);
}

test("duplicate CREATE TABLE histories have explicit canonical closure migrations", () => {
  const duplicates = Object.fromEntries(duplicateCreateTableDeclarations());
  assert.deepEqual(Object.keys(duplicates).sort(), ["attachments", "audit_logs", "notifications"]);

  const attachmentClosure = fs.readFileSync("supabase/migrations/027_sprint_7_1_1_schema_stability.sql", "utf8");
  assert.match(attachmentClosure, /add column if not exists storage_path text/);
  assert.match(attachmentClosure, /alter column file_path drop not null/);

  const notificationClosure = fs.readFileSync("supabase/migrations/025_sprint_6_11_4_notification_message_backfill.sql", "utf8");
  assert.match(notificationClosure, /add column if not exists message text/);
  assert.match(notificationClosure, /alter column message set not null/);

  const auditClosure = fs.readFileSync("supabase/migrations/216_reconcile_audit_log_schema.sql", "utf8");
  for (const column of ["entity_type", "entity_id", "old_values", "new_values", "created_at", "created_by"]) {
    assert.match(auditClosure, new RegExp(`add column if not exists ${column}`));
  }
});

test("a new duplicate table declaration cannot bypass the closure registry", () => {
  const allowed = new Set(["attachments", "audit_logs", "notifications"]);
  const unexpected = duplicateCreateTableDeclarations().map(([table]) => table).filter((table) => !allowed.has(table));
  assert.deepEqual(unexpected, [], "Add an idempotent canonical closure migration before accepting another shadow table definition.");
});
