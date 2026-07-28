const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("local browser verification reads its explicit fixture without invoking the Supabase CLI", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/playwright-local-server.mjs"), "utf8");

  assert.match(source, /\.env\.test\.local/);
  assert.doesNotMatch(source, /execFileSync/);
});
