const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("PO restoration casts validated text back to database enums", () => {
  const migration = read("supabase", "migrations", "205_fix_purchase_order_restore_enum_casts.sql");
  assert.match(migration, /prior_status::public\.purchase_order_status/);
  assert.match(migration, /prior_approval::public\.approval_status/);
  assert.match(migration, /prior_document_status::public\.document_status/);
  assert.match(migration, /has_permission\('purchase_order\.cancel'\)/);
});

test("Outlet Daily supports an afternoon save and later wastage completion", () => {
  const detail = read("src", "app", "(app)", "outlet-daily-records", "[id]", "page.tsx");
  assert.match(detail, />Save progress<\/SubmitButton>/);
  assert.match(detail, /name="target_status" value="draft" variant="outline"/);
  assert.match(detail, /Received can be saved during the day/);
  assert.match(detail, /return later to complete Wastage/);
});

test("unverified receiving explains the exact remaining work", () => {
  const query = read("src", "server", "queries", "outlet-daily-records.ts");
  const list = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const detail = read("src", "app", "(app)", "outlet-daily-records", "[id]", "page.tsx");
  assert.match(query, /received_pending_lines: receivedPendingLines/);
  assert.match(list, /receivedDisplay\(row\)/);
  assert.match(read("src", "lib", "operational-value-display.ts"), /received_pending_lines/);
  assert.doesNotMatch(list, /Receiving data is not verified yet">Unavailable/);
  assert.match(detail, /Received entry still in progress/);
});

test("PO annotation helper copy stays removed", () => {
  const po = read("src", "app", "(app)", "purchase-orders", "[id]", "page.tsx");
  const panels = read("src", "components", "documents", "document-panels.tsx");
  assert.doesNotMatch(po, /Attach the AutoCount or supplier-facing PO during preparation and sending/);
  assert.doesNotMatch(po, /You can view this document, but there is no workflow action available/);
  assert.doesNotMatch(panels, /A new revision is recorded when document details or workflow state change/);
});
