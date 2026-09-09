const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const database = fs.readFileSync("src/types/database.ts", "utf8");

test("the TypeScript database contract covers every current public table", () => {
  const backup = fs.readFileSync("src/server/backup/export.ts", "utf8");
  const tableSection = database.match(/    Tables: \{([\s\S]*?)    Views: \{/)?.[1] ?? "";

  const classified = [...backup.matchAll(/\{ table: "([a-z0-9_.]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !name.includes(".") && !["barcode_mappings", "locations", "staff_locations"].includes(name))
    .sort();
  const typed = [...tableSection.matchAll(/^\s{6,12}([a-z0-9_]+): (?:\{|TableDefinition<)/gm)]
    .map((match) => match[1])
    .sort();

  assert.equal(classified.length, 114, "Backup classification and local schema table count must move together.");
  assert.equal(new Set(typed).size, typed.length, "Database table types must not be declared twice.");
  assert.deepEqual(typed, classified, "Regenerate or reconcile database types whenever a migration changes the public table set.");
});

test("late-added operational tables have a compile-time Tables membership assertion", () => {
  assert.match(database, /export type DatabaseOperationalTableCoverage = Assert<RequiredOperationalTable extends keyof Database\["public"\]\["Tables"\] \? true : false>/);
});

test("supplemental table definitions do not use any or unknown escape hatches", () => {
  const supplemental = database.match(/branch_stock_count_items: TableDefinition<\{([\s\S]*?)    Views: \{/)?.[0] ?? "";
  assert.ok(supplemental.length > 0);
  assert.doesNotMatch(supplemental, /\b(?:any|unknown)\b/);
});
