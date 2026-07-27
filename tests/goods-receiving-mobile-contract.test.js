const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "goods-receiving-form.tsx"), "utf8");

test("goods receiving defaults its mobile branch context to the selected PO", () => {
  assert.match(source, /name="branch_id" defaultValue=\{selectedOrder\?\.branch_id \?\? branches\[0\]\?\.id \?\? ""\}/);
  assert.match(source, /inputMode="decimal"/);
  assert.match(source, /name="line_expiry_date" type="date"/);
});
