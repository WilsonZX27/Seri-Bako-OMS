const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("outlet daily operational records are independent of optional insight failures", () => {
 const page=read("src","app","(app)","outlet-daily-records","page.tsx");
 const insight=read("src","app","(app)","outlet-daily-records","insights","page.tsx");
 assert.doesNotMatch(page,/getOutletDailyDemandTrend|getOutletDailyCompletionMatrix/);
 assert.match(page,/OutletDailyWorkspaceNav current="records"/);
 assert.match(insight,/Promise\.allSettled/);
 assert.match(insight,/loaded\.status==="rejected"/);
 assert.match(insight,/Insight unavailable/);
});

test("outlet insights distinguish unavailable from a successful empty result", () => {
  const trend = read("src", "components", "outlet-daily-wastage-chart.tsx");
  const completion = read("src", "components", "outlet-daily-completion-matrix.tsx");

  assert.match(trend, /unavailable \? "Unavailable"/);
  assert.match(trend, /Wastage trend unavailable/);
  assert.match(trend, /No completed records in these 7 days/);
  assert.match(completion, /unavailable \|\| completionPercent === null \? "Not available"/);
  assert.match(completion, /Completion insight unavailable/);
  assert.match(completion, /No outlets in your current scope/);
});
