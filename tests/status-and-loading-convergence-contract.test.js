const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("Outlet Daily retires review approval without erasing legacy audit fields", () => {
  const migration = read("supabase/migrations/255_retire_outlet_daily_review.sql");
  const actions = read("src/server/actions/outlet-daily-records.ts");
  const list = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(migration, /where status = 'reviewed'/);
  assert.match(migration, /status = 'evening_completed'/);
  assert.match(migration, /prevent_outlet_daily_review_status/);
  assert.doesNotMatch(actions, /reviewOutletDailyRecord/);
  assert.doesNotMatch(list, /const statuses = \[[^\]]*"reviewed"/);
});
test("loading surfaces are lightweight, route-shaped and keep the action rail", () => {
  const states = read("src/components/ui/system-states.tsx");
  const detail = read("src/app/(app)/purchase-requests/[id]/loading.tsx");
  const css = read("src/app/globals.css");
  assert.match(states, /type PageLoadingVariant = "list" \| "detail" \| "form"/);
  assert.match(states, /aria-label="Loading page actions"/);
  assert.match(states, /data-loading-query-surface/);
  assert.doesNotMatch(states, /title="Actions"|title="Summary"/);
  assert.doesNotMatch(states, /sb-loading-progress/);
  assert.match(detail, /variant="detail"/);
  assert.doesNotMatch(css, /@keyframes sb-loading-progress/);
  assert.doesNotMatch(states, /setInterval|fetch\(|requestAnimationFrame/);
  const auth = read("src/app/(auth)/loading.tsx");
  assert.match(auth, /Preparing sign in/);
  assert.doesNotMatch(auth, /PageLoadingState|Loading page actions/);
});

test("dashboard and compliance surface actionable exceptions", () => {
  const query = read("src/server/queries/dashboard.ts");
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const compliance = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  assert.match(query, /\["missing", "draft", "morning_recorded"\]\.includes\(todayCell\.status\)/);
  assert.match(query, /\["missing", "expired"\]\.includes\(row\.record\.state\)/);
  assert.match(dashboard, /label="Compliance issues"/);
  assert.match(dashboard, /href="\/outlet-compliance"/);
  assert.doesNotMatch(compliance, /backHref="\/outlet-compliance"/);
  assert.match(compliance, /missing: \{ label: "Missing", variant: "secondary" \}/);
});

test("document numbers retain the exact external format", () => {
  const migration = read("supabase/migrations/256_correct_autocount_po_000207.sql");
  const goods = read("src/app/(app)/goods-receivings/page.tsx");
  assert.match(migration, /'PO-000207'/);
  assert.match(migration, /'PO - 000207'/);
  assert.match(migration, /PO-000207 already exists/);
  assert.doesNotMatch(goods, />PO \{receiving\.po_no/);
});

test("right-rail action sections are ordered first", () => {
  const pages = [
    "src/app/(app)/outlet-calendar/page.tsx",
    "src/app/(app)/supplier-invoices/aging/page.tsx",
  ];
  for (const page of pages) {
    const source = read(page);
    assert.ok(source.indexOf('<ConsoleSection title="Actions"') < source.indexOf('<ConsoleSection title="Calendar"') || source.indexOf('<ConsoleSection title="Actions"') < source.indexOf('<ConsoleSection title="Payables Context"'));
  }
});
