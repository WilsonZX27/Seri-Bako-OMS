const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("procurement closure gates keep audit evidence and payment before PO close", () => {
  const procurement = read("src/server/actions/procurement.ts");
  const invoices = read("src/server/actions/supplier-invoices.ts");
  assert.match(invoices, /Audit discrepancy: invoice quantity or price/);
  assert.match(invoices, /current_step: "Audit Passed"/);
  assert.match(procurement, /invoice\.status !== "paid"/);
  assert.match(procurement, /document\.current_step !== "Audit Passed"/);
});
