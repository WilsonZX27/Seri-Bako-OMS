const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login, requireAccount } = require("./helpers");

const fixtureNote = "Disposable Purchasing outlet-daily access fixture.";
let admin = null;
let purchasingDb = null;
let fixture = null;

test.describe("Purchasing company-wide outlet daily access", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!localUrl || !anonKey || !serviceRoleKey || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)) {
      throw new Error("Purchasing access fixture is restricted to an explicitly enabled local Supabase stack.");
    }

    admin = createClient(localUrl, serviceRoleKey, { auth: { persistSession: false } });
    const purchasing = requireAccount("purchasing");
    purchasingDb = createClient(localUrl, anonKey, { auth: { persistSession: false } });
    const signIn = await purchasingDb.auth.signInWithPassword(purchasing);
    if (signIn.error) throw signIn.error;
    const authUserId = signIn.data.user.id;
    const staffResult = await admin.from("staffs").select("company_id,default_branch_id").eq("auth_user_id", authUserId).single();
    if (staffResult.error) throw staffResult.error;

    const companyId = staffResult.data.company_id;
    const cleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (cleanup.error) throw cleanup.error;
    let branchResult = await admin.from("branches").select("id,branch_name").eq("company_id", companyId).eq("branch_code", "E2E-PURCH-ODR").maybeSingle();
    if (branchResult.error) throw branchResult.error;
    if (!branchResult.data) {
      branchResult = await admin.from("branches").insert({ company_id: companyId, branch_code: "E2E-PURCH-ODR", branch_name: "Purchasing Cross Outlet", branch_type: "outlet", status: "active" }).select("id,branch_name").single();
      if (branchResult.error) throw branchResult.error;
    }
    let productResult = await admin.from("products").select("id").eq("company_id", companyId).eq("product_code", "E2E-PURCH-ODR").maybeSingle();
    if (productResult.error) throw productResult.error;
    if (!productResult.data) {
      productResult = await admin.from("products").insert({ company_id: companyId, product_code: "E2E-PURCH-ODR", product_name: "Purchasing Access Product", category: "E2E fixture", selling_unit: "EA", status: "active" }).select("id").single();
      if (productResult.error) throw productResult.error;
    }
    const recordDate = new Date().toISOString().slice(0, 10);
    const recordResult = await admin.from("outlet_daily_records").insert({ company_id: companyId, branch_id: branchResult.data.id, record_date: recordDate, status: "evening_completed", notes: fixtureNote }).select("id").single();
    if (recordResult.error) throw recordResult.error;
    const lineResult = await admin.from("outlet_daily_record_lines").insert({ record_id: recordResult.data.id, product_id: productResult.data.id, qty_sent: 12, morning_received_qty: 10, evening_leftover_qty: 0, wastage_qty: 1, wastage_reason: "unsold", notes: "fixture" });
    if (lineResult.error) throw lineResult.error;
    fixture = { companyId, branch: branchResult.data, productId: productResult.data.id, recordId: recordResult.data.id, recordDate };
  });

  test.afterAll(async () => {
    if (admin) {
      const cleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
      if (cleanup.error) throw cleanup.error;
    }
    if (purchasingDb) await purchasingDb.auth.signOut();
  });

  test("sees another outlet and can correct its unlocked record through the production RPC", async ({ page }) => {
    test.skip(!fixture, "Local Purchasing fixture was not created.");
    await login(page, "purchasing");
    await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(fixture.branch.branch_name, { exact: true }).first()).toBeVisible();

    await page.goto(`/outlet-daily-records/${fixture.recordId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /save changes/i }).first()).toBeVisible();
    const received = page.getByRole("spinbutton", { name: /Purchasing Access Product received/i });
    await expect(received).toBeEnabled();

    const saveResult = await purchasingDb.rpc("save_outlet_daily_record", {
      p_record_id: fixture.recordId,
      p_branch_id: fixture.branch.id,
      p_record_date: fixture.recordDate,
      p_target_status: "evening_completed",
      p_lines: [{ product_id: fixture.productId, qty_sent: 12, morning_received_qty: 11, evening_leftover_qty: 0, wastage_qty: 1, wastage_reason: "unsold", notes: "Purchasing corrected" }],
      p_notes: fixtureNote,
    });
    expect(saveResult.error, saveResult.error?.message).toBeNull();
    const saved = await admin.from("outlet_daily_record_lines").select("morning_received_qty,notes").eq("record_id", fixture.recordId).eq("product_id", fixture.productId).single();
    if (saved.error) throw saved.error;
    expect(Number(saved.data.morning_received_qty)).toBe(11);
    expect(saved.data.notes).toBe("Purchasing corrected");
  });
});
