const { createClient } = require("@supabase/supabase-js");

const FIXTURE = {
  companyId: "11111111-1111-4111-8111-111111111111",
  branchId: "22222222-2222-4222-8222-222222222222",
  ownerStaffId: "30000000-0000-4000-8000-000000000001",
  managerStaffId: "30000000-0000-4000-8000-000000000002",
  documentId: "40000000-0000-4000-8000-000000000001",
  purchaseRequestId: "50000000-0000-4000-8000-000000000001",
  ownerEmail: "release-owner@example.test",
  ownerPassword: "LocalOwner!2358",
  managerEmail: "release-manager@example.test",
  managerPassword: "LocalManager!2358",
};

const roles = [
  ["60000000-0000-4000-8000-000000000001", "super_admin", "Super Admin / Owner"],
  ["60000000-0000-4000-8000-000000000002", "finance", "Finance"],
  ["60000000-0000-4000-8000-000000000003", "manager", "Manager"],
  ["60000000-0000-4000-8000-000000000004", "purchasing", "Purchasing"],
  ["60000000-0000-4000-8000-000000000005", "kitchen", "Kitchen"],
  ["60000000-0000-4000-8000-000000000006", "outlet_staff", "Outlet Staff"],
];

function assertLocalFixtureEnvironment() {
  const baseUrl = process.env.TEST_BASE_URL ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseUrl)
    || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(supabaseUrl)
    || process.env.RUN_RELEASE_BLOCKER_E2E !== "1"
    || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Release-blocker mutation fixtures are restricted to an explicitly enabled local app and local Supabase stack.");
  }
}

function adminClient() {
  assertLocalFixtureEnvironment();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function must(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function replaceAuthUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`list Auth users: ${error.message}`);
  for (const user of data.users.filter((entry) => entry.email?.trim().toLowerCase() === email)) {
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) throw new Error(`delete stale Auth user: ${deleted.error.message}`);
  }
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`create Auth user: ${created.error?.message ?? "no user returned"}`);
  return created.data.user.id;
}

async function seedLocalReleaseFixture({ managerCanComment = false } = {}) {
  const admin = adminClient();
  await must(admin.from("document_comments").delete().eq("document_id", FIXTURE.documentId), "clear fixture comments");
  await must(admin.from("purchase_requests").delete().eq("id", FIXTURE.purchaseRequestId), "clear fixture PR");
  await must(admin.from("documents").delete().eq("id", FIXTURE.documentId), "clear fixture document");
  await must(admin.from("staff_roles").delete().in("staff_id", [FIXTURE.ownerStaffId, FIXTURE.managerStaffId]), "clear fixture staff roles");
  await must(admin.from("staff_branches").delete().in("staff_id", [FIXTURE.ownerStaffId, FIXTURE.managerStaffId]), "clear fixture staff branches");
  await must(admin.from("staffs").delete().in("id", [FIXTURE.ownerStaffId, FIXTURE.managerStaffId]), "clear fixture staff");

  await must(admin.from("companies").upsert({ id: FIXTURE.companyId, company_code: "LOCAL-RC", company_name: "Local Release Fixture", status: "active" }), "seed company");
  await must(admin.from("branches").upsert({ id: FIXTURE.branchId, company_id: FIXTURE.companyId, branch_code: "CK-LOCAL", branch_name: "Local Central Kitchen", branch_type: "central_kitchen", status: "active" }), "seed branch");
  await must(admin.from("roles").upsert(roles.map(([id, role_code, role_name]) => ({ id, company_id: FIXTURE.companyId, role_code, role_name, status: "active" }))), "seed roles");

  const ownerAuthId = await replaceAuthUser(admin, FIXTURE.ownerEmail, FIXTURE.ownerPassword);
  const managerAuthId = await replaceAuthUser(admin, FIXTURE.managerEmail, FIXTURE.managerPassword);
  await must(admin.from("staffs").insert([
    { id: FIXTURE.ownerStaffId, company_id: FIXTURE.companyId, auth_user_id: ownerAuthId, staff_code: "LOCAL-OWNER", full_name: "Local Release Owner", email: FIXTURE.ownerEmail, default_branch_id: FIXTURE.branchId, status: "active", invitation_status: "completed", must_change_password: false },
    { id: FIXTURE.managerStaffId, company_id: FIXTURE.companyId, auth_user_id: managerAuthId, staff_code: "LOCAL-MANAGER", full_name: "Local Release Manager", email: FIXTURE.managerEmail, default_branch_id: FIXTURE.branchId, status: "active", invitation_status: "completed", must_change_password: false },
  ]), "seed staff");
  await must(admin.from("staff_roles").insert([
    { staff_id: FIXTURE.ownerStaffId, role_id: roles[0][0], branch_id: FIXTURE.branchId, is_primary: true },
    { staff_id: FIXTURE.managerStaffId, role_id: roles[2][0], branch_id: FIXTURE.branchId, is_primary: true },
  ]), "seed staff roles");
  await must(admin.from("staff_branches").insert([
    { staff_id: FIXTURE.ownerStaffId, branch_id: FIXTURE.branchId, access_level: "full", is_default: true },
    { staff_id: FIXTURE.managerStaffId, branch_id: FIXTURE.branchId, access_level: "manage", is_default: true },
  ]), "seed staff branches");

  const managerPermissionCodes = ["dashboard.view", "purchase_request.read", "pr.view_all", "documents.read"];
  if (managerCanComment) managerPermissionCodes.push("documents.comment");
  const permissions = await must(admin.from("permissions").select("id, permission_code").in("permission_code", managerPermissionCodes), "load Manager permissions");
  await must(admin.from("role_permissions").delete().eq("role_id", roles[2][0]), "clear Manager permissions");
  await must(admin.from("role_permissions").insert(permissions.map((permission) => ({ role_id: roles[2][0], permission_id: permission.id }))), "seed Manager permissions");

  const kitchenPermissionCodes = ["dashboard.view", "purchase_request.read", "pr.view_branch", "goods_receiving.read", "inventory.read", "documents.read", "production.view", "stock.view", "stock_transactions.read"];
  const kitchenPermissions = await must(admin.from("permissions").select("id, permission_code").in("permission_code", kitchenPermissionCodes), "load Kitchen permissions");
  await must(admin.from("role_permissions").delete().eq("role_id", roles[4][0]), "clear Kitchen permissions");
  await must(admin.from("role_permissions").insert(kitchenPermissions.map((permission) => ({ role_id: roles[4][0], permission_id: permission.id }))), "seed Kitchen permissions");

  await must(admin.from("documents").insert({ id: FIXTURE.documentId, company_id: FIXTURE.companyId, document_no: "PR-LOCAL-001", document_type: "purchase_request", title: "Manager comment release fixture", status: "submitted", approval_status: "pending", current_step: "manager_review", created_by: FIXTURE.ownerStaffId, updated_by: FIXTURE.ownerStaffId }), "seed fixture document");
  await must(admin.from("purchase_requests").insert({ id: FIXTURE.purchaseRequestId, company_id: FIXTURE.companyId, document_id: FIXTURE.documentId, request_no: "PR-LOCAL-001", requested_by: FIXTURE.ownerStaffId, branch_id: FIXTURE.branchId, status: "manager_review", remarks: "Disposable Manager comment fixture", created_by: FIXTURE.ownerStaffId, updated_by: FIXTURE.ownerStaffId }), "seed fixture PR");

  return { ...FIXTURE, ownerAuthId, managerAuthId };
}

async function cleanupCreatedStaff(staffId) {
  if (!staffId) return;
  const admin = adminClient();
  const staff = await must(admin.from("staffs").select("auth_user_id").eq("id", staffId).maybeSingle(), "load disposable staff");
  await must(admin.from("staffs").delete().eq("id", staffId), "delete disposable staff");
  if (staff?.auth_user_id) {
    const deleted = await admin.auth.admin.deleteUser(staff.auth_user_id);
    if (deleted.error) throw new Error(`delete disposable Auth user: ${deleted.error.message}`);
  }
}

module.exports = { FIXTURE, adminClient, cleanupCreatedStaff, seedLocalReleaseFixture };
