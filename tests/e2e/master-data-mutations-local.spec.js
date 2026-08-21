const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login, requireAccount } = require("./helpers");

let admin = null;
let companyId = null;
const fixture = {
  run: `E2E-${Date.now()}`,
  branchCode: "",
  supplierCode: "",
  itemCode: "",
  branchId: null,
  supplierId: null,
  itemId: null,
};

async function findCompanyId() {
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const credentials = requireAccount("superAdmin");
  const client = createClient(localUrl, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword(credentials);
  if (signIn.error) throw signIn.error;
  const staff = await admin.from("staffs").select("company_id").eq("auth_user_id", signIn.data.user.id).single();
  await client.auth.signOut();
  if (staff.error) throw staff.error;
  return staff.data.company_id;
}

test.describe("local master-data create and maintain workflow", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!localUrl || !serviceRoleKey || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)) {
      throw new Error("Master-data mutation evidence is restricted to an explicitly enabled local Supabase stack.");
    }
    admin = createClient(localUrl, serviceRoleKey, { auth: { persistSession: false } });
    companyId = await findCompanyId();
    fixture.branchCode = `${fixture.run}-BR`;
    fixture.supplierCode = `${fixture.run}-SUP`;
    fixture.itemCode = `${fixture.run}-ITEM`;
  });

  test.afterAll(async () => {
    if (!admin || !companyId) return;
    const deletedAt = new Date().toISOString();
    if (fixture.itemId) await admin.from("items").update({ status: "inactive", deleted_at: deletedAt }).eq("id", fixture.itemId).eq("company_id", companyId);
    if (fixture.supplierId) await admin.from("suppliers").update({ status: "inactive", deleted_at: deletedAt }).eq("id", fixture.supplierId).eq("company_id", companyId);
    if (fixture.branchId) await admin.from("branches").update({ status: "archived", deleted_at: deletedAt }).eq("id", fixture.branchId).eq("company_id", companyId);
  });

  test("Super Admin creates and edits a branch, supplier, and item through the UI", async ({ page }) => {
    test.skip(!admin, "Local Supabase fixture was not enabled.");
    await login(page, "superAdmin");

    await page.goto("/branches/new", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="branch_code"]').fill(fixture.branchCode);
    await page.locator('input[name="branch_name"]').fill(`${fixture.run} Branch`);
    await page.locator('select[name="branch_type"]').selectOption("outlet");
    await Promise.all([
      page.waitForURL(/\/branches(?:\?[^/]*)?$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Create Branch", exact: true }).click(),
    ]);
    const branch = await admin.from("branches").select("id,branch_name").eq("company_id", companyId).eq("branch_code", fixture.branchCode).is("deleted_at", null).single();
    if (branch.error) throw branch.error;
    fixture.branchId = branch.data.id;
    expect(branch.data.branch_name).toBe(`${fixture.run} Branch`);

    await page.goto("/suppliers/new", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="supplier_code"]').fill(fixture.supplierCode);
    await page.locator('input[name="name"]').fill(`${fixture.run} Supplier`);
    await page.locator('input[name="supplier_group"]').fill(`${fixture.run} Short Name`);
    await Promise.all([
      page.waitForURL(/\/suppliers(?:\?[^/]*)?$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Create Supplier", exact: true }).click(),
    ]);
    const supplier = await admin.from("suppliers").select("id,name,supplier_group").eq("company_id", companyId).eq("supplier_code", fixture.supplierCode).is("deleted_at", null).single();
    if (supplier.error) throw supplier.error;
    fixture.supplierId = supplier.data.id;
    expect(supplier.data.name).toBe(`${fixture.run} Supplier`);
    expect(supplier.data.supplier_group).toBe(`${fixture.run} Short Name`);

    await page.goto("/items/new", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="item_code"]').fill(fixture.itemCode);
    await page.locator('input[name="autocount_code"]').fill(`${fixture.run}-AC`);
    await page.locator('input[name="item_name"]').fill(`${fixture.run} Item`);
    await page.locator('input[name="category"]').fill("E2E fixture");
    await page.locator('select[name="base_unit"]').selectOption("KG");
    await page.locator('select[name="purchase_unit"]').selectOption("KG");
    await Promise.all([
      page.waitForURL(/\/items\/(?!new(?:[/?]|$))[^/?]+\?success=/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Create Item", exact: true }).click(),
    ]);
    const item = await admin.from("items").select("id,item_name,base_unit").eq("company_id", companyId).eq("item_code", fixture.itemCode).is("deleted_at", null).single();
    if (item.error) throw item.error;
    fixture.itemId = item.data.id;
    expect(item.data.item_name).toBe(`${fixture.run} Item`);
    expect(item.data.base_unit).toBe("KG");

    await page.goto(`/branches/${fixture.branchId}`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="branch_name"]').fill(`${fixture.run} Branch Edited`);
    await Promise.all([
      page.waitForURL(/\/branches(?:\?[^/]*)?$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Save Branch", exact: true }).click(),
    ]);
    const editedBranch = await admin.from("branches").select("branch_name").eq("id", fixture.branchId).single();
    if (editedBranch.error) throw editedBranch.error;
    expect(editedBranch.data.branch_name).toBe(`${fixture.run} Branch Edited`);

    await page.goto(`/suppliers/${fixture.supplierId}`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="supplier_group"]').fill(`${fixture.run} Short Name Edited`);
    await Promise.all([
      page.waitForURL(/\/suppliers(?:\?[^/]*)?$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Save Supplier", exact: true }).click(),
    ]);
    const editedSupplier = await admin.from("suppliers").select("supplier_group").eq("id", fixture.supplierId).single();
    if (editedSupplier.error) throw editedSupplier.error;
    expect(editedSupplier.data.supplier_group).toBe(`${fixture.run} Short Name Edited`);

    await page.goto(`/items/${fixture.itemId}`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="item_name"]').fill(`${fixture.run} Item Edited`);
    await Promise.all([
      page.waitForURL(/\/items(?:\?[^/]*)?$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Save Item", exact: true }).click(),
    ]);
    const editedItem = await admin.from("items").select("item_name").eq("id", fixture.itemId).single();
    if (editedItem.error) throw editedItem.error;
    expect(editedItem.data.item_name).toBe(`${fixture.run} Item Edited`);
  });
});
