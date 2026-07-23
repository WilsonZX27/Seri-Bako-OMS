const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");

const ids = {
  company: "b1000000-0000-0000-0000-000000000001",
  branch: "b2000000-0000-0000-0000-000000000001",
  location: "b3000000-0000-0000-0000-000000000001",
  staff: "b4000000-0000-0000-0000-000000000001",
  item: "b5000000-0000-0000-0000-000000000001",
  role: "b6000000-0000-0000-0000-000000000001",
};
const email = "opening-stock-http@example.test";
const password = "LocalOpening!2358";

function requireLocalRuntime() {
  for (const value of [process.env.TEST_BASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(value ?? "")) {
      throw new Error("Opening-stock HTTP validation is restricted to local application and Supabase URLs.");
    }
  }
  if (process.env.RUN_LOCAL_OPENING_STOCK_HTTP !== "1" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Local opening-stock HTTP validation was not explicitly enabled.");
  }
}

async function must(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

test.beforeAll(async () => {
  requireLocalRuntime();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const listed = await must(admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "list users");
  for (const user of listed.users.filter((candidate) => candidate.email === email)) await must(admin.auth.admin.deleteUser(user.id), "delete stale user");
  const created = await must(admin.auth.admin.createUser({ email, password, email_confirm: true }), "create user");
  await must(admin.from("companies").upsert({ id: ids.company, company_code: "OPEN-HTTP", company_name: "Opening HTTP Validation" }), "company");
  await must(admin.from("branches").upsert({ id: ids.branch, company_id: ids.company, branch_code: "OPEN-HTTP-BR", branch_name: "Opening HTTP Branch", branch_type: "central_kitchen" }), "branch");
  await must(admin.from("locations").upsert({ id: ids.location, company_id: ids.company, branch_id: ids.branch, location_code: "OPEN-HTTP-STORE", location_name: "Opening HTTP Store", location_type: "dry_store" }), "location");
  await must(admin.from("items").upsert({ id: ids.item, company_id: ids.company, item_code: "OPEN-HTTP-ITEM", item_name: "Opening HTTP Item", category: "Validation", purchase_unit: "KG", base_unit: "KG", cost: 5 }), "item");
  await must(admin.from("staffs").upsert({ id: ids.staff, company_id: ids.company, auth_user_id: created.user.id, staff_code: "OPEN-HTTP-OWNER", full_name: "Opening HTTP Owner", email, default_branch_id: ids.branch, invitation_status: "completed", must_change_password: false }), "staff");
  await must(admin.from("roles").upsert({ id: ids.role, company_id: ids.company, role_code: "super_admin", role_name: "Super Admin / Owner", status: "active" }), "super admin role");
  await must(admin.from("staff_roles").upsert({ staff_id: ids.staff, role_id: ids.role, branch_id: ids.branch, is_primary: true }), "staff role");
  await must(admin.from("staff_branches").upsert({ staff_id: ids.staff, branch_id: ids.branch, access_level: "full", is_default: true }), "staff branch");
});

test("authenticated opening-stock HTTP rejects invalid item, invalid UOM, and a mixed batch atomically", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login");

  const callImport = (rows) => page.evaluate(async (payloadRows) => {
    const response = await fetch("/api/imports/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity: "opening-stock", mode: "create", confirmPosting: true, rows: payloadRows }),
    });
    return { status: response.status, body: await response.json() };
  }, rows);
  const valid = { branch_code: "OPEN-HTTP-BR", item_code: "OPEN-HTTP-ITEM", quantity: "2", uom: "KG", unit_cost: "5" };
  const invalidItem = await callImport([{ ...valid, item_code: "FORGED-ITEM" }]);
  expect(invalidItem.status).toBe(200);
  expect(invalidItem.body.ok).toBe(false);
  expect(invalidItem.body.errorRows[0].message).toMatch(/unknown item/i);
  const invalidUom = await callImport([{ ...valid, uom: "FORGED-UOM" }]);
  expect(invalidUom.body.ok).toBe(false);
  expect(invalidUom.body.errorRows[0].message).toMatch(/invalid uom/i);
  const mixed = await callImport([valid, { ...valid, item_code: "FORGED-ITEM" }]);
  expect(mixed.body.ok).toBe(false);
  expect(mixed.body.imported).toBe(0);

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const ledger = await admin.from("stock_transactions").select("id", { count: "exact", head: true }).eq("branch_id", ids.branch).eq("item_id", ids.item).eq("transaction_type", "opening_balance");
  if (ledger.error) throw new Error(`ledger count: ${ledger.error.message}`);
  expect(ledger.count).toBe(0);
});
