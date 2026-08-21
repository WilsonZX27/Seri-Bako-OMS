const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login, requireAccount } = require("./helpers");

let admin = null;
let companyId = null;
const fixture = {
  run: `E2E-RCP-${Date.now()}`,
  productId: null,
  itemId: null,
  recipeId: null,
};

async function findCompanyId() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const credentials = requireAccount("superAdmin");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword(credentials);
  if (signIn.error) throw signIn.error;
  const staff = await admin.from("staffs").select("company_id").eq("auth_user_id", signIn.data.user.id).single();
  await client.auth.signOut();
  if (staff.error) throw staff.error;
  return staff.data.company_id;
}

async function readSingleWithRetry(read, label) {
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await read();
    if (result.error && result.error.code !== "PGRST116") throw new Error(`${label}: ${result.error.message}`);
    if (result.data) return result.data;
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(`${label}: no row returned after retry (${lastError?.message ?? "unknown read error"})`);
}

async function readUntil(read, predicate, label) {
  let latest = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    latest = await readSingleWithRetry(read, label);
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(`${label}: state did not reach the expected transition (${JSON.stringify(latest)})`);
}

test.describe("local recipe create and workflow", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!localUrl || !serviceRoleKey || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)) {
      throw new Error("Recipe mutation evidence is restricted to an explicitly enabled local Supabase stack.");
    }
    admin = createClient(localUrl, serviceRoleKey, { auth: { persistSession: false } });
    companyId = await findCompanyId();
    const item = await admin.from("items").insert({
      company_id: companyId,
      item_code: `${fixture.run}-ITEM`,
      item_name: `${fixture.run} Ingredient`,
      category: "E2E fixture",
      base_unit: "KG",
      purchase_unit: "KG",
      conversion_to_base_unit: 1,
      cost: 4.25,
      status: "active",
    }).select("id").single();
    if (item.error) throw item.error;
    fixture.itemId = item.data.id;
    const product = await admin.from("products").insert({
      company_id: companyId,
      product_code: `${fixture.run}-PRODUCT`,
      product_name: `${fixture.run} Finished Product`,
      category: "E2E fixture",
      selling_unit: "PCS",
      status: "active",
    }).select("id").single();
    if (product.error) throw product.error;
    fixture.productId = product.data.id;
  });

  test.afterAll(async () => {
    if (!admin || !companyId) return;
    const deletedAt = new Date().toISOString();
    if (fixture.recipeId) await admin.from("recipes").update({ status: "archived", archived_at: deletedAt, deleted_at: deletedAt }).eq("id", fixture.recipeId).eq("company_id", companyId);
    if (fixture.productId) await admin.from("products").update({ status: "inactive", deleted_at: deletedAt }).eq("id", fixture.productId).eq("company_id", companyId);
    if (fixture.itemId) await admin.from("items").update({ status: "inactive", deleted_at: deletedAt }).eq("id", fixture.itemId).eq("company_id", companyId);
  });

  test("Super Admin creates, edits, submits, approves, and activates a recipe", async ({ page }) => {
    test.skip(!admin, "Local Supabase fixture was not enabled.");
    await login(page, "superAdmin");
    await page.goto("/recipes/new", { waitUntil: "domcontentloaded" });
    await page.locator('select[name="product_id"]').selectOption(fixture.productId);
    await page.locator('input[name="yield_qty"]').fill("10");
    await page.locator('select[name="yield_unit"]').selectOption("PCS");
    const ingredientInput = page.locator('.sb-table-region input[placeholder="Type item code or name"]').first();
    await ingredientInput.fill(`${fixture.run}-ITEM - ${fixture.run} Ingredient`);
    await page.getByRole("combobox", { name: new RegExp(`Recipe UOM for ${fixture.run} Ingredient`) }).selectOption("KG");
    const lineNumbers = page.locator(".sb-table-region input[type=number]");
    await lineNumbers.nth(0).fill("2");
    await lineNumbers.nth(3).fill("4.25");
    await Promise.all([
      page.waitForURL(/\/recipes\/[^/?]+$/, { timeout: 30_000 }),
      page.getByRole("button", { name: "Create Recipe", exact: true }).click(),
    ]);
    const created = await readSingleWithRetry(
      () => admin.from("recipes").select("id,status,product_id,yield_qty").eq("company_id", companyId).eq("product_id", fixture.productId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      "created recipe",
    );
    fixture.recipeId = created.id;
    expect(created.status).toBe("draft");
    expect(Number(created.yield_qty)).toBe(10);
    const line = await readSingleWithRetry(
      () => admin.from("recipe_lines").select("ingredient_item_id,base_qty_required,cost_per_unit").eq("recipe_id", fixture.recipeId).maybeSingle(),
      "created recipe line",
    );
    expect(line.ingredient_item_id).toBe(fixture.itemId);
    expect(Number(line.base_qty_required)).toBe(2);
    expect(Number(line.cost_per_unit)).toBe(4.25);

    await page.getByRole("link", { name: "Edit Recipe", exact: true }).click();
    await page.waitForURL(new RegExp(`/recipes/${fixture.recipeId}/edit$`));
    await page.locator('textarea[name="remarks"]').fill("Manual cost snapshot closure fixture");
    await Promise.all([
      page.waitForURL(new RegExp(`/recipes/${fixture.recipeId}$`), { timeout: 20_000 }),
      page.getByRole("button", { name: "Save Recipe", exact: true }).last().click(),
    ]);
    const edited = await readSingleWithRetry(() => admin.from("recipes").select("remarks,status").eq("id", fixture.recipeId).maybeSingle(), "edited recipe");
    expect(edited.remarks).toBe("Manual cost snapshot closure fixture");
    expect(edited.status).toBe("draft");

    await page.locator('button[data-mobile-primary-action]:visible').filter({ hasText: "Submit" }).click();
    const submitted = await readUntil(
      () => admin.from("recipes").select("status,approval_status,submitted_at").eq("id", fixture.recipeId).maybeSingle(),
      (row) => row.status === "pending_approval",
      "submitted recipe",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('button[data-mobile-primary-action]:visible').filter({ hasText: "Approve" })).toBeVisible();
    expect(submitted.status).toBe("pending_approval");
    expect(submitted.approval_status).toBe("pending");
    expect(submitted.submitted_at).toBeTruthy();

    await page.locator('button[data-mobile-primary-action]:visible').filter({ hasText: "Approve" }).click();
    const approved = await readUntil(
      () => admin.from("recipes").select("status,approval_status,approved_at").eq("id", fixture.recipeId).maybeSingle(),
      (row) => row.status === "approved",
      "approved recipe",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('button[data-mobile-primary-action]:visible').filter({ hasText: "Activate" })).toBeVisible();
    expect(approved.status).toBe("approved");
    expect(approved.approval_status).toBe("approved");
    expect(approved.approved_at).toBeTruthy();

    await page.locator('button[data-mobile-primary-action]:visible').filter({ hasText: "Activate" }).click();
    const active = await readUntil(
      () => admin.from("recipes").select("status,approval_status,activated_at").eq("id", fixture.recipeId).maybeSingle(),
      (row) => row.status === "active",
      "active recipe",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("active", { exact: true }).first()).toBeVisible();
    expect(active.status).toBe("active");
    expect(active.approval_status).toBe("approved");
    expect(active.activated_at).toBeTruthy();
  });
});
