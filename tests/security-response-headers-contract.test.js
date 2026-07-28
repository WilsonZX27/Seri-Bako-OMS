const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("application responses carry baseline browser hardening headers", () => {
  const config = fs.readFileSync("next.config.ts", "utf8");

  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Content-Security-Policy",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.match(config, new RegExp(header));
  }
  assert.match(config, /nosniff/);
  assert.match(config, /DENY/);
  assert.match(config, /base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'/);
  assert.match(config, /allowedDevOrigins:\s*\["127\.0\.0\.1", "localhost"\]/);
});
