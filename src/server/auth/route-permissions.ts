import { informationArchitecture } from "@/lib/information-architecture";

const exactRoutePermissions: Record<string, string[]> = {
  "/people/ro": ["comp_time.read"],
  "/attendance/confirmations": ["dashboard.view"],
  "/attendance/payslips": ["dashboard.view"],
  "/attendance/my-schedule": ["schedule.read"],
  "/compliance": ["outlet_compliance.read"],
  "/attendance/imports": ["attendance.import"],
  "/attendance/settings": ["shift_template.manage"],
  "/attendance/templates": ["shift_template.manage"],
  "/activity": ["dashboard.view"],
  "/administration": ["company.read", "staffs.read", "roles.read", "items.view", "imports.create", "branches.read"],
  "/procurement": ["purchase_request.read", "purchase_order.read", "goods_receiving.read", "purchase_return.view", "supplier_invoice.view", "suppliers.view"],
  "/inventory": ["items.view", "production.view", "recipes.view", "stock_balance.read", "stock_transactions.read", "stock_transfer.read", "stock_count.read", "stock_wastage.read", "low_stock.view"],
  "/reports/costing-readiness": ["recipes.view"],
  "/reports/recipe-costing": ["recipes.view"],
  "/reports/product-margin": ["recipes.view"],
  "/reports/procurement-variance": ["reports.view"],
  "/supplier-invoices/aging": ["supplier_invoice.pay"],
  "/supplier-invoices/cash-flow": ["supplier_invoice.pay"],
  "/administration/master-data-cleanup": ["items.view"],
  "/reports/demand-trends": ["outlet_daily_record.view"],
  "/production/planning": ["production_planning.view"],
  "/production/variance": ["outlet_daily_record.view"],
  "/branches/new": ["branches.create"],
  "/document-sequences/new": ["document_sequences.create"],
  "/goods-receivings/new": ["goods_receiving.create"],
  "/items/new": ["items.create"],
  "/opening-stock/import": ["stock_transactions.create", "company.update"],
  "/outlet-daily-records/new": ["outlet_daily_record.create"],
  "/production/jobs/new": ["production.create"],
  "/products/new": ["production.create"],
  "/purchase-orders/new": ["purchase_order.create"],
  "/purchase-requests/new": ["purchase_request.create"],
  "/purchase-returns/new": ["purchase_return.create"],
  "/recipes/new": ["recipes.create"],
  "/staffs/new": ["staffs.create"],
  "/stock-counts/new": ["stock_count.create"],
  "/stock-transactions/new": ["stock_transactions.create"],
  "/stock-transfers/new": ["stock_transfer.create"],
  "/stock-wastage/new": ["stock_wastage.create"],
  "/supplier-invoices/new": ["supplier_invoice.create"],
  "/supplier-items/new": ["supplier_items.create"],
  "/suppliers/new": ["suppliers.create"],
  "/uom-conversions/new": ["uom_conversions.create"],
};

const exactRouteRoles: Record<string, readonly string[]> = {
  // Self-service entry only; database ACLs still restrict time and payroll data.
  "/attendance/confirmations": ["super_admin", "people_operations", "finance", "manager", "purchasing", "chef", "outlet_supervisor", "outlet_staff"],
  "/attendance/payslips": ["super_admin", "people_operations", "finance", "manager", "purchasing", "chef", "kitchen", "outlet_supervisor", "outlet_staff"],
  "/attendance/my-schedule": ["kitchen"],
  "/asset-management/assets": ["super_admin", "manager", "finance", "purchasing", "chef", "outlet_supervisor", "outlet_staff"],
  "/asset-management/maintenance": ["super_admin", "manager", "finance", "purchasing", "chef", "outlet_supervisor", "outlet_staff"],
  "/asset-management/transfers": ["super_admin", "manager", "finance", "purchasing", "chef", "outlet_supervisor", "outlet_staff"],
  "/documents": ["super_admin", "finance", "manager", "purchasing", "chef"],
  "/procurement": ["super_admin", "finance", "manager", "purchasing", "chef"],
  "/production/planning": ["super_admin", "finance", "manager", "purchasing", "chef"],
  "/production/variance": ["super_admin", "finance", "manager", "purchasing", "chef"],
};

const routePermissions: Array<{ prefixes: string[]; permissions: string[] }> = [
  { prefixes: ["/outlet-daily-records/delivery-orders"], permissions: ["production_planning.view"] },
  ...informationArchitecture.map((item) => ({ prefixes: [item.href], permissions: [item.permission] })),
  { prefixes: ["/outlet-daily-records"], permissions: ["outlet_daily_record.view"] },
  { prefixes: ["/attendance"], permissions: ["attendance.read"] },
  { prefixes: ["/production/delivery-orders", "/production/planning"], permissions: ["production_planning.view"] },
  { prefixes: ["/production/jobs", "/production", "/products"], permissions: ["production.view"] },
  { prefixes: ["/recipes"], permissions: ["recipes.view"] },
  { prefixes: ["/purchase-requests"], permissions: ["purchase_request.read"] },
  { prefixes: ["/purchase-orders"], permissions: ["purchase_order.read"] },
  { prefixes: ["/goods-receivings", "/goods-receiving"], permissions: ["goods_receiving.read"] },
  { prefixes: ["/purchase-returns"], permissions: ["purchase_return.view"] },
  { prefixes: ["/supplier-invoices"], permissions: ["supplier_invoice.view"] },
  { prefixes: ["/suppliers"], permissions: ["suppliers.view"] },
  { prefixes: ["/supplier-items"], permissions: ["supplier_items.read"] },
  { prefixes: ["/uom-conversions"], permissions: ["uom_conversions.read"] },
  { prefixes: ["/items"], permissions: ["items.view"] },
  { prefixes: ["/stock-balance", "/stock-balances"], permissions: ["stock_balance.read"] },
  { prefixes: ["/stock-card"], permissions: ["stock_card.read"] },
  { prefixes: ["/stock-transactions"], permissions: ["stock_transactions.read"] },
  { prefixes: ["/stock-transfers", "/stock-transfer"], permissions: ["stock_transfer.read"] },
  { prefixes: ["/stock-counts", "/stock-count"], permissions: ["stock_count.read"] },
  { prefixes: ["/stock-wastage"], permissions: ["stock_wastage.read"] },
  { prefixes: ["/low-stock"], permissions: ["low_stock.view"] },
  { prefixes: ["/reports", "/activity"], permissions: ["reports.view"] },
  { prefixes: ["/documents"], permissions: ["documents.view"] },
  { prefixes: ["/company"], permissions: ["company.read"] },
  { prefixes: ["/branches"], permissions: ["branches.read"] },
  { prefixes: ["/roles"], permissions: ["roles.read"] },
  { prefixes: ["/staffs"], permissions: ["staffs.read"] },
  { prefixes: ["/document-sequences"], permissions: ["document_sequences.read"] },
  { prefixes: ["/imports"], permissions: ["imports.create", "company.update"] },
];

// These routes render mutation workspaces rather than read-only details. Keep
// their entry guard aligned with the server action so read-level roles do not
// see controls they cannot use or get silently redirected by the page.
const parameterizedMutationRoutes: Array<{ pattern: RegExp; permissions: string[] }> = [
  { pattern: /^\/branches\/[^/]+$/, permissions: ["branches.update"] },
  { pattern: /^\/document-sequences\/[^/]+$/, permissions: ["document_sequences.update"] },
  { pattern: /^\/items\/[^/]+$/, permissions: ["items.update"] },
  { pattern: /^\/products\/[^/]+$/, permissions: ["production.create"] },
  { pattern: /^\/recipes\/[^/]+\/edit$/, permissions: ["recipes.update"] },
  { pattern: /^\/staffs\/[^/]+$/, permissions: ["staffs.update"] },
  { pattern: /^\/supplier-items\/[^/]+$/, permissions: ["supplier_items.update"] },
  { pattern: /^\/suppliers\/[^/]+$/, permissions: ["suppliers.update"] },
  { pattern: /^\/uom-conversions\/[^/]+$/, permissions: ["uom_conversions.update"] },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRoutePermissionCodes(pathname: string) {
  return exactRoutePermissions[pathname]
    ?? parameterizedMutationRoutes.find((entry) => entry.pattern.test(pathname))?.permissions
    ?? routePermissions.find((entry) => entry.prefixes.some((prefix) => matchesPrefix(pathname, prefix)))?.permissions
    ?? null;
}

export function getRouteAllowedRoles(pathname: string) {
  if (pathname === "/administration") return ["super_admin", "finance", "manager", "purchasing"] as const;
  const explicitRoles = Object.entries(exactRouteRoles)
    .sort(([left], [right]) => right.length - left.length)
    .find(([route]) => matchesPrefix(pathname, route))?.[1];
  if (explicitRoles) return explicitRoles;
  const item = informationArchitecture.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return item?.roles ?? null;
}
