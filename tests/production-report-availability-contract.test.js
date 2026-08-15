import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const planning = readFileSync("src/app/(app)/production/planning/page.tsx", "utf8");
const variance = readFileSync("src/app/(app)/production/variance/page.tsx", "utf8");

test("Production Planning preserves an explicit retryable unavailable state", () => {
  assert.match(planning, /getProductionPlanning\(filters\)\.catch/);
  assert.match(planning, /logServerError\(error, \{ source: "page\.productionPlanning\.report" \}\)/);
  assert.match(planning, /Production Planning Lite is unavailable/);
  assert.match(planning, /No planning suggestion is shown as zero/);
  assert.match(planning, /Retry report/);
});

test("Production Variance never classifies a failed read as balanced or zero", () => {
  assert.match(variance, /getProductionDemandVariance\(filters\)\.catch/);
  assert.match(variance, /logServerError\(error, \{ source: "page\.productionVariance\.report" \}\)/);
  assert.match(variance, /Production variance is unavailable/);
  assert.match(variance, /No failed read is classified as balanced or zero/);
  assert.match(variance, /Retry report/);
});
