const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const listPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "page.tsx"), "utf8");
const newPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "new", "page.tsx"), "utf8");
const form = fs.readFileSync(path.join(root, "src", "components", "procurement-forms.tsx"), "utf8");

test("purchase order mobile pages keep the list quiet and the creation action reachable", () => {
  assert.match(listPage, /hideMobileConsole/);
  assert.ok(listPage.includes('action={permissions["po.create"] ? { href: "/purchase-orders/new", label: "New PO" } : undefined}'));
  assert.match(newPage, /<WorkspaceGrid\s+documentMode\s+tabletRailMode="split"\s+rightRail=/);
  assert.match(newPage, /form="purchase-order-form" className="w-full" data-mobile-primary-action>Create PO/);
});

test("purchase order creation uses dynamic compact lines and hides future workflow values", () => {
  assert.match(form, /data-purchase-order-setup/);
  assert.match(form, /data-purchase-order-lines/);
  assert.match(form, /More order details/);
  assert.match(form, /aria-label="Add order line"/);
  assert.match(form, /aria-label="Remove order line"/);
  assert.match(form, /type="hidden" name="line_qty_received" value="0"/);
  assert.match(form, /type="hidden" name="line_qty_cancelled" value="0"/);
  assert.match(form, /type="hidden" name="line_uom" value=\{lineUom\}/);
  assert.doesNotMatch(form, /placeholder="Received"/);
  assert.doesNotMatch(form, /placeholder="Cancelled"/);
  assert.doesNotMatch(form, /Select UOM/);
});
