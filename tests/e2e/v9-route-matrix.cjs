const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const roles = ["superAdmin", "peopleOperations", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"];
const roleCodes = {
  superAdmin: "super_admin",
  peopleOperations: "people_operations",
  finance: "finance",
  manager: "manager",
  purchasing: "purchasing",
  kitchen: "kitchen",
  outletSupervisor: "outlet_supervisor",
  outlet: "outlet_staff",
};

const viewports = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-820", width: 820, height: 1180 },
  { label: "landscape-1180", width: 1180, height: 820 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

const ALL = roles;
const OUTLET_DAILY = ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"];
const PROCUREMENT = ["superAdmin", "finance", "manager", "purchasing", "kitchen"];
const INVENTORY = ["superAdmin", "finance", "manager", "purchasing", "kitchen"];
const PRODUCTION = ["superAdmin", "finance", "manager", "purchasing", "kitchen"];
const REPORTS = ["superAdmin", "finance", "manager", "purchasing"];
const MASTER_DATA = ["superAdmin", "finance", "purchasing"];
const OWNER = ["superAdmin"];
const BRANCH_READERS = ["superAdmin", "peopleOperations", "finance", "manager", "purchasing"];
const STAFF_MANAGERS = ["superAdmin", "peopleOperations", "manager"];
const SEQUENCE_MANAGERS = ["superAdmin", "finance"];
const OWNER_FINANCE_MANAGER = ["superAdmin", "finance", "manager"];
const OWNER_PURCHASING = ["superAdmin", "purchasing"];
const OWNER_KITCHEN = ["superAdmin", "kitchen"];
const OWNER_PURCHASING_KITCHEN = ["superAdmin", "purchasing", "kitchen"];
const OWNER_FINANCE_PURCHASING_KITCHEN = ["superAdmin", "finance", "purchasing", "kitchen"];
const OWNER_KITCHEN_OUTLET = ["superAdmin", "kitchen", "outletSupervisor", "outlet"];
const ATTENDANCE = ["superAdmin", "peopleOperations", "manager", "outletSupervisor", "outlet"];
const ATTENDANCE_IMPORT = ["superAdmin", "peopleOperations"];

// Parent navigation describes read visibility. Create and edit workspaces are
// narrower and follow the canonical permission grants through migration 218.
const actionRouteAuthorities = new Map([
  ["/asset-management/assets/new", ["superAdmin", "manager"]],
  ["/asset-management/transfers/new", ["superAdmin", "manager", "kitchen", "outletSupervisor", "outlet"]],
  ["/attendance/settings", ATTENDANCE_IMPORT],
  ["/administration", ["superAdmin", "finance", "manager", "purchasing"]],
  [`/branches/${MISSING_ID}`, OWNER_FINANCE_MANAGER],
  ["/branches/new", OWNER_FINANCE_MANAGER],
  [`/document-sequences/${MISSING_ID}`, SEQUENCE_MANAGERS],
  ["/document-sequences/new", SEQUENCE_MANAGERS],
  ["/goods-receivings/new", OWNER_PURCHASING_KITCHEN],
  [`/items/${MISSING_ID}`, OWNER_PURCHASING],
  ["/items/new", OWNER_PURCHASING],
  ["/opening-stock/import", OWNER_FINANCE_PURCHASING_KITCHEN],
  ["/outlet-daily-records/new", OWNER_KITCHEN_OUTLET],
  ["/production/jobs/new", OWNER_KITCHEN],
  [`/products/${MISSING_ID}`, OWNER_KITCHEN],
  ["/products/new", OWNER_KITCHEN],
  ["/purchase-orders/new", OWNER_PURCHASING],
  ["/purchase-requests/new", OWNER_PURCHASING_KITCHEN],
  ["/purchase-returns/new", OWNER_PURCHASING],
  [`/recipes/${MISSING_ID}/edit`, OWNER],
  ["/recipes/new", OWNER],
  [`/staffs/${MISSING_ID}`, STAFF_MANAGERS],
  ["/staffs/new", STAFF_MANAGERS],
  ["/stock-counts/new", OWNER_KITCHEN],
  ["/stock-transactions/new", OWNER_FINANCE_PURCHASING_KITCHEN],
  ["/stock-transfers/new", OWNER_KITCHEN],
  ["/stock-wastage/new", OWNER_KITCHEN],
  ["/supplier-invoices/new", ["superAdmin", "finance"]],
  [`/supplier-items/${MISSING_ID}`, OWNER_PURCHASING],
  ["/supplier-items/new", OWNER_PURCHASING],
  [`/suppliers/${MISSING_ID}`, OWNER_PURCHASING],
  ["/suppliers/new", OWNER_PURCHASING],
  [`/uom-conversions/${MISSING_ID}`, OWNER_PURCHASING],
  ["/uom-conversions/new", OWNER_PURCHASING],
]);

// Longest prefix wins. This is a product-access contract, not a reflection of
// whichever RLS policy happens to answer today. A new route must deliberately
// join one of these authorities before the v9 matrix will accept it.
const accessAuthorities = [
  ["/asset-management/maintenance", ["superAdmin", "manager", "outletSupervisor"]],
  ["/asset-management", ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"]],
  ["/attendance/imports", ATTENDANCE_IMPORT],
  ["/attendance", ATTENDANCE],
  ["/outlet-compliance", ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"]],
  ["/outlet-calendar", ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"]],
  ["/people", ["superAdmin", "peopleOperations", "manager"]],
  ["/compliance", ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"]],
  ["/reports/costing-readiness", ["superAdmin", "finance"]],
  ["/reports/product-margin", ["superAdmin", "finance"]],
  ["/reports/recipe-costing", ["superAdmin", "finance"]],
  ["/administration/master-data-cleanup", MASTER_DATA],
  ["/administration/system-health", OWNER],
  ["/administration/backups", OWNER],
  ["/opening-stock/import", MASTER_DATA],
  ["/supplier-invoices", ["superAdmin", "finance"]],
  ["/document-sequences", SEQUENCE_MANAGERS],
  ["/outlet-daily-records/delivery-orders", ["superAdmin", "manager", "kitchen", "outletSupervisor", "outlet"]],
  ["/outlet-daily-records/insights", OUTLET_DAILY],
  ["/outlet-daily-records", OUTLET_DAILY],
  ["/outlet-packaging", ["superAdmin", "manager", "purchasing"]],
  ["/purchase-requests", PROCUREMENT],
  ["/purchase-orders", PROCUREMENT],
  ["/purchase-returns", PROCUREMENT],
  ["/goods-receivings", PROCUREMENT],
  ["/stock-transactions", INVENTORY],
  ["/stock-transfers", INVENTORY],
  ["/stock-counts", INVENTORY],
  ["/stock-wastage", INVENTORY],
  ["/stock-balance", INVENTORY],
  ["/stock-balances", INVENTORY],
  ["/stock-card", INVENTORY],
  ["/low-stock", INVENTORY],
  ["/production", PRODUCTION],
  ["/products", PRODUCTION],
  ["/supplier-items", MASTER_DATA],
  ["/suppliers", MASTER_DATA],
  ["/uom-conversions", MASTER_DATA],
  ["/items", MASTER_DATA],
  ["/imports", MASTER_DATA],
  ["/recipes", ["superAdmin", "finance"]],
  ["/reports", REPORTS],
  ["/branches", BRANCH_READERS],
  ["/staffs", STAFF_MANAGERS],
  ["/company", OWNER],
  ["/roles", OWNER],
  ["/administration", OWNER],
  ["/procurement", PROCUREMENT],
  ["/inventory", INVENTORY],
  ["/documents", PROCUREMENT],
  ["/activity", ALL],
  ["/account", ALL],
  ["/dashboard", ALL],
].sort((a, b) => b[0].length - a[0].length);

const publicRoutes = new Set(["/access-status", "/change-password", "/forgot-password", "/login", "/set-password", "/setup"]);

function sourcePageToRoute(file) {
  const relative = file.replaceAll("\\", "/")
    .replace(/^src\/app\//, "")
    .replace(/\/page\.(?:ts|tsx)$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => segment === "[entity]" ? "items" : /^\[[^\]]+\]$/.test(segment) ? MISSING_ID : segment);
  return `/${relative.join("/")}`.replace(/\/$/, "") || "/";
}

function permittedRolesFor(route) {
  if (publicRoutes.has(route)) return [];
  const actionAuthority = actionRouteAuthorities.get(route);
  if (actionAuthority) return actionAuthority;
  const authority = accessAuthorities.find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`));
  if (!authority) throw new Error(`No v9 access authority classifies ${route}.`);
  return authority[1];
}

function discoverRouteMatrix(cwd = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "src/app/**/page.tsx", "src/app/**/page.ts"], { cwd, encoding: "utf8" })
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return files.map((file) => {
    const route = sourcePageToRoute(file);
    return { file, route, public: publicRoutes.has(route), permittedRoles: permittedRolesFor(route) };
  });
}

function requireFreshProductionLikeClone(cwd = process.cwd()) {
  const markerPath = path.join(cwd, "test-results", "production-like-clone.json");
  if (!fs.existsSync(markerPath)) throw new Error("v9 authenticated UAT requires a fresh sanitized Production-like clone. Run npm run uat:clone:prepare first.");
  const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  const now = Date.now();
  if (!marker.clone_id || !marker.verification || Date.parse(marker.expires_at) <= now) {
    throw new Error("The sanitized Production-like clone marker is missing, invalid, or expired. Rebuild it before v9 UAT.");
  }
  const config = fs.readFileSync(path.join(cwd, "supabase", "config.toml"), "utf8");
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId || marker.local_project !== projectId) throw new Error("v9 UAT clone marker does not match this local Supabase project.");
  return marker;
}

module.exports = {
  actionRouteAuthorities,
  accessAuthorities,
  discoverRouteMatrix,
  MISSING_ID,
  permittedRolesFor,
  publicRoutes,
  requireFreshProductionLikeClone,
  roleCodes,
  roles,
  sourcePageToRoute,
  viewports,
};
