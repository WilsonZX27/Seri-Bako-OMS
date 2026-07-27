const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const listPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "page.tsx"), "utf8");
const newPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-orders", "new", "page.tsx"), "utf8");

test("purchase order mobile pages keep the list quiet and the creation action reachable", () => {
  assert.match(listPage, /hideMobileConsole=\{!permissions\["po\.create"\]\}/);
  assert.match(newPage, /<WorkspaceGrid\s+documentMode\s+rightRail=/);
  assert.match(newPage, /form="purchase-order-form" className="w-full" data-mobile-primary-action>Create PO/);
});
