const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("purchase-order transition writes document status with the document enum", () => {
  const source = fs.readFileSync("supabase/migrations/086_purchase_order_transition_atomicity.sql", "utf8");
  assert.match(source, /document_status public\.document_status/);
  assert.doesNotMatch(source, /document_status public\.approval_status/);
});
