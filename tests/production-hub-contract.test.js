const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "production", "page.tsx"), "utf8");
const hub = fs.readFileSync(path.join(root, "src", "components", "operational-hub.tsx"), "utf8");
const query = fs.readFileSync(path.join(root, "src", "server", "queries", "production-jobs.ts"), "utf8");
const responsiveSpec = fs.readFileSync(path.join(root, "tests", "e2e", "production-hub-responsive.spec.js"), "utf8");

test("ready-to-post always has an explicit approved-job counter", () => {
  assert.match(query, /\.eq\("status", "approved"\)/);
  assert.match(query, /readyToPost:\s*readyToPost\.count\s*\?\?\s*0/);
  assert.match(page, /title:\s*"Ready to post"[\s\S]*?value:\s*summary\.readyToPost/);
});

test("phone production summary uses high-visibility figures", () => {
  assert.match(hub, /text-\[1\.375rem\]/);
  assert.match(hub, /font-bold/);
  assert.match(hub, /tabular-nums/);
});

test("phone production page reserves space above sticky navigation", () => {
  assert.match(page, /pb-24/);
  assert.match(responsiveSpec, /last production tool must sit above the mobile tab bar/);
  assert.match(responsiveSpec, /mobileNav\.y - 8/);
});
