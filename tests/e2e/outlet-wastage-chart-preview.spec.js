const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login } = require("./helpers");

const fixtureNote = "Disposable local outlet chart preview fixture.";
let fixtureAdmin = null;

test.describe("outlet wastage chart preview", () => {
  test.beforeAll(async () => {
    if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;
    const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!localUrl || !serviceRoleKey || !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)) {
      throw new Error("The outlet chart fixture is restricted to an explicitly enabled local Supabase stack.");
    }

    fixtureAdmin = createClient(localUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: company, error: companyError } = await fixtureAdmin.from("companies").select("id").limit(1).single();
    if (companyError) throw companyError;
    let { data: branch, error: branchError } = await fixtureAdmin.from("branches").select("id").eq("company_id", company.id).eq("branch_code", "E2E-CHART").maybeSingle();
    if (branchError) throw branchError;
    if (!branch) {
      const createdBranch = await fixtureAdmin.from("branches").insert({ company_id: company.id, branch_code: "E2E-CHART", branch_name: "Local E2E Chart Outlet", branch_type: "outlet", status: "active" }).select("id").single();
      if (createdBranch.error) throw createdBranch.error;
      branch = createdBranch.data;
    }

    let { data: product, error: productError } = await fixtureAdmin.from("products").select("id").eq("company_id", company.id).eq("product_code", "E2E-CHART-001").maybeSingle();
    if (productError) throw productError;
    if (!product) {
      const createdProduct = await fixtureAdmin.from("products").insert({ company_id: company.id, product_code: "E2E-CHART-001", product_name: "Local Chart Preview Product", category: "E2E fixture", selling_unit: "EA", status: "active" }).select("id").single();
      if (createdProduct.error) throw createdProduct.error;
      product = createdProduct.data;
    }

    const cleanup = await fixtureAdmin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (cleanup.error) throw cleanup.error;
    const today = new Date();
    const dates = [3, 2, 1, 0].map((daysAgo) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - daysAgo);
      return date.toISOString().slice(0, 10);
    });
    const insertedRecords = await fixtureAdmin.from("outlet_daily_records").insert(dates.map((record_date) => ({ company_id: company.id, branch_id: branch.id, record_date, status: "evening_completed", notes: fixtureNote }))).select("id");
    if (insertedRecords.error) throw insertedRecords.error;
    const received = [120, 160, 140, 200];
    const wastage = [6, 16, 7, 30];
    const insertedLines = await fixtureAdmin.from("outlet_daily_record_lines").insert(insertedRecords.data.map((record, index) => ({ record_id: record.id, product_id: product.id, morning_received_qty: received[index], evening_leftover_qty: received[index] - wastage[index], wastage_qty: wastage[index], wastage_reason: "unsold" })));
    if (insertedLines.error) throw insertedLines.error;
  });

  test.afterAll(async () => {
    if (!fixtureAdmin) return;
    const cleanup = await fixtureAdmin.from("outlet_daily_records").delete().eq("notes", fixtureNote);
    if (cleanup.error) throw cleanup.error;
  });

  test.beforeEach(async ({ page }) => {
    await login(page, "superAdmin");
    let navigationError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      navigationError = null;
      await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" }).catch((error) => { navigationError = error; });
      if (!navigationError) break;
      await page.waitForTimeout(750);
    }
    if (navigationError) throw navigationError;
  });

  test("hover and keyboard navigation reveal exact point details", async ({ page }) => {
    const chart = page.locator("[data-interactive-line-chart]");
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg")).toHaveAttribute("data-chart-ready", "true", { timeout: 20_000 });
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    const preview = page.locator("[data-chart-preview]");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/wastage rate/i);
    await expect(preview).toContainText(/received/i);

    const interactiveSvg = chart.locator("svg");
    await interactiveSvg.focus();
    await page.keyboard.press("End");
    await expect(preview).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(preview).toBeVisible();
  });

  test("Demand Trend ranking bars reveal complete product values", async ({ page }) => {
    await page.goto("/reports/demand-trends?period=7", { waitUntil: "domcontentloaded" });
    const ranking = page.locator('[data-demand-ranking-chart="wastage"] [data-interactive-ranking-chart]');
    await expect(ranking).toBeVisible();
    const firstBar = ranking.getByRole("listitem").first();
    await firstBar.hover();
    const preview = ranking.locator("[data-ranking-preview]");
    await expect(preview).toContainText(/wastage/i);
    await expect(preview).toContainText(/received/i);
    await firstBar.focus();
    await expect(preview).toContainText(/Local Chart Preview Product/i);
  });

  test("Product Margin keeps the technical table on desktop", async ({ page }) => {
    await page.goto("/reports/product-margin", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-product-margin-workspace]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Product cost and margin estimates" })).toBeVisible();
    await expect(page.locator("[data-product-margin-mobile-list]").getByRole("list")).toBeHidden();
  });

  test("Procurement Variance keeps its technical comparison table on desktop", async ({ page }) => {
    await page.goto("/reports/procurement-variance", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-procurement-variance-workspace]")).toBeVisible();
    await expect(page.getByRole("region", { name: "Procurement cost variance" })).toBeVisible();
    const insights = page.locator("[data-procurement-variance-insights]");
    if (await insights.count()) {
      await expect(insights).toBeVisible();
      const statusRanking = insights.locator("[data-interactive-ranking-chart]").first();
      const firstStatus = statusRanking.getByRole("listitem").first();
      await firstStatus.hover();
      await expect(statusRanking.locator("[data-ranking-preview]")).toContainText(/comparable line/i);
      await firstStatus.focus();
      await expect(statusRanking.locator("[data-ranking-preview]")).toBeVisible();
    }
  });

  test("AP Aging buckets expose hover and keyboard previews and filter links", async ({ page }) => {
    await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
    const chart = page.locator("[data-aging-distribution]");
    await expect(chart).toBeVisible();
    const firstBucket = chart.getByRole("listitem").first();
    await firstBucket.hover();
    await expect(chart.locator("[data-aging-preview]")).toContainText(/invoice/i);
    await firstBucket.focus();
    await expect(firstBucket).toHaveAttribute("href", /bucket=not_due/);
  });

  test("Cash Flow due windows expose direct labels, previews, and AP drill-through", async ({ page }) => {
    await page.goto("/supplier-invoices/cash-flow?period=30", { waitUntil: "domcontentloaded" });
    const chart = page.locator("[data-aging-distribution]");
    await expect(chart).toBeVisible();
    await expect(chart.getByText("Due in 1–7 days")).toBeVisible();
    await expect(chart.getByText("Due in 8–14 days")).toBeVisible();
    const overdue = chart.getByRole("listitem").first();
    await overdue.hover();
    await expect(chart.locator("[data-aging-preview]")).toContainText(/invoice/i);
    await expect(overdue).toHaveAttribute("href", /supplier-invoices\/aging\?overdue=1/);
  });

  test.describe("on a touch viewport", () => {
    test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

    test("tap reveals the same exact point preview", async ({ page }) => {
      const chart = page.locator("[data-interactive-line-chart]");
      await expect(chart).toBeVisible();
      const interactiveSvg = chart.locator("svg");
      await expect(interactiveSvg).toHaveAttribute("data-chart-ready", "true", { timeout: 20_000 });
      const labelsFit = await interactiveSvg.evaluate((svg) => {
        const viewport = svg.getBoundingClientRect();
        return [...svg.querySelectorAll("text")].every((label) => {
          const bounds = label.getBoundingClientRect();
          return bounds.left >= viewport.left - 1
            && bounds.right <= viewport.right + 1
            && bounds.top >= viewport.top - 1
            && bounds.bottom <= viewport.bottom + 1;
        });
      });
      expect(labelsFit).toBe(true);
      const box = await chart.boundingBox();
      expect(box).not.toBeNull();

      await page.touchscreen.tap(box.x + box.width * 0.62, box.y + box.height * 0.52);
      const preview = page.locator("[data-chart-preview]");
      await expect(preview).toBeVisible();
      await expect(preview).toContainText(/wastage rate/i);
      await expect(preview).toContainText(/received/i);
    });

    test("ranking bars fit the phone viewport and respond to touch", async ({ page }) => {
      await page.goto("/reports/demand-trends?period=7", { waitUntil: "domcontentloaded" });
      const ranking = page.locator('[data-demand-ranking-chart="wastage"] [data-interactive-ranking-chart]');
      await expect(ranking).toBeVisible();
      const firstBar = ranking.getByRole("listitem").first();
      await firstBar.tap();
      await expect(ranking.locator("[data-ranking-preview]")).toContainText(/wastage/i);
      const fitsViewport = await ranking.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      });
      expect(fitsViewport).toBe(true);
    });

    test("Product Margin uses a phone decision list without horizontal overflow", async ({ page }) => {
      await page.goto("/reports/product-margin", { waitUntil: "domcontentloaded" });
      const workspace = page.locator("[data-product-margin-workspace]");
      await expect(workspace).toBeVisible();
      await expect(page.getByRole("region", { name: "Product cost and margin estimates" })).toBeHidden();
      await expect(workspace.getByRole("list", { name: "Product cost and margin estimates" })).toBeVisible();
      const fitsViewport = await workspace.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      });
      expect(fitsViewport).toBe(true);
    });

    test("Procurement Variance uses a bounded phone comparison layout", async ({ page }) => {
      await page.goto("/reports/procurement-variance", { waitUntil: "domcontentloaded" });
      const workspace = page.locator("[data-procurement-variance-workspace]");
      await expect(workspace).toBeVisible();
      await expect(page.getByRole("region", { name: "Procurement cost variance" })).toBeHidden();
      const comparison = workspace.locator("[data-procurement-stage-comparison]").first();
      if (await comparison.count()) {
        await expect(comparison).toBeVisible();
        await expect(comparison).toContainText("PO");
        await expect(comparison).toContainText("GRN");
        await expect(comparison).toContainText("Invoice");
        await expect(comparison).toContainText("Qty");
        await expect(comparison).toContainText("Price");
      } else {
        await expect(workspace.getByRole("list", { name: "Procurement cost variance" }).getByText("No comparable procurement lines")).toBeVisible();
      }
      const fitsViewport = await workspace.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      });
      expect(fitsViewport).toBe(true);
      const insights = page.locator("[data-procurement-variance-insights]");
      if (await insights.count()) {
        await expect(insights).toBeVisible();
        const firstRanking = insights.locator("[data-interactive-ranking-chart]").first();
        await firstRanking.getByRole("listitem").first().tap();
        await expect(firstRanking.locator("[data-ranking-preview]")).toContainText(/comparable line/i);
        const insightsFit = await insights.evaluate((node) => {
          const bounds = node.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
        });
        expect(insightsFit).toBe(true);
      }
    });

    test("AP Aging distribution stays directly labeled and bounded on phone", async ({ page }) => {
      await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
      const chart = page.locator("[data-aging-distribution]");
      await expect(chart).toBeVisible();
      await expect(chart.getByRole("listitem")).toHaveCount(7);
      await expect(chart.getByText("90+ Days Overdue")).toBeVisible();
      await expect(chart.getByText("Missing Due Date")).toBeVisible();
      const fitsViewport = await chart.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      });
      expect(fitsViewport).toBe(true);
    });

    test("Cash Flow keeps missing dates separate and due windows bounded on phone", async ({ page }) => {
      await page.goto("/supplier-invoices/cash-flow?period=30", { waitUntil: "domcontentloaded" });
      const chart = page.locator("[data-aging-distribution]");
      await expect(chart).toBeVisible();
      await expect(chart.getByRole("listitem").filter({ hasText: "Missing due date" })).toBeVisible();
      await expect(chart.getByText(/Due in 15\+ days through/)).toBeVisible();
      const missing = chart.getByRole("listitem").filter({ hasText: "Missing due date" });
      await expect(missing).toHaveAttribute("href", /bucket=missing_due_date/);
      const fitsViewport = await chart.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
      });
      expect(fitsViewport).toBe(true);
    });
  });
});
