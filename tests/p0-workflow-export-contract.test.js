const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("purchase request rejection is a reason-first dialog instead of an inline action", () => {
  const dialog = read("src/components/ui/reject-action-form.tsx");
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");

  assert.match(dialog, /ModalShell/);
  assert.match(dialog, /name="remarks"/);
  assert.match(dialog, /required/);
  assert.match(dialog, /Reject purchase request\?/);
  assert.match(detail, /<RejectActionForm action=/);
  assert.doesNotMatch(detail, /Rejection remarks required/);
});

test("document actions separate neutral cancellation from destructive deletion and keep primary workflow actions icon-led", () => {
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const confirm = read("src/components/ui/confirm-action-form.tsx");

  assert.match(confirm, /label: ReactNode/);
  assert.match(detail, /variant="outline"[\s\S]*Trash2/);
  assert.match(detail, /<DangerConfirmForm/);
  for (const icon of ["Send", "BadgeCheck", "ShoppingCart", "FileCheck2"]) assert.match(detail, new RegExp(icon));
});

test("outlet daily export is permission-checked and preserves list filters", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const route = read("src/app/api/export/outlet-daily-records/route.ts");
  const dialog = read("src/components/outlet-daily-export-dialog.tsx");

  assert.match(page, /OutletDailyExportDialog/);
  assert.match(dialog, /date range/);
  assert.match(dialog, /selectedBranches/);
  assert.match(route, /hasPermission\("outlet_daily_record\.view"\)/);
  assert.match(route, /rowsToCsv\(exportRows\)/);
  assert.match(route, /outlet-daily-records_\$\{exportDate\}/);
  assert.match(route, /product_code/);
  assert.match(route, /wastage_amount/);
  assert.match(route, /wastage_cost_status/);
  assert.match(route, /searchParams\.get\("date"\)/);
  assert.match(route, /searchParams\.get\("branch"\)/);
  assert.match(route, /searchParams\.get\("status"\)/);
  assert.match(route, /searchParams\.get\("from"\)/);
  assert.match(route, /searchParams\.get\("to"\)/);
  assert.match(route, /searchParams\.get\("branches"\)/);
});

test("wastage cost summary is privileged and never treats missing recipe cost as zero", () => {
  const page = read("src/app/(app)/outlet-daily-records/insights/page.tsx");
  const query = read("src/server/queries/outlet-daily-records.ts");
  assert.match(page, /Today's wastage value/);
  assert.match(page, /canViewWastageCost/);
  assert.match(query, /getOutletDailyWastageCostSummary/);
  assert.match(query, /outlet_daily_record\.view_all/);
  assert.match(query, /state: unavailableLines === 0 \? "verified"/);
  assert.match(query, /amount: pricedLines \? Number\(amount\.toFixed/);
});
