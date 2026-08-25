const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("posted Stock Counts use a previewed idempotent reversal", () => {
  const state = read("supabase/migrations/209_stock_count_void_state.sql");
  const rpc = read("supabase/migrations/210_stock_count_void_reversal.sql");
  const dialog = read("src/components/stock-count-void-dialog.tsx");
  assert.match(state, /unique\(stock_count_id\)/);
  assert.match(rpc, /VOID_PREVIEW_STALE/);
  assert.match(rpc, /insert_inventory_movement/);
  assert.match(dialog, /Void and reverse this Stock Count\?/);
  assert.match(dialog, /Void &amp; Reverse/);
});

test("Stock Count item actions and Outlet Daily fields stay deliberately compact", () => {
  const count = read("src/components/stock-count-form.tsx");
  const recovery = read("src/components/stock-count-line-recovery.tsx");
  const outlet = read("src/components/outlet-daily-record-form.tsx");
  assert.match(count, /border-dashed/);
  assert.match(recovery, /Replace item/);
  assert.match(recovery, /Remove from this count/);
  assert.doesNotMatch(count, /ItemCorrectionSuggestionDialog|BranchStockCountSettingDialog/);
  assert.match(outlet, /<span className="sr-only">Wastage Reason<\/span>/);
});
