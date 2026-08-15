import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const demand = readFileSync("src/app/(app)/reports/demand-trends/page.tsx", "utf8");
const directory = readFileSync("src/app/(app)/reports/page.tsx", "utf8");

test("Demand Trend Lite preserves an explicit observable unavailable state", () => {
  assert.match(demand, /getOutletDailyDemandTrend\(filters\)\.catch/);
  assert.match(demand, /logServerError\(error, \{ source: "page\.demandTrends\.report" \}\)/);
  assert.match(demand, /Demand Trend Lite is unavailable/);
  assert.match(demand, /no incomplete trend is presented as an empty report/i);
  assert.match(demand, /Retry report/);
});

test("Reports summary distinguishes visible reports from access-hidden catalogue entries", () => {
  assert.match(directory, /const catalogueCount = reportCategories\.reduce/);
  assert.match(directory, /const hiddenByAccess = Math\.max\(0, catalogueCount - reportCount\)/);
  assert.match(directory, />Hidden by access</);
  assert.doesNotMatch(directory, />Total Listed</);
});
