import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/089_document_transition_atomicity.sql", "utf8");
const repair = fs.readFileSync("supabase/migrations/188_fix_document_transition_approval_scope.sql", "utf8");
const action = fs.readFileSync("src/server/actions/documents.ts", "utf8");

test("generic document transitions enforce row state and co-commit audit artifacts", () => {
  assert.match(sql, /for update/);
  assert.match(sql, /doc\.status <> 'draft'/);
  assert.match(sql, /doc\.status <> 'pending_approval'/);
  assert.match(sql, /document_revisions/);
  assert.match(sql, /activity_logs/);
  assert.match(action, /rpc\("transition_document_atomic"/);
  assert.doesNotMatch(action, /\.from\("documents"\)\.update\(/);
});

test("document transition repair qualifies approval-step scope", () => {
  assert.match(repair, /update public\.approval_steps as step/);
  assert.match(repair, /where step\.approval_id in/);
  assert.match(repair, /select a\.id from public\.approvals as a/);
});
