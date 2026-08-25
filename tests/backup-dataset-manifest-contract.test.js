const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const exportSource = fs.readFileSync(path.join(root, "src", "server", "backup", "export.ts"), "utf8");

function migrationTables() {
  const names = new Set();
  for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"))) {
    const source = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const pattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z][a-z0-9_]*)\s*\(/gim;
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  return [...names].sort();
}

function manifestEntries() {
  return [...exportSource.matchAll(/\{\s*table:\s*"([^"]+)",\s*classification:\s*"([^"]+)"([^\n]*)\}/g)].map((match) => ({
    table: match[1],
    classification: match[2],
    remainder: match[3],
  }));
}

test("every migrated public table has an explicit backup classification", () => {
  const entries = manifestEntries();
  const names = entries.map((entry) => entry.table);
  assert.equal(new Set(names).size, names.length, "Backup manifest must not classify a table twice.");

  const classified = new Set(names);
  const missing = migrationTables().filter((table) => !classified.has(table));
  assert.deepEqual(missing, [], `Unclassified database tables: ${missing.join(", ")}`);
});

test("backup exclusions explain why data is not exported", () => {
  const unexplained = manifestEntries()
    .filter((entry) => entry.classification === "excluded" && !/reason:\s*"[^\"]+"/.test(entry.remainder))
    .map((entry) => entry.table);
  assert.deepEqual(unexplained, [], `Excluded backup datasets require a recovery-safe reason: ${unexplained.join(", ")}`);
});

test("tenant-scoped backup datasets declare a filter column", () => {
  const unscoped = manifestEntries()
    .filter((entry) => !["excluded", "intentionally global reference data"].includes(entry.classification))
    .filter((entry) => !/column:\s*"[^\"]+"/.test(entry.remainder))
    .map((entry) => entry.table);
  assert.deepEqual(unscoped, [], `Tenant backup datasets require an explicit filter column: ${unscoped.join(", ")}`);
});
