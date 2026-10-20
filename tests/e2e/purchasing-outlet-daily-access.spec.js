const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs/promises");
const { login, requireAccount } = require("./helpers");

const fixtureNote = "Disposable Purchasing outlet-daily access fixture.";
let admin = null;
let purchasingDb = null;
let chefDb = null;
let outletDb = null;
let fixture = null;
let fixtureBranchCreated = false;
let fixtureAssignmentCreated = false;

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

    const outlet = requireAccount("outlet");
    outletDb = createClient(localUrl, anonKey, { auth: { persistSession: false } });
    const outletSignIn = await outletDb.auth.signInWithPassword(outlet);
    if (outletSignIn.error) throw outletSignIn.error;
    const outletStaffResult = await admin.from("staffs").select("id,company_id,default_branch_id").eq("auth_user_id", outletSignIn.data.user.id).single();
    if (outletStaffResult.error) throw outletStaffResult.error;
    if (outletStaffResult.data.company_id !== staffResult.data.company_id || !outletStaffResult.data.default_branch_id) {
      throw new Error("Outlet fixture requires an active default branch in the same company.");
    }

    const companyId = staffResult.data.company_id;
    const cleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (cleanup.error) throw cleanup.error;
    let branchResult = await admin.from("branches").select("id,branch_name,branch_code,branch_type").eq("company_id", companyId).eq("id", outletStaffResult.data.default_branch_id).eq("branch_type", "outlet").eq("status", "active").maybeSingle();
    if (branchResult.error) throw branchResult.error;
    if (!branchResult.data) {
      const assigned = await admin.from("staff_branches").select("branch_id").eq("staff_id", outletStaffResult.data.id).limit(20);
      if (assigned.error) throw assigned.error;
      for (const assignment of assigned.data ?? []) {
        const candidate = await admin.from("branches").select("id,branch_name,branch_code,branch_type").eq("company_id", companyId).eq("id", assignment.branch_id).eq("branch_type", "outlet").eq("status", "active").maybeSingle();
        if (candidate.error) throw candidate.error;
        if (candidate.data) { branchResult = candidate; break; }
      }
    }
    if (!branchResult.data) {
      branchResult = await admin.from("branches").select("id,branch_name,branch_code,branch_type").eq("company_id", companyId).eq("branch_code", "E2E-PURCH-ODR").maybeSingle();
      if (branchResult.error) throw branchResult.error;
      if (!branchResult.data) {
        branchResult = await admin.from("branches").insert({ company_id: companyId, branch_code: "E2E-PURCH-ODR", branch_name: "Purchasing Cross Outlet", branch_type: "outlet", status: "active" }).select("id,branch_name,branch_code,branch_type").single();
        if (branchResult.error) throw branchResult.error;
        fixtureBranchCreated = true;
      }
      const assignment = await admin.from("staff_branches").select("staff_id").eq("staff_id", outletStaffResult.data.id).eq("branch_id", branchResult.data.id).maybeSingle();
      if (assignment.error) throw assignment.error;
      if (!assignment.data) {
        const createdAssignment = await admin.from("staff_branches").insert({ staff_id: outletStaffResult.data.id, branch_id: branchResult.data.id });
        if (createdAssignment.error) throw createdAssignment.error;
        fixtureAssignmentCreated = true;
      }
    }
    if (!branchResult.data) throw new Error("Outlet fixture requires an outlet branch assigned to the Outlet account.");
    let productResult = await admin.from("products").select("id").eq("company_id", companyId).eq("product_code", "E2E-PURCH-ODR").maybeSingle();
    if (productResult.error) throw productResult.error;
    if (!productResult.data) {
      productResult = await admin.from("products").insert({ company_id: companyId, product_code: "E2E-PURCH-ODR", product_name: "Purchasing Access Product", category: "E2E fixture", selling_unit: "EA", status: "active" }).select("id").single();
      if (productResult.error) throw productResult.error;
    }
    const recordDate = new Date().toISOString().slice(0, 10);
    const recordResult = await admin.from("outlet_daily_records").insert({ company_id: companyId, branch_id: branchResult.data.id, record_date: recordDate, status: "evening_completed", notes: fixtureNote }).select("id").single();
    if (recordResult.error) throw recordResult.error;
    const lineResult = await admin.from("outlet_daily_record_lines").insert({ record_id: recordResult.data.id, product_id: productResult.data.id, qty_sent: 12, qty_sent_confirmed: true, qty_sent_source: "authorized_confirmed", morning_received_qty: 10, morning_received_provided: true, evening_leftover_qty: 0, wastage_qty: 1, wastage_reason: "unsold", notes: "fixture" });
    if (lineResult.error) throw lineResult.error;
    fixture = { companyId, branch: branchResult.data, productId: productResult.data.id, recordId: recordResult.data.id, recordDate, outletStaffId: outletStaffResult.data.id };

    const chef = requireAccount("chef");
    chefDb = createClient(localUrl, anonKey, { auth: { persistSession: false } });
    const chefSignIn = await chefDb.auth.signInWithPassword(chef);
    if (chefSignIn.error) throw chefSignIn.error;

  });

  test.afterAll(async () => {
    if (admin) {
      const cleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
      if (cleanup.error) throw cleanup.error;
      if (fixtureAssignmentCreated && fixture?.branch?.id) {
        const assignmentCleanup = await admin.from("staff_branches").delete().eq("staff_id", fixture.outletStaffId).eq("branch_id", fixture.branch.id);
        if (assignmentCleanup.error) throw assignmentCleanup.error;
      }
      if (fixtureBranchCreated && fixture?.branch?.id) {
        const branchCleanup = await admin.from("branches").delete().eq("id", fixture.branch.id);
        if (branchCleanup.error) throw branchCleanup.error;
      }
    }
    if (purchasingDb) await purchasingDb.auth.signOut();
    if (chefDb) await chefDb.auth.signOut();
    if (outletDb) await outletDb.auth.signOut();
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

  test("downloads dated product-line detail instead of a summary-only CSV", async ({ page }) => {
    test.skip(!fixture, "Local Purchasing fixture was not created.");
    await login(page, "purchasing");
    await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-right-console]").getByRole("heading", { name: "Today's wastage value", exact: true })).toBeVisible();
    await expect(page.locator("[data-right-console] [data-outlet-wastage-cost-summary]")).toContainText("Unavailable");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const modal = page.getByRole("dialog", { name: "Export outlet daily records" });
    await expect(modal).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await modal.getByRole("link", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^outlet-daily-records_\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await fs.readFile(await download.path(), "utf8");
    expect(csv).toContain("product_code");
    expect(csv).toContain("qty_sent_source");
    expect(csv).toContain("wastage_amount");
    expect(csv).toContain(fixture.branch.branch_name);
    expect(csv).toContain("Unavailable");
  });

  test("Chef confirms Qty Sent while Outlet-owned values stay read-only", async ({ page }) => {
    test.skip(!fixture || !chefDb, "Local Chef fixture was not created.");
    await login(page, "chef");
    await page.goto(`/outlet-daily-records/${fixture.recordId}`, { waitUntil: "domcontentloaded" });
    const sent = page.getByRole("spinbutton", { name: /Purchasing Access Product qty sent/i });
    const received = page.getByRole("spinbutton", { name: /Purchasing Access Product received/i });
    const wastage = page.getByRole("spinbutton", { name: /Purchasing Access Product wastage/i });
    await expect(sent).toBeEnabled();
    await expect(received).toBeDisabled();
    await expect(wastage).toBeDisabled();
    await expect(page.getByRole("button", { name: /Save Qty Sent/i })).toBeVisible();

    const beforeSave = await admin
      .from("outlet_daily_record_lines")
      .select("morning_received_qty,wastage_qty")
      .eq("record_id", fixture.recordId)
      .eq("product_id", fixture.productId)
      .single();
    if (beforeSave.error) throw beforeSave.error;

    const saveResult = await chefDb.rpc("save_outlet_daily_record", {
      p_record_id: fixture.recordId,
      p_branch_id: fixture.branch.id,
      p_record_date: fixture.recordDate,
      p_target_status: "evening_completed",
      p_lines: [{ product_id: fixture.productId, qty_sent: 14, morning_received_qty: 0, evening_leftover_qty: 0, wastage_qty: 0, wastage_reason: null, notes: null }],
      p_notes: fixtureNote,
    });
    expect(saveResult.error, saveResult.error?.message).toBeNull();
    const saved = await admin.from("outlet_daily_record_lines").select("qty_sent,qty_sent_confirmed,qty_sent_source,morning_received_qty,wastage_qty").eq("record_id", fixture.recordId).eq("product_id", fixture.productId).single();
    if (saved.error) throw saved.error;
    expect(Number(saved.data.qty_sent)).toBe(14);
    expect(saved.data.qty_sent_confirmed).toBe(true);
    expect(saved.data.qty_sent_source).toBe("authorized_confirmed");
    expect(Number(saved.data.morning_received_qty)).toBe(Number(beforeSave.data.morning_received_qty));
    expect(Number(saved.data.wastage_qty)).toBe(Number(beforeSave.data.wastage_qty));
  });

  test("Outlet cannot edit Qty Sent in the UI or through the production RPC", async ({ page }) => {
    test.skip(!fixture || !outletDb, "Local Outlet fixture was not created.");
    await login(page, "outlet");
    await page.goto(`/outlet-daily-records/${fixture.recordId}`, { waitUntil: "domcontentloaded" });
    const sent = page.getByRole("spinbutton", { name: /Purchasing Access Product qty sent/i });
    await expect(sent).toBeDisabled();
    await expect(page.locator("[data-qty-sent-ownership]"))
      .toContainText("Only Chef and authorised company-wide staff can enter it.");
    await expect(page.getByRole("spinbutton", { name: /Purchasing Access Product received/i })).toBeEnabled();
    await expect(page.getByRole("spinbutton", { name: /Purchasing Access Product wastage/i })).toBeEnabled();

    const saveResult = await outletDb.rpc("save_outlet_daily_record", {
      p_record_id: fixture.recordId,
      p_branch_id: fixture.branch.id,
      p_record_date: fixture.recordDate,
      p_target_status: "evening_completed",
      p_lines: [{ product_id: fixture.productId, qty_sent: 999, morning_received_qty: 10, morning_received_provided: true, evening_leftover_qty: 0, wastage_qty: 1, wastage_reason: "unsold", notes: "outlet attempt" }],
      p_notes: fixtureNote,
    });
    expect(saveResult.error, saveResult.error?.message).toBeNull();
    const persisted = await admin.from("outlet_daily_record_lines").select("qty_sent,qty_sent_confirmed,qty_sent_source,notes").eq("record_id", fixture.recordId).eq("product_id", fixture.productId).single();
    if (persisted.error) throw persisted.error;
    expect(Number(persisted.data.qty_sent)).toBe(14);
    expect(persisted.data.qty_sent_confirmed).toBe(true);
    expect(persisted.data.qty_sent_source).toBe("authorized_confirmed");
    expect(persisted.data.notes).toBe("outlet attempt");
  });
});
