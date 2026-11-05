import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = p => fs.readFileSync(p, "utf8");
const page = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
test("pending dispatch can be confirmed in draft and existing outlet entry only", () => {
 const condition = page.match(/const editPrimary = (.*?)\n/)[1];
 for (const status of ["draft", "morning_recorded", "evening_completed", "reviewed", "void"]) {
  for (const permission of [true,false]) for (const confirmed of [true,false]) {
   assert.equal(vm.runInNewContext(condition, {record:{status},canEditQtySent:permission,qtySentConfirmed:confirmed}), ["draft","morning_recorded"].includes(status) && permission && !confirmed);
  }
 }
});
test("outlet entry saving does not depend on dispatch confirmation; posted lock stays", () => {
 assert.match(page, /\{canEditOutletValues && record.status === "morning_recorded" \? <SubmitButton[^>]*value="morning_recorded"/);
 assert.match(page, /const statusLocked = \["reviewed", "void"\].includes/);
 assert.match(page, /const canEditOutletValues = !statusLocked && permissions\["outlet_daily_record.update"\]/);
});
test("daily reason uses spare desktop column, carryover keeps full-row details", () => {
 const css=read("src/app/design-system-v2.css");
 assert.match(css, /@container \(min-width: 36rem\)/);
 assert.match(css, /\.sb-daily-line-three > \.sb-daily-wastage-details \{\s*grid-column: 5;\s*grid-row: 1;\s*grid-template-columns: minmax\(0, 1fr\)/);
 assert.match(css, /\.sb-daily-product-line > \.sb-daily-wastage-details \{ grid-column: 2 \/ -1;/);
});
test("percentage suffix removed and desktop action layout is deterministic", () => {
 assert.doesNotMatch(read("src/lib/operational-value-display.ts"), /% rate/);
 assert.match(read("src/app/(app)/attendance/review/page.tsx"), /md:grid md:w-full md:grid-cols-2 md:justify-items-center/);
});
