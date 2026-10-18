const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("Outlet Daily uses controlled posting without erasing legacy audit fields", () => {
  const retiredMigration = read("supabase/migrations/255_retire_outlet_daily_review.sql");
  const migration = read("supabase/migrations/260_outlet_daily_controlled_posting.sql");
  const actions = read("src/server/actions/outlet-daily-records.ts");
  const list = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.match(retiredMigration, /prevent_outlet_daily_review_status/);
  assert.match(migration, /outlet_daily_record\.post/);
  assert.match(migration, /drop trigger if exists trg_prevent_outlet_daily_review_status/);
  assert.match(migration, /if target\.status <> 'evening_completed'/);
  assert.match(migration, /set status = 'reviewed'/);
  assert.match(actions, /postOutletDailyRecord/);
  assert.match(actions, /p_action: "post"/);
  assert.match(read("src/lib/outlet-daily-progress.ts"), /row\.status === "evening_completed"[\s\S]*ready_to_post/);
  assert.doesNotMatch(list, /const statuses = \[[^\]]*"reviewed"/);
});
test("loading surfaces are lightweight, route-shaped and never expose placeholder mobile actions", () => {
  const states = read("src/components/ui/system-states.tsx");
  const detail = read("src/app/(app)/purchase-requests/[id]/loading.tsx");
  const css = read("src/app/globals.css");
  const design = read("src/app/design-system-v2.css");
  assert.match(states, /type PageLoadingVariant = "list" \| "detail" \| "form"/);
  assert.match(states, /aria-label="Loading page actions"/);
  assert.match(states, /<WorkspaceGrid[^>]*hideMobileConsole[^>]*rightRail=\{rightRail\}/);
  assert.match(states, /data-loading-query-surface/);
  assert.doesNotMatch(states, /title="Actions"|title="Summary"/);
  assert.doesNotMatch(states, /sb-loading-progress/);
  assert.match(detail, /variant="detail"/);
  assert.doesNotMatch(css, /@keyframes sb-loading-progress/);
  assert.doesNotMatch(states, /setInterval|fetch\(|requestAnimationFrame/);
  assert.match(design, /:has\(\[data-page-loading-state\]\)[\s\S]*\[data-mobile-bottom-nav\][\s\S]*display: block !important/);
  assert.match(design, /:has\(\[data-page-loading-state\]\)[\s\S]*\[data-mobile-action-bar\][\s\S]*display: none !important/);
  const auth = read("src/app/(auth)/loading.tsx");
  assert.match(auth, /Preparing sign in/);
  assert.doesNotMatch(auth, /PageLoadingState|Loading page actions/);
});

test("dashboard and compliance surface actionable exceptions", () => {
  const query = read("src/server/queries/dashboard.ts");
  const complianceQuery = read("src/server/queries/compliance.ts");
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const compliance = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  assert.match(query, /\["missing", "draft", "morning_recorded", "evening_completed"\]\.includes\(todayCell\.status\)/);
  assert.match(query, /getOutletComplianceIssueCount/);
  assert.match(complianceQuery, /state === "missing" \|\| state === "expired"/);
  assert.match(dashboard, /label="Compliance issues"/);
  assert.match(dashboard, /href="\/outlet-compliance"/);
  assert.doesNotMatch(compliance, /backHref="\/outlet-compliance"/);
  assert.match(compliance, /missing: \{ label: "Missing document", variant: "secondary" \}/);
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
    "src/app/(app)/outlet-compliance/page.tsx",
    "src/app/(app)/supplier-invoices/aging/page.tsx",
  ];
  for (const page of pages) {
    const source = read(page);
    assert.ok(source.indexOf('<ConsoleSection title="Actions"') < source.indexOf('<ConsoleSection title="Due soon & expired"') || source.indexOf('<ConsoleSection title="Actions"') < source.indexOf('<ConsoleSection title="Payables Context"'));
  }
});

test("reference-only mobile surfaces retain app navigation instead of inventing More actions", () => {
  const calendar = read("src/app/(app)/outlet-compliance/page.tsx");
  const compliance = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const rightConsole = read("src/components/layout/right-console.tsx");
  const design = read("src/app/design-system-v2.css");
  assert.match(calendar, /<WorkspaceGrid[^>]*hideMobileConsole[^>]*rightRail=\{rightRail\}/);
  assert.match(compliance, /<WorkspaceGrid[^>]*hideMobileConsole[^>]*rightRail=\{rail\}/);
  assert.match(rightConsole, /className="h-11 min-w-0 w-full justify-center gap-2"/);
  assert.doesNotMatch(design, /\[data-mobile-action-bar\][\s\S]{0,300}justify-content: space-evenly/);
});

test("calendar phone navigation uses one stable month axis", () => {
  const calendar = read("src/components/compliance-month-calendar.tsx");
  assert.match(calendar, /grid min-h-14 grid-cols-\[auto_minmax\(0,1fr\)\] sm:grid-cols-\[auto_minmax\(0,1fr\)_auto\] items-center gap-2/);
  assert.match(calendar, /grid min-w-0 grid-cols-\[2\.75rem_minmax\(0,1fr\)_2\.75rem\] items-center/);
  assert.match(calendar, /<span className="hidden w-\[4\.5rem\] sm:block" aria-hidden="true"/);
  assert.doesNotMatch(calendar, /Go to month/);
  assert.doesNotMatch(calendar, /<header[^>]*flex-wrap/);
  assert.match(calendar, /min-h-16[\s\S]*sm:min-h-28/);
});
