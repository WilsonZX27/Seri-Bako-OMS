const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");

const fixtureRemark = "Disposable local stock count variance insight fixture.";
let admin = null;

test.describe("Stock Count variance insight", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("Variance fixture requires the explicitly enabled local Supabase stack.");
    admin = createClient(url, key, { auth: { persistSession: false } });
    const cleanup = await admin.from("stock_counts").delete().eq("remarks", fixtureRemark);
    if (cleanup.error) throw cleanup.error;
    const { data: company, error: companyError } = await admin.from("companies").select("id").limit(1).single();
    if (companyError) throw companyError;
    const { data: branch, error: branchError } = await admin.from("branches").select("id").eq("company_id", company.id).eq("status", "active").is("deleted_at", null).limit(1).single();
    if (branchError) throw branchError;
    const { data: item, error: itemError } = await admin.from("items").select("id,base_unit").eq("company_id", company.id).eq("status", "active").is("deleted_at", null).limit(1).single();
    if (itemError) throw itemError;
    const today = new Date().toISOString().slice(0, 10);
    const prior = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const counts = await admin.from("stock_counts").insert([
      { company_id: company.id, branch_id: branch.id, count_no: `E2E-VAR-${Date.now()}-A`, count_date: today, status: "posted", tolerance_percent: 5, posted_at: new Date().toISOString(), remarks: fixtureRemark },
      { company_id: company.id, branch_id: branch.id, count_no: `E2E-VAR-${Date.now()}-B`, count_date: prior, status: "posted", tolerance_percent: 5, posted_at: new Date(Date.now() - 86_400_000).toISOString(), remarks: fixtureRemark },
    ]).select("id");
    if (counts.error) throw counts.error;
    const lines = await admin.from("stock_count_lines").insert([
      { stock_count_id: counts.data[0].id, item_id: item.id, theoretical_qty: 100, physical_qty: 112, uom: item.base_unit },
      { stock_count_id: counts.data[1].id, item_id: item.id, theoretical_qty: 100, physical_qty: 88, uom: item.base_unit },
    ]);
    if (lines.error) throw lines.error;
  });

  test.afterAll(async () => {
    if (!admin) return;
    const cleanup = await admin.from("stock_counts").delete().eq("remarks", fixtureRemark);
    if (cleanup.error) throw cleanup.error;
  });

  test("previews trend and ranked recurrence at phone, tablet and desktop widths", async ({ page }) => {
    test.setTimeout(120_000);
    expect(await login(page, "superAdmin")).toBe(true);
    for (const viewport of [{ width: 393, height: 852 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/stock-counts", { waitUntil: "domcontentloaded" });
      const insight = page.locator("[data-stock-count-variance-insights]");
      await expect(insight).toBeVisible();
      await expect(insight).toContainText("2 occurrences");
      const chart = insight.locator("[data-interactive-line-chart]");
      await expect(chart).toBeVisible();
      await chart.locator("svg").focus();
      await page.keyboard.press("End");
      await expect(chart.locator("[data-chart-preview]")).toContainText(/above tolerance/i);

      await insight.getByRole("tab", { name: "Repeat items" }).click();
      const itemRow = insight.locator('[data-interactive-ranking-chart] [role="listitem"]').first();
      await itemRow.hover();
      await expect(insight.locator("[data-ranking-preview]")).toContainText(/Latest \+12%/);
      await expect(itemRow).toHaveAttribute("href", /\/stock-counts\//);

      await insight.getByRole("tab", { name: "Branches" }).click();
      const branchRow = insight.locator('[data-interactive-ranking-chart] [role="listitem"]').first();
      await branchRow.focus();
      await expect(branchRow).toHaveAttribute("href", /branch_id=.*status=posted/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
      await page.screenshot({ path: `test-results/stock-count-variance-${viewport.width}x${viewport.height}.png`, fullPage: false });
    }
  });
});
