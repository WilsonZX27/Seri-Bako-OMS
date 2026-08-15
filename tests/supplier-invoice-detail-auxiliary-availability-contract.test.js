const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "supplier-invoices", "[id]", "page.tsx"), "utf8");

test("supplier-invoice detail settles optional reads independently", () => {
  assert.match(page, /Promise\.allSettled\(\[/);
  assert.doesNotMatch(page, /getApAgingReport\([^)]*\)\.catch\(\(\) => null\)/);
  for (const source of ["documentBundle", "editSources", "aging"]) {
    assert.match(page, new RegExp(`page\\.supplierInvoiceDetail\\.${source}`), source);
  }
});

test("unverified attachment state cannot approve an invoice", () => {
  assert.match(page, /documentBundleUnavailable[\s\S]*Approval unavailable/);
  assert.match(page, /Attachment status could not be verified/);
  assert.match(page, /Document activity unavailable/);
  assert.match(page, /Approval remains disabled until verification succeeds/);
});

test("missing edit sources keep the draft readable but not writable", () => {
  assert.match(page, /const canSave =[\s\S]*Boolean\(editSources\)/);
  assert.match(page, /editSourcesUnavailable[\s\S]*Draft editing unavailable/);
  assert.match(page, /Existing invoice values remain read-only until you retry/);
  assert.match(page, /invoice\.status === "draft" && editSources \? \(/);
});

test("AP Aging failure is not presented as no payment attention", () => {
  assert.match(page, /agingRequested/);
  assert.match(page, /agingUnavailable/);
  assert.match(page, /AP Aging could not be loaded/);
  assert.match(page, /invoice balance remains authoritative/);
});
