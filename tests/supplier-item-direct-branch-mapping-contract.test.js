const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("supplier item form exposes direct branch mapping instead of import-only setup", () => {
  const form = read("src/components/master-data-forms.tsx");
  const action = read("src/server/actions/master-data.ts");
  const newPage = read("src/app/(app)/supplier-items/new/page.tsx");

  assert.match(form, /name="branch_ids"/);
  assert.match(form, /defaultChecked=\{result \? saved\.getAll\("branch_ids"\)\.includes\(branch\.id\) : branch\.id === initialBranchId\}/);
  assert.match(form, /name="is_preferred"/);
  assert.match(action, /save_branch_supplier_item_mappings/);
  assert.match(newPage, /getBranchesForSelect/);
});

test("item and supplier records expose contextual mapping entry points", () => {
  const itemPage = read("src/app/(app)/items/[id]/page.tsx");
  const supplierPage = read("src/app/(app)/suppliers/[id]/page.tsx");

  assert.match(itemPage, /supplier-items\/new\?itemId=/);
  assert.match(supplierPage, /supplier-items\/new\?supplierId=/);
});

test("purchase request sourcing warning opens contextual mapping setup", () => {
  const requestForm = read("src/components/procurement-forms.tsx");
  const newPage = read("src/app/(app)/supplier-items/new/page.tsx");
  assert.match(requestForm, /supplier-items\/new\?itemId=\$\{line\.itemId\}&branchId=\$\{branchId\}/);
  assert.match(newPage, /initialBranchId=\{query\.branchId\}/);
});
