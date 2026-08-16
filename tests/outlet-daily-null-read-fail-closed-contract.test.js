const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/server/queries/outlet-daily-records.ts", "utf8");

test("outlet daily list and summary reads never coerce null payloads into zero", () => {
  assert.match(source, /if \(!data \|\| count === null\) throw new Error\("Outlet daily record list returned no data\."\)/);
  assert.match(source, /if \(!todayRecords\) throw new Error\("Outlet daily record summary returned no data\."\)/);
  assert.match(source, /if \(!lines \|\| !branches \|\| !staffResult\.data\) throw new Error/);
});

test("outlet daily trend and completion reads fail closed on null payloads", () => {
  assert.match(source, /if \(!records\) throw new Error\("Outlet daily demand records returned no data\."\)/);
  assert.match(source, /if \(!lines\) throw new Error\("Outlet daily demand lines returned no data\."\)/);
  assert.match(source, /if \(!data\) throw new Error\("Outlet daily completion matrix returned no data\."\)/);
});
