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
  assert.match(component, /h-11 w-full min-w-11[\s\S]*sm:h-9 sm:min-w-9/);
  assert.match(component, /inline-flex min-h-11 items-center[\s\S]*xl:min-h-8/);
  assert.match(component, /not a lateness estimate/);
  assert.match(component, /overflow-x-auto/);
  assert.match(page, /<OutletDailyCompletionMatrix/);
});

test("horizontal matrix scrolling preserves outlet identity on narrow workspaces", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  assert.match(component, /Swipe across dates; outlet names remain pinned\./);
  assert.match(component, /aria-describedby="outlet-completion-scroll-hint"/);
  assert.match(component, /<th scope="col" className="sticky left-0 z-20/);
  assert.match(component, /<th scope="row" className="sticky left-0 z-10/);
  assert.match(component, /overflow-x-auto overscroll-x-contain/);
});

test("outlet completion states use semantic surfaces instead of a hard-coded theme", () => {
  const component = read("src/components/outlet-daily-completion-matrix.tsx");
  assert.match(component, /missing:[\s\S]*bg-\[var\(--sb-surface\)\]/);
  assert.doesNotMatch(component, /bg-white|text-white|border-white/);
});
