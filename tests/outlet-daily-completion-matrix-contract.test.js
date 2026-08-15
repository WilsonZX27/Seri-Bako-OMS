const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("outlet completion matrix uses a bounded seven-day header query and preserves authoritative states", () => {
  const query = read("src/server/queries/outlet-daily-records.ts");
  assert.match(query, /getOutletDailyCompletionMatrix/);
  assert.match(query, /const start = shiftDate\(end, -6\)/);
  assert.match(query, /select\("id,branch_id,record_date,status,updated_at"\)/);
  assert.match(query, /\.gte\("record_date", start\)[\s\S]*\.lte\("record_date", end\)/);
  assert.match(query, /record\?\.status \?\? "missing"/);
  assert.match(query, /\["evening_completed", "reviewed"\]\.includes\(cell\.status\)/);
  assert.doesNotMatch(query, /getOutletDailyCompletionMatrix[\s\S]*outlet_daily_record_lines/);
});

test("outlet completion matrix provides hover, touch, keyboard and direct-record preview", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(component, /onMouseEnter=\{\(\) => setActiveKey\(key\)\}/);
  assert.match(component, /onFocus=\{\(\) => setActiveKey\(key\)\}/);
  assert.match(component, /onPointerDown=\{\(\) => setActiveKey\(key\)\}/);
  assert.match(component, /data-outlet-completion-preview/);
  assert.match(component, /Open daily record/);
  assert.match(component, /h-9 w-full min-w-0[\s\S]*sm:min-w-9/);
  assert.match(component, /inline-flex min-h-11 items-center[\s\S]*xl:min-h-8/);
  assert.match(component, /not a lateness estimate/);
  assert.match(component, /sm:overflow-x-auto/);
  assert.match(page, /<OutletDailyCompletionMatrix/);
});

test("phone matrix fits all seven days while wider workspaces retain pinned horizontal navigation", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  assert.match(component, /All seven days fit this view\./);
  assert.match(component, /aria-describedby="outlet-completion-scroll-hint"/);
  assert.match(component, /sm:sticky sm:left-0 sm:z-20/);
  assert.match(component, /sm:sticky sm:left-0 sm:z-10/);
  assert.match(component, /overflow-hidden[\s\S]*sm:overflow-x-auto sm:overscroll-x-contain/);
  assert.match(component, /table-fixed[\s\S]*sm:min-w-\[34rem\] sm:table-auto/);
});

test("phone completion insight starts with a compact summary and reveals the dense matrix on demand", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  assert.match(component, /data-outlet-completion-phone-summary/);
  assert.match(component, /data-outlet-completion-toggle/);
  assert.match(component, /aria-expanded=\{matrixOpen\}/);
  assert.match(component, /aria-controls="outlet-completion-detail"/);
  assert.match(component, /matrixOpen \? "block" : "hidden sm:block"/);
  assert.match(component, /Complete[\s\S]*In progress[\s\S]*Missing/);
});

test("outlet daily phone filters keep date, branch, and status inside one drawer", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const filter = read("src/components/common/UnifiedListHeader.tsx");
  assert.match(page, /phonePrimary="drawer"/);
  assert.match(filter, /primaryInDrawer \? primary : null/);
  assert.match(filter, /unified-list-row--filter-only/);
  assert.match(filter, /!primaryInDrawer[\s\S]*\? <SearchControl[\s\S]*: null/);
  assert.doesNotMatch(filter, /: <div className="unified-list-primary-control" \/>/);
});

test("outlet completion states use semantic surfaces instead of a hard-coded theme", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  assert.match(component, /missing:[\s\S]*bg-\[var\(--sb-surface\)\]/);
  assert.doesNotMatch(component, /bg-white|text-white|border-white/);
});
