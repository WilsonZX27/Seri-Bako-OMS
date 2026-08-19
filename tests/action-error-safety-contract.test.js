import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/server/actions/error-handling.ts", "utf8");
const page = fs.readFileSync("src/app/(app)/purchase-requests/new/page.tsx", "utf8");

test("technical database diagnostics never leak through action redirects", () => {
  assert.match(source, /isTechnicalDatabaseError/);
  assert.match(source, /column reference/);
  assert.match(source, /operator does not exist/);
  assert.match(source, /(?:column\|table\|schema\|relation)/);
  assert.match(source, /system database is not ready/);
  assert.match(source, /Please retry or contact the Super Admin \/ Owner/);
});

test("technical database diagnostics are classified as unavailable", () => {
  assert.match(source, /if \(isTechnicalDatabaseError\(error\)\) return "database_unavailable"/);
});

test("purchase request action errors retain a visible recovery path", () => {
  assert.match(page, /data-action-error/);
  assert.match(page, /role="alert"/);
  assert.match(page, /Back to purchase requests/);
});
