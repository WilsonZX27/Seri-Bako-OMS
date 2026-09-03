const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const listPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "page.tsx"), "utf8");
const newPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "new", "page.tsx"), "utf8");
const form = fs.readFileSync(path.join(root, "src", "components", "procurement-forms.tsx"), "utf8");
const action = fs.readFileSync(path.join(root, "src", "server", "actions", "procurement.ts"), "utf8");
const loading = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "new", "loading.tsx"), "utf8");

test("purchase order mobile pages keep the list quiet and the creation action reachable", () => {
  assert.match(listPage, /hideMobileConsole/);
  assert.match(listPage, /ConsoleSection title="Actions"/);
  assert.match(listPage, /href="\/purchase-orders\/new"/);
  assert.match(newPage, /<DocumentWorkspace[\s\S]*tabletRailMode="split"[\s\S]*sidePanel=/);
  assert.match(newPage, /<SubmitButton[^>]*form="purchase-order-form"[^>]*data-mobile-primary-action><ShoppingCart[^>]*\/>Create Draft PO/);
  assert.match(newPage, /form="purchase-order-form"[^>]*pendingLabel="Creating\.\.\."/);
});

test("new purchase order loading state mirrors the document workspace and right rail", () => {
  assert.match(loading, /<WorkspaceGrid documentMode tabletRailMode="split"/);
  assert.match(loading, /rightRail=\{sidePanel\}/);
  assert.match(loading, /ConsoleSection title="PO Actions"/);
  assert.match(loading, /ConsoleSection title="PO Summary"/);
  assert.match(loading, /data-purchase-order-loading/);
});

test("purchase order creation uses one stable setup surface and dynamic compact lines", () => {
  assert.match(form, /data-purchase-order-setup/);
  assert.match(form, /data-purchase-order-lines/);
  assert.match(form, /<section data-purchase-order-form-surface/);
  assert.doesNotMatch(form, /<details open data-purchase-order-form-surface/);
  assert.doesNotMatch(form, /More order details/);
  assert.match(form, /aria-label="Add order line at end"/);
  assert.match(form, /aria-label="Remove order line"/);
  assert.match(form, /type="hidden" name="line_qty_received" value="0"/);
  assert.match(form, /type="hidden" name="line_qty_cancelled" value="0"/);
  assert.match(form, /<SelectNative name="line_uom"/);
  assert.doesNotMatch(form, /placeholder="Received"/);
  assert.doesNotMatch(form, /placeholder="Cancelled"/);
  assert.doesNotMatch(form, /Select UOM/);
});

test("purchase order records the ordered UOM while GRN owns conversion", () => {
  assert.match(action, /ensureBranchSupplierSelections\(payload\.branch_id[\s\S]*true, false\)/);
  assert.match(form, /items\.find\(\(item\) => item\.id === itemId\)\?\.base_unit/);
  assert.doesNotMatch(form, /No active supplier mapping uses/);
  assert.match(form, /name="line_remarks"/);
  assert.match(loading, /grid-cols-\[36px_minmax\(10rem,1\.25fr\)_92px_84px_100px_minmax\(10rem,1fr\)_40px\]/);
});
