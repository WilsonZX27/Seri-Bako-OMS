const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");

test("dashboard payables attention uses a summary-only RPC", () => {
  const source = fs.readFileSync(path.join(root, "src/server/queries/ap-aging.ts"), "utf8");
  const functionBody = source.slice(source.indexOf("export async function getPayablesAttention"));

  assert.match(functionBody, /get_payables_attention_summary/);
  assert.doesNotMatch(functionBody, /getApAgingReport\(\)/);
});

test("payables summary preserves the established AP attention rules", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/135_payables_attention_summary.sql"),
    "utf8",
  );

  assert.match(migration, /si\.status in \('open', 'partially_paid'\)/);
  assert.match(migration, /Asia\/Kuala_Lumpur/);
  assert.match(migration, /supplier_invoice_payments/);
  assert.doesNotMatch(migration, /jsonb_agg/);
});
