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
  assert.match(form, /Request details/);
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
  const createPage = source("src/app/(app)/goods-receivings/new/page.tsx");
  const detail = source("src/app/(app)/goods-receivings/[id]/page.tsx");
  assert.match(createPage, /Record Receiving &amp; Attach DO/);
  assert.match(action, /do_exception_reason/);
  assert.match(action, /Attach the Delivery Order or document an exception/);
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
  assert.match(po, /Attach Purchase Order/);
  assert.match(attachment, /presentation.*inline/s);
  assert.match(attachment, /locked after approval or posting/);
});

test("release identifies Sprint 7.23.5", () => {
  const version = source("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "7\.23\.5\.5"/);
  assert.match(version, /APP_SPRINT = "v7\.23\.5\.5"/);
});
