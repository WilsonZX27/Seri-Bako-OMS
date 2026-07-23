import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/088_document_number_authorization.sql", "utf8");

test("document number allocation derives and validates tenant actor", () => {
  assert.match(sql, /auth_user_id = auth\.uid\(\)/);
  assert.match(sql, /actor\.company_id is distinct from p_company_id/);
  assert.match(sql, /has_any_permission/);
  assert.match(sql, /revoke all on function public\.next_document_number\(uuid,text\) from public/);
  assert.match(sql, /revoke all on function public\.next_document_number\(uuid,text\) from anon/);
  assert.match(sql, /set search_path = pg_catalog, public/);
});
