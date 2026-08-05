import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const productForm = fs.readFileSync("src/components/product-form.tsx", "utf8");
const workflow = fs.readFileSync("src/components/workflow-status-pipeline.tsx", "utf8");
const emptyState = fs.readFileSync("src/components/ui/empty-state.tsx", "utf8");

test("shared surfaces use role-based radius tokens", () => {
  assert.doesNotMatch(productForm, /rounded-\[10px\]/);
  assert.match(productForm, /rounded-\[var\(--sb-control-radius\)\]/);
  assert.match(workflow, /rounded-\[var\(--sb-panel-radius\)\]/);
  assert.match(emptyState, /rounded-\[var\(--sb-control-radius\)\]/);
});

test("workflow steps may retain semantic pill geometry", () => {
  assert.match(workflow, /aria-current=\{active \? "step"/);
  assert.match(workflow, /rounded-full/);
});
