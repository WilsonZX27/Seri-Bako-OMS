const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("procurement lists expose source and downstream fulfilment", () => {
  const query = read("src/server/queries/procurement.ts");
  const poList = read("src/app/(app)/purchase-orders/page.tsx");
  const prList = read("src/app/(app)/purchase-requests/page.tsx");
  assert.match(query, /purchase_request_id, status/);
  assert.match(query, /furthestPurchaseOrderStatus/);
  assert.match(poList, />\{order\.request_no\}<\/Link>/);
  assert.match(poList, /purchase-requests\/\$\{order\.purchase_request_id\}/);
  assert.match(prList, /request\.procurement_status/);
});

test("PR, PO, and GRN share a provenance-aware procurement chain", () => {
  const query = read("src/server/queries/procurement.ts");
  const chain = read("src/components/procurement/procurement-chain.tsx");
  assert.match(query, /getProcurementChainForRequest/);
  assert.match(query, /source_document_id/);
  assert.match(query, /source_kind/);
  assert.match(query, /source_href/);
  assert.match(chain, /Purchase chain/);
  for (const file of ["purchase-requests/[id]/page.tsx", "purchase-orders/[id]/page.tsx", "goods-receivings/[id]/page.tsx"]) {
    const page = read(`src/app/(app)/${file}`);
    assert.match(page, /getProcurementChainForRequest/);
    assert.match(page, /procurementChain\?\.attachments/);
    assert.match(page, /tabletRailMode="split"/);
  }
});

test("Owner archives attachments and comments through confirmed actions", () => {
  const actions = read("src/server/actions/documents.ts");
  const panels = read("src/components/documents/document-panels.tsx");
  const confirm = read("src/components/documents/attachment-remove-action.tsx");
  assert.match(actions, /archiveDocumentComment/);
  assert.match(actions, /actor\.roleCode !== "super_admin"/);
  assert.doesNotMatch(actions, /storage\.from\("attachments"\)\.remove/);
  assert.match(panels, /itemType="comment"/);
  assert.match(panels, /canRemoveAttachments/);
  assert.match(confirm, /Remove attachment\?/);
  assert.match(confirm, /Remove comment\?/);
  assert.match(confirm, /ModalShell/);
});

test("tablet and mobile history remain available through a scrollable sheet", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  const surfaces = read("src/components/documents/mobile-document-surfaces.tsx");
  assert.match(surfaces, /Files, activity & revisions/);
  assert.match(workspace, /tabletRailMode === "context"/);
  assert.match(surfaces, /max-h-\[88dvh\]/);
  assert.match(surfaces, /overflow-y-auto overscroll-contain/);
});
