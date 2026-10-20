const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const stepper = fs.readFileSync(path.join(root, "src/components/ui/quantity-stepper.tsx"), "utf8");
const lowStock = fs.readFileSync(path.join(root, "src/components/low-stock-pr-form.tsx"), "utf8");
const stockBalance = fs.readFileSync(path.join(root, "src/components/stock-balance-workspace.tsx"), "utf8");

test("quantity stepper density has one component authority", () => {
  assert.match(stepper, /type QuantityStepperDensity = "touch" \| "compact" \| "dense"/);
  assert.match(stepper, /const densityStyles/);
  assert.match(stepper, /density\?: QuantityStepperDensity/);
  assert.match(stepper, /density = "touch"/);
  assert.match(stepper, /styles\.root/);
  assert.match(stepper, /styles\.button/);
  assert.match(stepper, /styles\.input/);
});

test("remaining quantity stepper call sites select semantic density and Low Stock has no per-row editor", () => {
  const sources = `${lowStock}\n${stockBalance}`;
  assert.doesNotMatch(sources, /\[&_button\]|\[&_input\]/);
  assert.doesNotMatch(lowStock, /QuantityStepper|Qty for PR|Purchase UOM for/);
  assert.match(stockBalance, /density="dense"/);
  assert.match(stockBalance, /density="compact"/);
});
