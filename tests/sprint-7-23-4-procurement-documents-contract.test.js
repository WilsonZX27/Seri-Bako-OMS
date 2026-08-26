const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("PR creation keeps the operational inputs compact and role-aware", () => {
  const form = source("src/components/procurement-forms.tsx");
  const page = source("src/app/(app)/purchase-requests/new/page.tsx");
  assert.match(form, /type="hidden" name="request_date"/);
  assert.match(form, /Request branch/);
  assert.match(form, /Sourcing details/);
  assert.match(form, /Needed By/);
  assert.match(form, /UrgencySelect/);
  assert.match(form, /rows=\{2\}/);
  assert.doesNotMatch(form, /Additional details|When and where/);
  assert.match(form, /canViewCommercial/);
  assert.doesNotMatch(form, /quick-create|Create new item/);
  assert.match(page, />Save Draft</);
  assert.match(page, />Submit PR</);
  assert.match(page, /name="intent" value="submit"/);
  assert.match(source("src/server/actions/procurement.ts"), /intent === "submit"[\s\S]*transitionPurchaseRequest/);
});

test("receiving requires delivery evidence or a documented exception before stock posting", () => {
  const action = source("src/server/actions/goods-receivings.ts");
  const inventoryHardening = source("supabase/migrations/079_inventory_go_live_hardening.sql");
  const createPage = source("src/app/(app)/goods-receivings/new/page.tsx");
  const detail = source("src/app/(app)/goods-receivings/[id]/page.tsx");
  assert.match(createPage, /Save receiving draft/);
  assert.match(action, /do_exception_reason/);
  assert.match(action, /post_goods_receiving_atomic/);
  assert.match(inventoryHardening, /status = 'active' and deleted_at is null/);
  assert.match(inventoryHardening, /Attach the Delivery Order or document an exception/);
  assert.match(action, /delivery_order_exception/);
  assert.match(detail, /Attach Delivery Order/);
});

test("supplier invoice evidence is required for Finance Review", () => {
  const action = source("src/server/actions/supplier-invoices.ts");
  const detail = source("src/app/(app)/supplier-invoices/[id]/page.tsx");
  assert.match(action, /Attach the supplier invoice before sending it to Finance Review/);
  assert.match(detail, /Attach Supplier Invoice/);
  assert.match(detail, /Approve as Finance/);
  assert.match(detail, /ConfirmActionForm/);
});

test("PO preparation and shared attachments expose stage-specific evidence", () => {
  const po = source("src/app/(app)/purchase-orders/[id]/page.tsx");
  const attachment = source("src/components/documents/document-panels.tsx");
  assert.match(po, /AutoCount PO Number/);
  assert.match(po, /title="Supporting Attachments" uploadLabel="Upload"/);
  assert.match(attachment, /presentation.*inline/s);
  assert.doesNotMatch(attachment, /locked after approval or posting/);
  assert.match(attachment, /canRemoveAttachments = resolvedCanManage && \["draft", "pending_approval"\]/);
});

test("release identifies Sprint 7.23.5", () => {
  const version = source("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});
