import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("supplier item identity always comes from AutoCount Item Master", () => {
  const form = read("src/components/master-data-forms.tsx");
  const action = read("src/server/actions/master-data.ts");
  const migration = read("supabase/migrations/154_supplier_items_use_item_master_identity.sql");

  assert.doesNotMatch(form, /name="supplier_item_code"/);
  assert.doesNotMatch(form, /name="supplier_item_name"/);
  assert.match(form, /use the selected Item Master&apos;s AutoCount code and name automatically/);
  assert.match(action, /select\("item_code,item_name"\)/);
  assert.match(action, /supplier_item_code: item\.item_code/);
  assert.match(action, /supplier_item_name: item\.item_name/);
  assert.match(migration, /update public\.supplier_items supplier_item/);
  assert.match(migration, /new\.supplier_item_code := item_record\.item_code/);
  assert.match(migration, /new\.supplier_item_name := item_record\.item_name/);
  assert.match(migration, /before insert or update of item_id, company_id, supplier_item_code, supplier_item_name/);
});
