const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("outlet daily operational records survive optional insight failures", () => {
  const page = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");

  assert.match(page, /Promise\.allSettled\(\[[\s\S]*getOutletDailyDemandTrend[\s\S]*getOutletDailyCompletionMatrix/);
  assert.match(page, /trendResult\.status === "rejected"[\s\S]*logServerError/);
  assert.match(page, /completionResult\.status === "rejected"[\s\S]*logServerError/);
  assert.match(page, /unavailable=\{!completion\}/);
  assert.match(page, /unavailable=\{!trend\}/);
});

test("outlet insights distinguish unavailable from a successful empty result", () => {
  const trend = read("src", "components", "outlet-daily-wastage-chart.tsx");
  const completion = read("src", "components", "outlet-daily-completion-matrix.tsx");

  assert.match(trend, /unavailable \? "Unavailable"/);
  assert.match(trend, /Wastage trend unavailable/);
  assert.match(trend, /No completed records in the last 30 days/);
  assert.match(completion, /unavailable \|\| completionPercent === null \? "Not available"/);
  assert.match(completion, /Completion insight unavailable/);
  assert.match(completion, /No outlets in your current scope/);
});
