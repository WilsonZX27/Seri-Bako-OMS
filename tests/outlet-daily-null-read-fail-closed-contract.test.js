const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/server/queries/outlet-daily-records.ts", "utf8");

test("outlet daily list and summary reads never coerce null payloads into zero", () => {
  assert.match(source, /if \(!data \|\| count === null\) throw new Error\("Outlet daily record list returned no data\."\)/);
  assert.match(source, /Outlet daily record summary returned incomplete data\./);
  assert.match(source, /if \(!lines \|\| !branches\) throw new Error/);
  assert.match(source, /resolveActorDisplayMap\(staffIds\)/);
});

test("outlet daily trend and completion reads fail closed on null payloads", () => {
  assert.match(source, /const typedRecords = await readCompletePages/);
  assert.match(source, /readCompletePages[\s\S]*outlet_daily_record_lines/);
  const pagination = fs.readFileSync("src/server/queries/read-complete-pages.ts", "utf8");
  assert.match(pagination, /!result.data \|\| result.count === null/);
  assert.match(source, /if \(!data\) throw new Error\("Outlet daily completion matrix returned no data\."\)/);
});
