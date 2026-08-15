const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("explicit report unavailable states remain observable", () => {
  for (const [parts, source, unavailableCopy] of [
    [["administration", "master-data-cleanup"], "page.masterDataCleanup.report", "Cleanup checks unavailable"],
    [["reports", "costing-readiness"], "page.costingReadiness.report", "Costing readiness is unavailable"],
    [["reports", "procurement-variance"], "page.procurementVariance.report", "Procurement variance is unavailable"],
    [["reports", "product-margin"], "page.productMargin.report", "Product margin is unavailable"],
    [["reports", "recipe-costing"], "page.recipeCosting.report", "Recipe costing is unavailable"],
  ]) {
    const page = read("src", "app", "(app)", ...parts, "page.tsx");
    assert.match(page, /logServerError/);
    assert.match(page, new RegExp(source.replaceAll(".", "\\.")));
    assert.match(page, new RegExp(unavailableCopy));
    assert.doesNotMatch(page, /\.catch\(\(\) => null\)/);
  }
});
