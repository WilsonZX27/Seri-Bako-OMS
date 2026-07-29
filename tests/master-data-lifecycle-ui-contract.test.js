const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("master-data forms preserve lifecycle state without exposing ordinary status dropdowns", () => {
  const forms = read("src/components/master-data-forms.tsx");
  const supplierItemDetail = read("src/app/(app)/supplier-items/[id]/page.tsx");
  const conversionDetail = read("src/app/(app)/uom-conversions/[id]/page.tsx");
  const actions = read("src/server/actions/master-data.ts");

  assert.doesNotMatch(forms, /function StatusSelect/);
  assert.doesNotMatch(forms, /<Field label="Status">/);
  assert.match(forms, /type="hidden" name="status" value=\{supplierItem\?\.status \?\? "active"\}/);
  assert.match(forms, /type="hidden" name="status" value=\{conversion\?\.status \?\? "active"\}/);

  for (const source of [supplierItemDetail, conversionDetail]) {
    assert.match(source, /<StatusBadge status=/);
    assert.match(source, /<RecordActionPanel title="Lifecycle">/);
    assert.match(source, /<DangerConfirmForm/);
    assert.match(source, /data-mobile-primary-action/);
  }

  assert.match(actions, /export async function restoreSupplierItem/);
  assert.match(actions, /export async function restoreUomConversion/);
  assert.match(actions, /update\(\{ status: "active", deleted_at: null \}\)/);
  assert.match(actions, /eq\("company_id", actor\.companyId\)/);
});
