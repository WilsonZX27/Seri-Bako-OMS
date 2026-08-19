import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/server/actions/error-handling.ts", "utf8");
const page = fs.readFileSync("src/app/(app)/purchase-requests/new/page.tsx", "utf8");
const notice = fs.readFileSync("src/components/action-error-notice.tsx", "utf8");

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
  assert.match(page, /ActionErrorNotice/);
  assert.match(notice, /data-action-error/);
  assert.match(notice, /role="alert"/);
  assert.match(page, /Back to purchase requests/);
});

test("validation errors retain safe field context", () => {
  assert.match(source, /formatValidationError\(error\)/);
  assert.match(source, /Request branch/);
  assert.match(source, /Requested items/);
  assert.match(source, /issue\.message\.replace/);
  assert.match(source, /message\.length > 160/);
});
