const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("local browser sessions isolate their Next output from production builds", () => {
  const config = fs.readFileSync("next.config.ts", "utf8");
  const localServer = fs.readFileSync("scripts/playwright-local-server.mjs", "utf8");

  assert.match(config, /distDir: process\.env\.NEXT_DIST_DIR \|\| "\.next"/);
  assert.match(localServer, /NEXT_DIST_DIR: production \? "\.next-playwright-production" : "\.next-playwright"/);
});
