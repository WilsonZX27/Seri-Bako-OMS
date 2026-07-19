const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");

function loadIa() {
  const code = ts.transpileModule(read("src/lib/information-architecture.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", code)(module.exports, module, require);
  return module.exports;
}

test("six roles have deterministic, permission-aware landing routes", () => {
  const { getDefaultLandingRoute, informationArchitecture } = loadIa();
  const grantAll = Object.fromEntries(informationArchitecture.map((item) => [item.permission, true]));
  assert.equal(getDefaultLandingRoute("super_admin", grantAll), "/dashboard");
  assert.equal(getDefaultLandingRoute("finance", grantAll), "/dashboard");
  assert.equal(getDefaultLandingRoute("manager", grantAll), "/dashboard");
  assert.equal(getDefaultLandingRoute("purchasing", grantAll), "/dashboard");
  assert.equal(getDefaultLandingRoute("kitchen", grantAll), "/dashboard");
  assert.equal(getDefaultLandingRoute("outlet_staff", grantAll), "/dashboard");
  assert.equal(informationArchitecture.find((item) => item.href === "/administration/backups").roles.join(), "super_admin");
});

test("migration 071 is guarded and converges without deleting staff or business data", () => {
  const sql = read("supabase/migrations/071_six_role_information_architecture.sql");
  assert.match(sql, /active Viewer assignments require an explicit Kitchen or Outlet Staff decision/);
  assert.match(sql, /role_code in \('admin', 'operations_admin'\).*then 'purchasing'/s);
  assert.match(sql, /role_code in \('admin', 'operations_admin', 'viewer', 'kitchen_staff'\)/);
  assert.match(sql, /permission_code = 'pr\.admin_review'/);
  assert.doesNotMatch(sql, /delete from public\.staffs|delete from public\.(purchase_requests|purchase_orders|goods_receivings|stock_transactions)/);
});

test("fixed roles stay read-only while permitted users can manage system numbering", () => {
  assert.match(read("src/app/(app)/roles/new/page.tsx"), /redirect\("\/roles"\)/);
  assert.match(read("src/app/(app)/roles/[id]/page.tsx"), /redirect\("\/roles"\)/);
  assert.doesNotMatch(read("src/app/(app)/roles/page.tsx"), /New role|>Edit</);
  assert.match(read("src/app/(app)/document-sequences/new/page.tsx"), /DocumentSequenceForm/);
  assert.match(read("src/app/(app)/document-sequences/page.tsx"), /New sequence|>Edit</);
});

test("legacy hubs and backup aliases converge on canonical destinations", () => {
  assert.match(read("src/app/(app)/data-onboarding/page.tsx"), /redirect\("\/imports"\)/);
  assert.match(read("src/app/(app)/settings/backups/page.tsx"), /redirect\("\/administration\/backups"\)/);
  assert.doesNotMatch(read("src/app/(app)/quick-tools/page.tsx"), /CategoryCardGrid|PageHeader/);
  assert.match(read("src/app/(app)/quick-tools/page.tsx"), /getDefaultLandingRoute/);
});

test("sign-in resolves a terminal route from the canonical IA instead of hardcoding dashboard", () => {
  const auth = read("src/server/actions/auth.ts");
  assert.match(auth, /for \(const item of getLandingIaItems\(roleCode\)\)/);
  assert.doesNotMatch(auth.slice(auth.indexOf("export async function signIn"), auth.indexOf("export async function signOut")), /redirect\("\/dashboard"\)/);
});

test("staff assignment UI exposes role and Branch / Outlet concepts", () => {
  const form = read("src/components/foundation-forms.tsx");
  assert.match(form, /label="Role"/);
  assert.match(form, /label="Default Branch \/ Outlet"/);
  assert.match(form, /label="Accessible Branches \/ Outlets"/);
  assert.doesNotMatch(form, /label="Default Location"|label="Accessible Locations"/);
  assert.doesNotMatch(form, /Role Branch Scope|Default Branch Access|Branch Access Level/);
});
