const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("procurement documents use focused mobile workflow and exact primary actions", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  const mobile = read("src/components/documents/mobile-document-surfaces.tsx");
  const css = read("src/app/globals.css");
  const pr = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const po = read("src/app/(app)/purchase-orders/[id]/page.tsx");

  assert.match(workspace, /hideMobileConsole/);
  assert.match(workspace, /MobileWorkflowStatus/);
  assert.match(workspace, /data-mobile-document-action/);
  assert.doesNotMatch(workspace, /Page actions/);
  assert.match(mobile, /aria-modal="true"/);
  assert.match(mobile, /document\.body\.style\.overflow = "hidden"/);
  assert.match(mobile, /mobileSheetOpen/);
  assert.match(mobile, /sb-dialog-backdrop/);
  assert.match(css, /\.sb-dialog-backdrop[\s\S]*backdrop-filter: blur/);
  assert.match(mobile, /View workflow/);
  assert.match(pr, />Submit PR</);
  for (const label of ["Approve as Manager", "Approve as Purchasing", "Approve as Finance"]) assert.match(pr, new RegExp(label));
  assert.match(pr, /Prepare Purchase Order/);
  assert.match(po, /Send to Supplier/);
  assert.match(po, /Record Receiving &amp; Attach DO/);
});

test("danger, activity, and mobile line information stay separated", () => {
  const pr = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const po = read("src/app/(app)/purchase-orders/[id]/page.tsx");
  const mobile = read("src/components/documents/mobile-document-surfaces.tsx");

  assert.match(pr, /DocumentMoreOptions/);
  assert.match(pr, /canManageDeletion = roleCode === "super_admin"/);
  assert.match(mobile, /label="Activity & files"/);
  assert.match(pr, /role="list" aria-label="Requested items"/);
  assert.match(po, /role="list" aria-label="Ordered items"/);
});

test("Manager notification visibility uses company scope and current-stage recipients", () => {
  const roles = read("src/lib/roles.ts");
  const notifications = read("src/server/queries/notifications.ts");
  const topbar = read("src/server/queries/topbar.ts");
  assert.match(roles, /COMPANY_WIDE_OPERATIONAL_ROLES[^\n]*"manager"/);
  assert.match(notifications, /hasCompanyWideOperationalScope\(roleCode\)/);
  assert.match(notifications, /notification\.branch_id && !scope\.companyWideAccess && !scope\.branchIds\.includes\(notification\.branch_id\)/);
  assert.match(notifications, /manager: \["manager_review"\]/);
  assert.match(notifications, /pendingIds\.has\(row\.entity_id\)/);
  assert.match(topbar, /workflowPrHrefs\.has\(item\.href\)/);
});

test("More filters escapes list clipping on mobile and tablet", () => {
  const filter = read("src/components/ui/filter-bar.tsx");
  const css = read("src/app/globals.css");
  assert.match(filter, /sb-filter-more-backdrop/);
  assert.match(filter, /event\.key === "Escape"/);
  assert.match(css, /@media \(max-width: 1279px\)[\s\S]*\.sb-filter-more\[open\]/);
  assert.match(css, /z-index: var\(--sb-z-dialog\)/);
  assert.match(filter, />Filters</);
  assert.match(filter, /active filters/);
  assert.match(filter, /Changes take effect after you select Apply/);
  assert.match(filter, />Reset</);
  assert.match(filter, />Apply</);
  assert.match(filter, /aria-label="Close filters"/);
});

test("single secondary filters stay inline and empty PR metadata is omitted", () => {
  const prList = read("src/app/(app)/purchase-requests/page.tsx");
  const invoiceList = read("src/app/(app)/supplier-invoices/page.tsx");
  const prDetail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.doesNotMatch(prList, /FilterBarMore/);
  assert.doesNotMatch(prList, /<label[^>]*>Priority/);
  assert.match(prList, /ariaLabel="Priority"/);
  assert.match(invoiceList, /FilterBarMore/);
  assert.match(prDetail, /request\.required_date \? <div>/);
  assert.match(prDetail, /request\.needed_by_date \? <div>/);
  assert.match(prDetail, /<section aria-label="Remarks"/);
  assert.doesNotMatch(prDetail, /request\.required_date \?\? "-"/);
});
