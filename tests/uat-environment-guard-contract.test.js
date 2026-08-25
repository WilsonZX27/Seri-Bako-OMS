const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Production UAT guard fails closed on host, confirmation and project mismatch", () => {
  const source = fs.readFileSync("scripts/check-uat-environment.mjs", "utf8");
  assert.match(source, /RUN_PRODUCTION_UAT !== "confirmed"/);
  assert.match(source, /system\.seribako\.com\.my/);
  assert.match(source, /Production Supabase project mismatch/);
  assert.match(source, /Production UAT cannot use a loopback host/);
  assert.match(source, /TEST_SUPER_ADMIN_PASSWORD/);
});
