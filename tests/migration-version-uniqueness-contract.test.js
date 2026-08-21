const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationDir = path.resolve(__dirname, "..", "supabase", "migrations");

test("Supabase migration versions are unique and the latest repair stays forward-only", () => {
  const files = fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql"));
  const versions = new Map();
  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) continue;
    const version = match[1];
    const existing = versions.get(version) ?? [];
    existing.push(file);
    versions.set(version, existing);
  }

  const duplicates = [...versions.entries()].filter(([, names]) => names.length > 1);
  assert.deepEqual(duplicates, [], "migration version prefixes must not be duplicated");
  assert.ok(files.includes("190_fix_autocount_import_confirm.sql"), "AutoCount repair must remain a forward-only migration");
});
