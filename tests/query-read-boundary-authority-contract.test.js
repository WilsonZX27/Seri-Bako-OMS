import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const common = readFileSync("src/server/queries/common.ts", "utf8");
const modules = [
  "src/server/queries/outlet-daily-records.ts",
  "src/server/queries/products.ts",
  "src/server/queries/production-jobs.ts",
  "src/server/queries/recipes.ts",
  "src/server/queries/purchase-returns.ts",
  "src/server/queries/stock-operations.ts",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

test("shared read-boundary helpers define the only null-payload policy", () => {
  assert.match(common, /export function requireReadRows<T>/);
  assert.match(common, /if \(data == null\) throw new Error/);
  assert.match(common, /export function requireReadCount/);
  assert.match(common, /if \(count == null\) throw new Error/);
});

test("primary operational query modules opt into fail-closed read boundaries", () => {
  for (const { path, source } of modules) {
    assert.match(source, /requireReadRows/, `${path} must use the shared row boundary`);
  }
});

test("primary lists do not silently turn a null payload into an empty result", () => {
  const sourceByPath = Object.fromEntries(modules.map(({ path, source }) => [path, source]));
  assert.doesNotMatch(sourceByPath["src/server/queries/products.ts"], /return filterProducts\(data \?\? \[\]/);
  assert.doesNotMatch(sourceByPath["src/server/queries/production-jobs.ts"], /const productionRows = \(data \?\? \[\]\)/);
  assert.doesNotMatch(sourceByPath["src/server/queries/outlet-daily-records.ts"], /hydrateRows\(db, \(data \?\? \[\]\)/);
});
