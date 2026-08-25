const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const sql = fs.readFileSync(path.resolve(__dirname, "..", "supabase", "migrations", "215_repair_legacy_recipe_preview_identity.sql"), "utf8");
test("legacy recipe preview follows the current recipe_no identity", () => {
  assert.match(sql, /r\.recipe_code.*r\.recipe_no/);
  assert.match(sql, /r\.recipe_name.*r\.recipe_no/);
});
