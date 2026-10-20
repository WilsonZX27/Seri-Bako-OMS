const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

test("editing sequence metadata preserves stored padding instead of resetting it to the creation default", () => {
  const action = fs.readFileSync("src/server/actions/foundation.ts", "utf8").split("export async function updateDocumentSequence(")[1].split("export async function deleteDocumentSequence(")[0];
  assert.match(action, /delete updates.padding/);
  assert.match(action, /\.update\(updates\)/);
  assert.match(action, /\.eq\("company_id", actor.companyId\)/);
  const form = fs.readFileSync("src/components/document-sequence-form.tsx", "utf8");
  assert.match(form, /sequence\?\.padding \?\? 3/);
  assert.match(form, /padStart\(Math.max\(padding, 3\)/);
});
