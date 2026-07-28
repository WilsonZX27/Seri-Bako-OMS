const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("JSON-backed invoice and recipe line inputs are bounded before schema or RPC use", () => {
  const parser = fs.readFileSync("src/server/validation/json-input.ts", "utf8");
  const invoices = fs.readFileSync("src/server/actions/supplier-invoices.ts", "utf8");
  const recipes = fs.readFileSync("src/server/actions/recipes.ts", "utf8");
  const procurement = fs.readFileSync("src/lib/validations/procurement.ts", "utf8");
  const recipeValidation = fs.readFileSync("src/lib/validations/recipe.ts", "utf8");

  assert.match(parser, /maxCharacters = 100_000/);
  assert.match(parser, /typeof value !== "string"/);
  assert.match(parser, /JSON\.parse\(value\)/);
  assert.match(invoices, /parseBoundedJson\(formData\.get\("lines"\), "invoice lines"\)/);
  assert.match(recipes, /parseBoundedJson\(formData\.get\("lines_json"\), "recipe ingredients"\)/);
  assert.match(procurement, /\.max\(500, "An invoice is limited to 500 receiving lines\."\)/);
  assert.match(recipeValidation, /\.max\(500, "A recipe is limited to 500 ingredients\."\)/);
});
