import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const recipeCosting = readFileSync("src/server/queries/recipe-costing.ts", "utf8");
const costingReadiness = readFileSync("src/server/queries/costing-readiness.ts", "utf8");

test("costing reports index recipe lines once instead of rescanning them per recipe", () => {
  for (const [name, source] of [["recipe costing", recipeCosting], ["costing readiness", costingReadiness]]) {
    assert.match(source, /const linesByRecipe = new Map/);
    assert.match(source, /for \(const line of data\.recipeLines\)/);
    assert.match(source, /linesByRecipe\.get\(recipe\.id\) \?\? \[\]/);
    assert.doesNotMatch(
      source,
      /data\.recipeLines\.filter\(\(line\) => line\.recipe_id === recipe\.id\)/,
      `${name} must not perform an O(recipes × lines) scan`,
    );
  }
});

test("costing reports request explicit projections instead of complete master rows", () => {
  for (const [name, source] of [["recipe costing", recipeCosting], ["costing readiness", costingReadiness]]) {
    assert.doesNotMatch(source, /\.select\(["']\*["']\)/, `${name} must keep its database payload explicit`);
  }
  const productMargin = readFileSync("src/server/queries/product-margin.ts", "utf8");
  assert.doesNotMatch(productMargin, /\.select\(["']\*["']\)/, "product margin must keep its database payload explicit");
});
