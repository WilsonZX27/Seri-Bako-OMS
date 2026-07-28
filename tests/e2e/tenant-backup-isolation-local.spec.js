const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const ids = {
  companyA: "a8100000-0000-4000-8000-000000000001",
  companyB: "b8100000-0000-4000-8000-000000000001",
  branchA: "a8200000-0000-4000-8000-000000000001",
  branchB: "b8200000-0000-4000-8000-000000000001",
  ownerA: "a8300000-0000-4000-8000-000000000001",
  managerA: "a8300000-0000-4000-8000-000000000002",
  disabledOwnerA: "a8300000-0000-4000-8000-000000000003",
  ownerB: "b8300000-0000-4000-8000-000000000001",
  ownerRoleA: "a8400000-0000-4000-8000-000000000001",
  managerRoleA: "a8400000-0000-4000-8000-000000000002",
  ownerRoleB: "b8400000-0000-4000-8000-000000000001",
  itemA: "a8500000-0000-4000-8000-000000000001",
  itemB: "b8500000-0000-4000-8000-000000000001",
};

const users = {
  ownerA: { email: "tenant-backup-owner-a@example.test", password: "TenantBackupOwnerA!2358" },
  managerA: { email: "tenant-backup-manager-a@example.test", password: "TenantBackupManagerA!2358" },
  disabledOwnerA: { email: "tenant-backup-disabled-a@example.test", password: "TenantBackupDisabledA!2358" },
  ownerB: { email: "tenant-backup-owner-b@example.test", password: "TenantBackupOwnerB!2358" },
};

function requireLocalRuntime() {
  for (const value of [process.env.TEST_BASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(value ?? "")) {
      throw new Error("Tenant-backup validation is restricted to local application and Supabase URLs.");
    }
  }
  if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Local tenant-boundary HTTP validation was not explicitly enabled.");
  }
}

async function must(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function replaceAuthUser(admin, credentials) {
  const listed = await must(admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "list Auth users");
  const existing = listed.users.find((candidate) => candidate.email === credentials.email);
  if (existing) {
    await must(admin.auth.admin.updateUserById(existing.id, { password: credentials.password, email_confirm: true }), `refresh ${credentials.email}`);
    return existing.id;
  }
  const created = await must(admin.auth.admin.createUser({ ...credentials, email_confirm: true }), `create ${credentials.email}`);
  return created.user.id;
}

function readStoredZip(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compression = buffer.readUInt16LE(offset + 8);
    if (compression !== 0) throw new Error(`Unexpected ZIP compression method ${compression}.`);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    files.set(name, buffer.subarray(contentStart, contentStart + size).toString("utf8"));
    offset = contentStart + size;
  }
  return files;
}

async function login(page, credentials) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 });
}

test.beforeAll(async () => {
  requireLocalRuntime();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authIds = {};
  for (const [key, credentials] of Object.entries(users)) authIds[key] = await replaceAuthUser(admin, credentials);

  await must(admin.from("companies").upsert([
    { id: ids.companyA, company_code: "BACKUP-A", company_name: "Tenant Backup Company A", status: "active" },
    { id: ids.companyB, company_code: "BACKUP-B", company_name: "FORBIDDEN Tenant Backup Company B", status: "active" },
  ]), "seed companies");
  await must(admin.from("branches").upsert([
    { id: ids.branchA, company_id: ids.companyA, branch_code: "BACKUP-A-CK", branch_name: "Backup A Kitchen", branch_type: "central_kitchen", status: "active" },
    { id: ids.branchB, company_id: ids.companyB, branch_code: "BACKUP-B-CK", branch_name: "FORBIDDEN Backup B Kitchen", branch_type: "central_kitchen", status: "active" },
  ]), "seed branches");
  await must(admin.from("roles").upsert([
    { id: ids.ownerRoleA, company_id: ids.companyA, role_code: "super_admin", role_name: "Super Admin / Owner", status: "active" },
    { id: ids.managerRoleA, company_id: ids.companyA, role_code: "manager", role_name: "Manager", status: "active" },
    { id: ids.ownerRoleB, company_id: ids.companyB, role_code: "super_admin", role_name: "Super Admin / Owner", status: "active" },
  ]), "seed roles");
  await must(admin.from("staffs").upsert([
    { id: ids.ownerA, company_id: ids.companyA, auth_user_id: authIds.ownerA, staff_code: "BACKUP-OWNER-A", full_name: "Backup Owner A", email: users.ownerA.email, default_branch_id: ids.branchA, status: "active", invitation_status: "completed", must_change_password: false },
    { id: ids.managerA, company_id: ids.companyA, auth_user_id: authIds.managerA, staff_code: "BACKUP-MANAGER-A", full_name: "Backup Manager A", email: users.managerA.email, default_branch_id: ids.branchA, status: "active", invitation_status: "completed", must_change_password: false },
    { id: ids.disabledOwnerA, company_id: ids.companyA, auth_user_id: authIds.disabledOwnerA, staff_code: "BACKUP-DISABLED-A", full_name: "Backup Disabled Owner A", email: users.disabledOwnerA.email, default_branch_id: ids.branchA, status: "disabled", invitation_status: "completed", must_change_password: false },
    { id: ids.ownerB, company_id: ids.companyB, auth_user_id: authIds.ownerB, staff_code: "BACKUP-OWNER-B", full_name: "FORBIDDEN Backup Owner B", email: users.ownerB.email, default_branch_id: ids.branchB, status: "active", invitation_status: "completed", must_change_password: false },
  ]), "seed staff");
  const fixtureStaffIds = [ids.ownerA, ids.managerA, ids.disabledOwnerA, ids.ownerB];
  await must(admin.from("staff_roles").delete().in("staff_id", fixtureStaffIds), "clear staff roles");
  await must(admin.from("staff_branches").delete().in("staff_id", fixtureStaffIds), "clear staff branches");
  await must(admin.from("staff_roles").insert([
    { staff_id: ids.ownerA, role_id: ids.ownerRoleA, branch_id: ids.branchA, is_primary: true },
    { staff_id: ids.managerA, role_id: ids.managerRoleA, branch_id: ids.branchA, is_primary: true },
    { staff_id: ids.disabledOwnerA, role_id: ids.ownerRoleA, branch_id: ids.branchA, is_primary: true },
    { staff_id: ids.ownerB, role_id: ids.ownerRoleB, branch_id: ids.branchB, is_primary: true },
  ]), "seed staff roles");
  await must(admin.from("staff_branches").insert([
    { staff_id: ids.ownerA, branch_id: ids.branchA, access_level: "full", is_default: true },
    { staff_id: ids.managerA, branch_id: ids.branchA, access_level: "manage", is_default: true },
    { staff_id: ids.disabledOwnerA, branch_id: ids.branchA, access_level: "full", is_default: true },
    { staff_id: ids.ownerB, branch_id: ids.branchB, access_level: "full", is_default: true },
  ]), "seed staff branches");
  await must(admin.from("items").upsert([
    { id: ids.itemA, company_id: ids.companyA, item_code: "BACKUP-A-ITEM", item_name: "Tenant A Included Item", category: "Validation", purchase_unit: "EA", base_unit: "EA", cost: 1 },
    { id: ids.itemB, company_id: ids.companyB, item_code: "BACKUP-B-ITEM", item_name: "FORBIDDEN Tenant B Item", category: "Validation", purchase_unit: "EA", base_unit: "EA", cost: 2 },
  ]), "seed items");
});

test("Owner backup ignores a forged company override and contains no Company B content", async ({ page }) => {
  await login(page, users.ownerA);
  const response = await page.request.get(`/api/backups/system?company_id=${ids.companyB}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/zip");

  const files = readStoredZip(await response.body());
  expect(files.size).toBeGreaterThan(1);
  const manifest = JSON.parse(files.get("manifest.json"));
  expect(manifest.company_id).toBe(ids.companyA);
  expect(manifest.sprint).toBe("v7.23.7.2");
  expect(manifest.datasets.some((entry) => entry.classification === "excluded")).toBe(true);
  expect(manifest.datasets.filter((entry) => entry.included).every((entry) => !entry.warning)).toBe(true);
  expect(files.get("csv/companies.csv")).toContain(ids.companyA);
  expect(files.get("csv/items.csv")).toContain(ids.itemA);

  const completeArchiveText = [...files.entries()].map(([name, content]) => `${name}\n${content}`).join("\n");
  for (const forbidden of [ids.companyB, ids.branchB, ids.ownerB, ids.itemB, "FORBIDDEN", "BACKUP-B-ITEM"]) {
    expect(completeArchiveText).not.toContain(forbidden);
  }
});

test("Manager cannot generate a company backup", async ({ page }) => {
  await login(page, users.managerA);
  const response = await page.request.get("/api/backups/system");
  expect(response.status()).toBe(403);
});

test("disabled Owner cannot generate a company backup", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(users.disabledOwnerA.email);
  await page.locator('input[name="password"]').fill(users.disabledOwnerA.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator("body")).toContainText(/disabled|workspace access unavailable|contact.*owner/i);
  const response = await page.request.get("/api/backups/system", { maxRedirects: 0 });
  expect([302, 303, 307, 308, 401, 403]).toContain(response.status());
  expect(response.headers()["content-type"] ?? "").not.toContain("application/zip");
});

