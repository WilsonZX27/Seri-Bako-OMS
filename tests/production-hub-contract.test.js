const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "production", "page.tsx"), "utf8");
const hub = fs.readFileSync(path.join(root, "src", "components", "operational-hub.tsx"), "utf8");
const query = fs.readFileSync(path.join(root, "src", "server", "queries", "production-jobs.ts"), "utf8");

test("ready-to-post always has an explicit approved-job counter", () => {
  assert.match(query, /\.eq\("status", "approved"\)/);
  assert.match(query, /readyToPost:\s*requireReadCount\(readyToPost\.count/);
  assert.match(page, /redirect\("\/production\/jobs"\)/);
});

test("phone production summary uses high-visibility figures", () => {
  const design = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");
  assert.match(hub, /sb-kpi-value/);
  assert.match(design, /\.sb-kpi-value\s*\{[^}]*font-size:\s*1\.375rem;[^}]*font-weight:\s*700;[^}]*font-variant-numeric:\s*tabular-nums;/);
});

test("legacy production bookmarks enter the existing workspace with tools and console", () => {
  assert.match(page, /redirect\("\/production\/jobs"\)/);
  const jobs = fs.readFileSync(path.join(root, "src/app/(app)/production/jobs/page.tsx"), "utf8");
  assert.match(jobs, /rightRail=/);
  assert.match(jobs, /href="\/production\/planning"/);
  assert.match(jobs, /href="\/production\/variance"/);
});
