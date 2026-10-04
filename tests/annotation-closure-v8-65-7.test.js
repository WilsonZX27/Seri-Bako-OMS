const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");

test("dashboard annotation closure removes oversized nested metric cards", () => {
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  const design = read("src", "app", "design-system-v2.css");
  assert.match(dashboard, /data-dashboard-command className="sb-work-surface overflow-hidden"/);
  assert.match(dashboard, /grid grid-cols-3 divide-x divide-\[var\(--sb-border-soft\)\]/);
  assert.match(design, /\[data-dashboard-command\] \[data-dashboard-attention-summary\][\s\S]{0,120}background:\s*var\(--sb-green-900\)/);
  assert.doesNotMatch(design, /\[data-dashboard-panel\] > :first-child[\s\S]{0,100}linear-gradient/);
});

test("list and production annotations use the shared responsive authorities", () => {
  const production = read("src", "app", "(app)", "production", "jobs", "page.tsx");
  const requests = read("src", "app", "(app)", "purchase-requests", "page.tsx");
  const design = read("src", "app", "design-system-v2.css");
  const pagination = read("src", "components", "sortable-table.tsx");
  assert.match(production, /tabletCanvas="wide"/);
  assert.match(requests, /size="sm" className="text-sm"/);
  assert.match(design, /form\.unified-list-header \.unified-list-result \{[\s\S]*?display: grid !important;[\s\S]*?justify-items: center;/);
  assert.equal((pagination.match(/\{pageJump\}/g) ?? []).length, 1);
});

test("outlet status and today summary are concise and non-duplicated", () => {
  const outlet = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const badges = read("src", "components", "ui", "status-badge.tsx");
  assert.match(outlet, /<ConsoleSection title=\{`Yesterday ·/);
  assert.doesNotMatch(outlet, /<StatusBadge status=\{progress\.status\} \/><p/);
  assert.match(badges, /in_progress: "border-\[#DDE4E0\] bg-\[#F1F4F2\]/);
  assert.match(badges, /ready_to_post: "border-\[#8FB8DC\] bg-\[#E7F1FA\]/);
  assert.match(badges, /posted: "border-\[#075942\] bg-\[#075942\] text-white"/);
  assert.match(badges, /attention: "border-\[#D88400\] bg-\[#FFF0C2\]/);
});

test("PR review supports immediate supplier-item search and complete line correction", () => {
  const combobox = read("src", "components", "item-combobox.tsx");
  const recovery = read("src", "components", "purchase-request-line-recovery.tsx");
  const addLine = read("src", "components", "add-purchase-request-line-dialog.tsx");
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const migration = read("supabase", "migrations", "219_annotation_review_line_authority.sql");
  assert.match(combobox, /if \(!tokens\.length\) return true/);
  assert.match(recovery, /Field label="Purchase quantity \/ UOM"/);
  assert.match(addLine, /<ItemCombobox/);
  assert.doesNotMatch(addLine, /<label[^>]*>Supplier<select/);
  assert.match(detail, /canRepairReviewLines && canonicalSupplierId/);
  assert.match(migration, /request_row\.status = 'manager_review'/);
  assert.match(migration, /request_row\.status = 'admin_review'/);
});

test("stock count new page owns deferred audited line actions and final add tile", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const page = read("src", "app", "(app)", "stock-counts", "new", "page.tsx");
  const action = read("src", "server", "actions", "stock-counts.ts");
  assert.match(page, /hideMobileHeader/);
  assert.match(page, /allowAddItem/);
  assert.doesNotMatch(page, /mobileStatusOnly/);
  for (const label of ["Replace item", "Remove from this count", "Retire after this count", "Add item"]) assert.match(form, new RegExp(label));
  assert.match(form, /border border-dashed/);
  assert.match(action, /after_create_action/);
  assert.match(action, /\?open=add-item/);
});

test("attachment, account, sourcing and inventory copy stay restrained", () => {
  const upload = read("src", "components", "documents", "attachment-upload-form.tsx");
  const panels = read("src", "components", "documents", "document-panels.tsx");
  const account = read("src", "components", "layout", "account-menu.tsx");
  const procurement = read("src", "components", "procurement-forms.tsx");
  const inventory = read("src", "app", "(app)", "inventory", "page.tsx");
  assert.match(upload, /text-\[10px\] text-\[var\(--sb-text-muted\)\]/);
  assert.match(upload, /Give the file a recognisable name/);
  assert.doesNotMatch(panels, /Attachments are locked after approval or posting/);
  assert.equal((account.match(/text-xs/g) ?? []).length >= 2, true);
  assert.match(procurement, /is not mapped for this branch\. Purchasing will confirm the purchase UOM/);
  assert.match(inventory, /showLowStockPanel = summary\.lowStockRows\.length > 0 \|\| summary\.lowStockUnavailable/);
  assert.match(inventory, /showConsumptionPanel = summary\.topConsumedItems\.length > 0 \|\| summary\.movementUnavailable/);
});
