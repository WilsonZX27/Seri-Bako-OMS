const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(process.cwd(), "src/components/stock-count-form.tsx"), "utf8");
const createPage = fs.readFileSync(path.join(process.cwd(), "src/app/(app)/stock-counts/new/page.tsx"), "utf8");
const detailPage = fs.readFileSync(path.join(process.cwd(), "src/app/(app)/stock-counts/[id]/page.tsx"), "utf8");

test("stock count exposes one primary submit source at each responsive band", () => {
  assert.match(source, /data-mobile-document-action[\s\S]*?sb-mobile-action-bar[\s\S]*?md:hidden/);
  assert.match(createPage, /sidePanel=\{[\s\S]*?<SubmitButton form=\{formId\}[\s\S]*?>Save draft<\/SubmitButton>/);
  assert.doesNotMatch(createPage, /hideMobileWorkflow/);
  assert.match(createPage, /currentStatus="draft"/);
  assert.match(detailPage, /DocumentActionBar[\s\S]*?<SubmitButton form=\{formId\}[\s\S]*?>Save draft<\/SubmitButton>/);
  assert.match(detailPage, /Confirm & Post Count/);
  assert.doesNotMatch(source, /hidden (?:md|xl):inline-flex/);
});
