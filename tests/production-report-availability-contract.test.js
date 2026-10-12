import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const planning = readFileSync("src/app/(app)/production/planning/page.tsx", "utf8");
const variance = readFileSync("src/app/(app)/production/variance/page.tsx", "utf8");

test("Production Planning fails closed when stored plans or configuration cannot be verified", () => {
  assert.match(planning, /logServerError/);
  assert.match(planning, /Production planning could not load/);
  assert.match(planning, /Reload to retry/);
  assert.doesNotMatch(planning, /generatePlan\(/);
});

test("Production Variance never classifies a failed read as balanced or zero", () => {
  assert.match(variance, /getProductionDemandVariance\(filters\)\.catch/);
  assert.match(variance, /logServerError\(error, \{ source: "page\.productionVariance\.report" \}\)/);
  assert.match(variance, /Production variance is unavailable/);
  assert.match(variance, /No failed read is classified as balanced or zero/);
  assert.match(variance, /Retry report/);
});
