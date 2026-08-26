import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const action = fs.readFileSync("src/server/actions/outlet-daily-records.ts", "utf8");
const query = fs.readFileSync("src/server/queries/outlet-daily-records.ts", "utf8");
const detailPage = fs.readFileSync("src/app/(app)/outlet-daily-records/[id]/page.tsx", "utf8");

test("Outlet Daily activity records only real value changes", () => {
  assert.match(action, /changedDailyFields/);
  assert.match(action, /if \(!recordId \|\| changedLines\.length \|\| statusChanged \|\| notesChanged\)/);
  assert.match(action, /fieldNames\.has\("received"\) \? "Received"/);
  assert.match(action, /fieldNames\.has\("wastage"\) \|\| fieldNames\.has\("reason"\) \? "Wastage"/);
  assert.doesNotMatch(action, /message: recordId \? "Outlet daily values updated"/);
});

test("Outlet Daily activity folds historical duplicate saves and always identifies creation", () => {
  assert.match(query, /secondsApart > 60 \|\| JSON\.stringify\(newer\.metadata\) !== JSON\.stringify\(entry\.metadata\)/);
  assert.match(query, /activityDisplayMessage/);
  assert.match(query, /created_by_name/);
  assert.match(detailPage, /Outlet daily record created/);
  assert.match(detailPage, /activity\.display_message/);
  assert.doesNotMatch(detailPage, /No changes recorded yet/);
});
