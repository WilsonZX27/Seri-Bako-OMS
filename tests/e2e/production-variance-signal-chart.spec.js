const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");
const expectedVersion = `v${require("../../package.json").version}`;

const fixtureNote = "Disposable local production variance signal fixture.";
let admin = null;
let fixtureBranchId = null;

test.describe("Production variance signal distribution", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("Production variance fixture requires the explicitly enabled local Supabase stack.");
    admin = createClient(url, key, { auth: { persistSession: false } });
    const priorCleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (priorCleanup.error) throw priorCleanup.error;
    const { data: company, error: companyError } = await admin.from("companies").select("id").limit(1).single();
    if (companyError) throw companyError;
    const { data: branch, error: branchError } = await admin.from("branches").select("id").eq("company_id", company.id).eq("status", "active").eq("branch_type", "outlet").limit(1).single();
    if (branchError) throw branchError;
    fixtureBranchId = branch.id;
    const products = [];
    for (const [code, name] of [["E2E-VAR-OVER", "E2E Over Signal Product"], ["E2E-VAR-UNDER", "E2E Under Signal Product"]]) {
      let { data: product, error } = await admin.from("products").select("id").eq("company_id", company.id).eq("product_code", code).maybeSingle();
      if (error) throw error;
      if (!product) {
        const created = await admin.from("products").insert({ company_id: company.id, product_code: code, product_name: name, category: "E2E fixture", selling_unit: "EA", status: "active" }).select("id").single();
        if (created.error) throw created.error;
        product = created.data;
      }
      products.push(product);
    }
    const dates = [3, 2, 1, 0].map((daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10));
    const records = await admin.from("outlet_daily_records").insert(dates.map((record_date) => ({ company_id: company.id, branch_id: branch.id, record_date, status: "evening_completed", notes: fixtureNote }))).select("id");
    if (records.error) throw records.error;
    const lines = records.data.flatMap((record) => [
      { record_id: record.id, product_id: products[0].id, morning_received_qty: 100, evening_leftover_qty: 30, wastage_qty: 12, wastage_reason: "unsold" },
      { record_id: record.id, product_id: products[1].id, morning_received_qty: 100, evening_leftover_qty: 2, wastage_qty: 1, wastage_reason: "unsold" },
    ]);
    const insertedLines = await admin.from("outlet_daily_record_lines").insert(lines);
    if (insertedLines.error) throw insertedLines.error;
  });

  test.afterAll(async () => {
    if (!admin) return;
    const cleanup = await admin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (cleanup.error) throw cleanup.error;
  });

  test("previews and filters truthful counts at phone, tablet and desktop widths", async ({ page }) => {
    test.setTimeout(120_000);
    expect(await login(page, "superAdmin")).toBe(true);
    for (const viewport of [{ width: 393, height: 852 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/production/variance?period=7&branch=${fixtureBranchId}`, { waitUntil: "domcontentloaded" });
      const chart = page.getByRole("region", { name: "Supply signal distribution" });
      await expect(chart).toBeVisible();
      const under = chart.locator('[data-production-signal-option="under_supplied"]');
      const over = chart.locator('[data-production-signal-option="over_supplied"]');
      await expect(under).not.toHaveAttribute("href", /./);
      await expect(over).not.toHaveAttribute("href", /./);
      await under.focus();
      await expect(chart).toContainText(/Under-supplied · 1 product-outlet row/);
      await expect(chart.locator("[data-production-signal-open]")).toHaveAttribute("href", /signal=under_supplied/);
      await over.hover();
      await expect(chart).toContainText(/Over-supplied · 1 product-outlet row/);
      await expect(chart.locator("[data-production-signal-open]")).toHaveAttribute("href", /signal=over_supplied/);
      if (viewport.width === 393) {
        const reportUrl = page.url();
        await over.click();
        await expect(page).toHaveURL(reportUrl);
      }
      if (viewport.width < 1280) await expect(page.locator("[data-production-variance-list]")).toContainText("E2E Under Signal Product");
      if (viewport.width >= 1280) await expect(page.getByRole("region", { name: "Production versus outlet demand variance" })).toContainText("E2E Under Signal Product");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
      await expect(page.getByText(expectedVersion, { exact: true })).toHaveText(expectedVersion);
      if (viewport.width >= 1280) await expect(page.getByText(expectedVersion, { exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/production-variance-signal-${viewport.width}x${viewport.height}.png`, fullPage: false });
    }
  });
});
