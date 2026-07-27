const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");
const app = (route) => read(`src/app/(app)/${route}/page.tsx`);

const detailRoutes = [
  "purchase-requests/[id]", "purchase-orders/[id]", "goods-receivings/[id]", "supplier-invoices/[id]",
  "purchase-returns/[id]", "stock-transfers/[id]", "stock-counts/[id]", "production/jobs/[id]",
  "outlet-daily-records/[id]",
];

const createRoutes = [
  "purchase-requests/new", "goods-receivings/new", "purchase-returns/new", "stock-transfers/new",
  "stock-counts/new", "production/jobs/new", "outlet-daily-records/new", "supplier-invoices/new",
];

test("document details and creation forms use one responsive operational shell", () => {
  for (const route of [...detailRoutes, ...createRoutes]) {
    const source = app(route);
    assert.match(source, /DocumentWorkspace/, `${route}: document shell`);
    assert.match(source, /workflowSteps=/, `${route}: workflow`);
    assert.match(source, /currentStatus=/, `${route}: current step`);
    assert.doesNotMatch(source, /Page actions|overflow-x-auto/, `${route}: legacy action or scroll wrapper`);
  }
});

test("the shared shell keeps tablet workspaces full-width and owns workflow, sticky action and accessible sheets", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  const sheets = read("src/components/documents/mobile-document-surfaces.tsx");
  const confirm = read("src/components/ui/confirm-action-form.tsx");
  const modal = read("src/components/ui/modal-shell.tsx");
  const styles = read("src/app/globals.css");

  assert.doesNotMatch(workspace, /data-tablet-document-inspector|md:grid-cols-\[minmax\(0,7fr\)_minmax\(14rem,3fr\)\]/);
  assert.match(workspace, /data-mobile-document-action/);
  assert.match(workspace, /mobilePrimaryAction \?/);
  assert.match(workspace, /md:hidden/);
  assert.match(sheets, /label="Workflow"/);
  assert.match(sheets, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sheets, /event\.key === "Escape"/);
  assert.match(sheets, /requestAnimationFrame\(\(\) => trigger\?\.focus\(\)\)/);
  assert.match(confirm, /ModalShell/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /event\.key !== "Tab"/);
  assert.match(styles, /\.sb-mobile-action-bar[\s\S]*border: 1px solid var\(--sb-border\);[\s\S]*background: white;[\s\S]*box-shadow: 0 -2px 6px/);
});

test("the shared top bar is the only tablet and desktop breadcrumb, while new documents keep a compact context header", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  assert.match(workspace, /data-document-breadcrumb/);
  assert.doesNotMatch(workspace, /<nav aria-label="Breadcrumb"/);
  assert.match(workspace, /isNewDocument && "hidden"/);
  assert.match(workspace, /title && !isNewDocument/);
});

test("workflow actions are explicit, confirmed, permission-derived and secondary actions stay with the primary action", () => {
  const pr = app("purchase-requests/[id]");
  const po = app("purchase-orders/[id]");
  const invoice = app("supplier-invoices/[id]");
  const production = app("production/jobs/[id]");
  const daily = app("outlet-daily-records/[id]");

  for (const actor of ["Manager", "Purchasing", "Finance"]) assert.match(pr, new RegExp(`Approve as ${actor}`));
  assert.match(po, /Approve as Manager/);
  assert.match(invoice, /Approve as Finance/);
  assert.match(production, /Approve as Manager/);
  assert.match(daily, /Approve as Manager/);
  for (const source of [pr, po, invoice, production, daily]) assert.match(source, /ConfirmActionForm/);
  for (const route of detailRoutes) {
    const source = app(route);
    const primary = source.indexOf("DocumentActionSection");
    const validation = source.indexOf('title="Validation / Next Step"');
    assert.ok(primary >= 0 && validation > primary, `${route}: primary precedes validation`);
    assert.doesNotMatch(source, /DocumentSideSection title="More Options"/, `${route}: secondary actions are not detached`);
  }
});

test("required files remain visible on mobile and support follows the canonical console order", () => {
  const grn = app("goods-receivings/[id]");
  const invoice = app("supplier-invoices/[id]");
  const count = app("stock-counts/[id]");
  assert.match(grn, /className="md:hidden"><AttachmentPanel[\s\S]*Attach Delivery Order/);
  assert.match(invoice, /className="md:hidden"><AttachmentPanel[\s\S]*Attach Supplier Invoice/);
  assert.match(count, /className="md:hidden"><AttachmentPanel[\s\S]*Count Evidence Required/);
  for (const route of detailRoutes.slice(0, 8)) {
    const source = app(route);
    const attachments = source.indexOf("<AttachmentPanel");
    const comments = source.indexOf("<CommentsPanel");
    const activity = source.indexOf("<DocumentTimeline");
    assert.ok(attachments >= 0 && comments > attachments && activity > comments, `${route}: attachments, comments, activity order`);
  }
});

test("document terminology and release metadata follow the current operational contract", () => {
  const sources = [
    ...detailRoutes.map(app), ...createRoutes.map(app),
    read("src/components/procurement-forms.tsx"), read("src/components/outlet-daily-record-form.tsx"),
  ].join("\n");
  assert.doesNotMatch(sources, /Outlet\s*\/\s*Location|Leftover|satay/i);
  assert.match(sources, /Qty Sent/);
  assert.match(sources, /Wastage Reason/);
  assert.match(sources, /Remarks/);
  assert.match(read("src/lib/app-version.ts"), /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(read("src/lib/app-version.ts"), /APP_VERSION = "7\.24\.11"/);
});
