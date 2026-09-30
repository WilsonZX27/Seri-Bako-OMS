const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const {
  discoverRouteMatrix,
  permittedRolesFor,
  publicRoutes,
  roles,
  sourcePageToRoute,
  viewports,
} = require("./e2e/v9-route-matrix.cjs");

test("v9 UAT classifies every application page", () => {
  const routes = discoverRouteMatrix();
  assert.equal(routes.length, 112, "Route count changed. Classify the new or removed page deliberately.");
  assert.equal(new Set(routes.map((entry) => entry.file)).size, routes.length);
  assert.equal(new Set(routes.map((entry) => entry.route)).size, routes.length);
  for (const entry of routes) {
    assert.ok(entry.public || entry.permittedRoles.length > 0, `${entry.route} has no role authority`);
    assert.ok(entry.permittedRoles.every((role) => roles.includes(role)), `${entry.route} uses an unknown role`);
  }
});

test("v9 UAT locks the approved role and viewport matrix", () => {
  assert.deepEqual(roles, ["superAdmin", "peopleOperations", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"]);
  assert.deepEqual(viewports.map(({ width, height }) => `${width}x${height}`), ["390x844", "820x1180", "1180x820", "1440x900"]);
  assert.equal(publicRoutes.size, 6);
});

test("v9 authenticated fixtures cover every canonical route-matrix role", () => {
  const helpers = fs.readFileSync("tests/e2e/helpers.js", "utf8");
  const setup = fs.readFileSync("scripts/setup-local-dashboard-e2e.mjs", "utf8");
  assert.match(helpers, /outletSupervisor:\s*\["TEST_OUTLET_SUPERVISOR_EMAIL",\s*"TEST_OUTLET_SUPERVISOR_PASSWORD"\]/);
  assert.match(setup, /\["outlet_supervisor",\s*"TEST_OUTLET_SUPERVISOR_EMAIL",\s*"TEST_OUTLET_SUPERVISOR_PASSWORD"\]/);
});

test("Attendance routes follow the eighth-role permission boundary", () => {
  assert.deepEqual(permittedRolesFor("/attendance"), ["superAdmin", "peopleOperations", "manager", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/attendance/schedule"), ["superAdmin", "peopleOperations", "manager", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/attendance/review"), ["superAdmin", "peopleOperations", "manager", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/attendance/imports"), ["superAdmin", "peopleOperations"]);
  assert.deepEqual(permittedRolesFor("/attendance/settings"), ["superAdmin", "peopleOperations"]);
  const permissions = fs.readFileSync("src/server/auth/route-permissions.ts", "utf8");
  assert.match(permissions, /"\/attendance\/settings": \["shift_template\.manage"\]/);
});

test("Outlet Supervisor retains the approved outlet compliance workspace", () => {
  const complianceRoles = ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"];
  assert.deepEqual(permittedRolesFor("/compliance"), complianceRoles);
  assert.deepEqual(permittedRolesFor("/outlet-compliance"), complianceRoles);
  assert.deepEqual(permittedRolesFor("/outlet-calendar"), complianceRoles);
  assert.deepEqual(permittedRolesFor("/outlet-daily-records"), ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/outlet-daily-records/new"), ["superAdmin", "kitchen", "outletSupervisor", "outlet"]);
});

test("dynamic pages receive inert audit identifiers without losing route identity", () => {
  assert.equal(sourcePageToRoute("src/app/(app)/stock-counts/[id]/page.tsx"), "/stock-counts/00000000-0000-4000-8000-000000000000");
  assert.equal(sourcePageToRoute("src/app/(app)/outlet-compliance/[branchId]/page.tsx"), "/outlet-compliance/00000000-0000-4000-8000-000000000000");
  assert.equal(sourcePageToRoute("src/app/(app)/imports/[entity]/page.tsx"), "/imports/items");
  assert.equal(sourcePageToRoute("src/app/(auth)/login/page.tsx"), "/login");
});

test("mutation workspaces use canonical action grants instead of parent read visibility", () => {
  assert.deepEqual(permittedRolesFor("/goods-receivings/new"), ["superAdmin", "purchasing", "kitchen"]);
  assert.deepEqual(permittedRolesFor("/purchase-orders/new"), ["superAdmin", "purchasing"]);
  assert.deepEqual(permittedRolesFor("/supplier-invoices/new"), ["superAdmin", "finance"]);
  assert.deepEqual(permittedRolesFor("/items/00000000-0000-4000-8000-000000000000"), ["superAdmin", "purchasing"]);
  assert.deepEqual(permittedRolesFor("/administration"), ["superAdmin", "finance", "manager", "purchasing"]);

  const permissions = fs.readFileSync("src/server/auth/route-permissions.ts", "utf8");
  for (const code of ["branches.update", "document_sequences.update", "items.update", "production.create", "recipes.update", "staffs.update", "supplier_items.update", "suppliers.update", "uom_conversions.update"]) {
    assert.match(permissions, new RegExp(code.replace(".", "\\.")), `${code} must protect its edit route`);
  }
});

test("Finance master-data visibility is read-only from migration 217 through the route matrix", () => {
  assert.deepEqual(permittedRolesFor("/supplier-items"), ["superAdmin", "finance", "purchasing"]);
  assert.deepEqual(permittedRolesFor("/uom-conversions"), ["superAdmin", "finance", "purchasing"]);
  assert.deepEqual(permittedRolesFor("/supplier-items/new"), ["superAdmin", "purchasing"]);
  assert.deepEqual(permittedRolesFor("/uom-conversions/new"), ["superAdmin", "purchasing"]);

  const migration = fs.readFileSync("supabase/migrations/217_finance_master_data_read_alignment.sql", "utf8");
  assert.match(migration, /r\.role_code = 'finance'/);
  assert.match(migration, /'supplier_items\.read'/);
  assert.match(migration, /'uom_conversions\.read'/);
  assert.doesNotMatch(migration, /supplier_items\.(?:create|update)/);
  assert.doesNotMatch(migration, /uom_conversions\.(?:create|update)/);
});

test("Manager keeps operational reads while PR authoring and Finance costing stay closed", () => {
  assert.deepEqual(permittedRolesFor("/stock-card"), ["superAdmin", "finance", "manager", "purchasing", "kitchen"]);
  assert.deepEqual(permittedRolesFor("/purchase-requests/new"), ["superAdmin", "purchasing", "kitchen"]);
  assert.deepEqual(permittedRolesFor("/reports/costing-readiness"), ["superAdmin", "finance"]);
  assert.deepEqual(permittedRolesFor("/reports/product-margin"), ["superAdmin", "finance"]);
  assert.deepEqual(permittedRolesFor("/reports/recipe-costing"), ["superAdmin", "finance"]);

  const migration = fs.readFileSync("supabase/migrations/218_manager_read_and_pr_authority_alignment.sql", "utf8");
  for (const permission of ["stock_balance.read", "stock_transactions.read", "low_stock.view"]) {
    assert.match(migration, new RegExp(permission.replace(".", "\\.")));
  }
  for (const permission of ["pr.create", "pr.submit", "purchase_request.create", "purchase_request.submit"]) {
    assert.match(migration, new RegExp(permission.replace(".", "\\.")));
  }

  const permissions = fs.readFileSync("src/server/auth/route-permissions.ts", "utf8");
  assert.match(permissions, /"\/administration": \[[^\]]*"branches\.read"/);
});

test("Outlet roles remain on daily operations without generic documents or production analytics", () => {
  assert.deepEqual(permittedRolesFor("/outlet-daily-records"), ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/documents"), ["superAdmin", "finance", "manager", "purchasing", "kitchen"]);
  assert.deepEqual(permittedRolesFor("/production/planning"), ["superAdmin", "finance", "manager", "purchasing", "kitchen"]);
  assert.deepEqual(permittedRolesFor("/production/variance"), ["superAdmin", "finance", "manager", "purchasing", "kitchen"]);

  const permissions = fs.readFileSync("src/server/auth/route-permissions.ts", "utf8");
  assert.match(permissions, /"\/production\/planning": \["super_admin", "finance", "manager", "purchasing", "kitchen"\]/);
  assert.match(permissions, /"\/production\/variance": \["super_admin", "finance", "manager", "purchasing", "kitchen"\]/);
});

test("People Operations is audited only across its approved OMS modules", () => {
  assert.deepEqual(permittedRolesFor("/people"), ["superAdmin", "peopleOperations", "manager"]);
  assert.deepEqual(permittedRolesFor("/staffs"), ["superAdmin", "peopleOperations", "manager"]);
  assert.deepEqual(permittedRolesFor("/staffs/new"), ["superAdmin", "peopleOperations", "manager"]);
  assert.deepEqual(permittedRolesFor("/staffs/00000000-0000-4000-8000-000000000000"), ["superAdmin", "peopleOperations", "manager"]);
  assert.deepEqual(permittedRolesFor("/outlet-compliance"), ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"]);
  assert.deepEqual(permittedRolesFor("/outlet-calendar"), ["superAdmin", "peopleOperations", "manager", "purchasing", "outletSupervisor"]);
  assert.deepEqual(permittedRolesFor("/document-sequences"), ["superAdmin", "finance"]);
  assert.deepEqual(permittedRolesFor("/outlet-daily-records"), ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outletSupervisor", "outlet"]);
  assert.deepEqual(permittedRolesFor("/purchase-requests"), ["superAdmin", "finance", "manager", "purchasing", "kitchen"]);
  const permissions = fs.readFileSync("src/server/auth/route-permissions.ts", "utf8");
  assert.match(permissions, /"\/documents": \["super_admin", "finance", "manager", "purchasing", "kitchen"\]/);
  assert.match(permissions, /"\/procurement": \["super_admin", "finance", "manager", "purchasing", "kitchen"\]/);
  assert.match(permissions, /find\(\(\[route\]\) => matchesPrefix\(pathname, route\)\)/);
});

test("v9 full UAT consumes the clone marker written by the clone lifecycle", () => {
  const matrix = fs.readFileSync("tests/e2e/v9-route-matrix.cjs", "utf8");
  const prepare = fs.readFileSync("scripts/v9/prepare-production-like-clone.mjs", "utf8");
  for (const field of ["clone_id", "expires_at", "local_project", "verification"]) {
    assert.match(matrix, new RegExp(`marker\\.${field}`));
    assert.match(prepare, new RegExp(field === "verification" ? "\\n      verification," : `${field}:`));
  }
  assert.doesNotMatch(matrix, /marker\.(?:cloneId|expiresAt|localSupabaseUrl)/);
});

test("v9 local visual preflight remains loopback-only while full UAT requires the sanitized clone", () => {
  const spec = fs.readFileSync("tests/e2e/v9-full-system-uat.spec.js", "utf8");
  assert.match(spec, /RUN_V9_LOCAL_UAT/);
  assert.match(spec, /RUN_TENANT_BOUNDARY_E2E/);
  assert.match(spec, /127\.0\.0\.1/);
  assert.match(spec, /if \(fullMode\) requireFreshProductionLikeClone\(\)/);
});

test("v9 touch-target checks measure the visible proxy for visually hidden file inputs", () => {
  const spec = fs.readFileSync("tests/e2e/v9-full-system-uat.spec.js", "utf8");
  assert.match(spec, /fileInputProxy/);
  assert.match(spec, /input\[type='file'\]/);
  assert.match(spec, /rect\.width >= 36 && rect\.height >= 36/);
  assert.match(spec, /proxyRect\.width < 36 \|\| proxyRect\.height < 36/);
  assert.match(spec, /getAttribute\("aria-hidden"\) !== "true"/);
  assert.match(spec, /scrollWidth > node\.clientWidth \+ 2/);
  assert.match(spec, /clientWidth: node\.clientWidth/);
  assert.match(spec, /waitForCraftSettle/);
  assert.match(spec, /unreachableHorizontalScroll/);
  assert.match(spec, /node\.tabIndex < 0/);
  assert.match(spec, /getAttribute\("role"\) !== "region"/);
  assert.doesNotMatch(spec, /data-overflow-state/);
});

test("v9 route UAT reports every failure in a role and viewport instead of stopping at the first route", () => {
  const spec = fs.readFileSync("tests/e2e/v9-full-system-uat.spec.js", "utf8");
  assert.doesNotMatch(spec, /describe\.configure\(\{ mode: "serial" \}\)/);
  assert.match(spec, /const matrixFailures = \[\]/);
  assert.match(spec, /matrixFailures\.push/);
  assert.match(spec, /route matrix failures/);
  assert.match(spec, /V9_UAT_SURFACE/);
  assert.match(spec, /includeApp \? auditedRoles : \[\]/);
  assert.match(spec, /includePublic \? auditedViewports : \[\]/);
});

test("opening stock mobile context returns to a real inventory route", () => {
  const header = fs.readFileSync("src/components/layout/mobile-context-header.tsx", "utf8");
  assert.match(header, /"\/opening-stock\/import": \{ title: "Import Opening Stock", backHref: "\/inventory" \}/);
  assert.doesNotMatch(header, /backHref: "\/opening-stock"/);
});
