const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const artifactDir = process.env.MOBILE_AUDIT_DIR;
const routes = [
  ["uom-conversions", "/uom-conversions"],
  ["products-new", "/products/new"],
  ["recipes-new", "/recipes/new"],
  ["stock-balance", "/stock-balance"],
  ["stock-transactions", "/stock-transactions"],
  ["stock-card", "/stock-card"],
  ["stock-transfers-new", "/stock-transfers/new"],
  ["stock-wastage-new", "/stock-wastage/new"],
  ["low-stock", "/low-stock"],
  ["purchase-requests-new", "/purchase-requests/new"],
  ["goods-receivings-new", "/goods-receivings/new"],
  ["stock-counts-new", "/stock-counts/new"],
  ["production-jobs-new", "/production/jobs/new"],
  ["outlet-daily-records-new", "/outlet-daily-records/new"],
  ["purchase-orders-new", "/purchase-orders/new"],
  ["purchase-returns-new", "/purchase-returns/new"],
  ["supplier-invoices-new", "/supplier-invoices/new"],
  ["items-new", "/items/new"],
];

test("mobile release audit", async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!artifactDir, "MOBILE_AUDIT_DIR is required");
  fs.mkdirSync(artifactDir, { recursive: true });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });

  await page.setViewportSize({ width: 430, height: 932 });
  await login(page, "superAdmin");
  const report = [];

  for (const [name, route] of routes) {
    const startErrorCount = browserErrors.length;
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(350);

    const currentPath = new URL(page.url()).pathname;
    expect(currentPath, `${route} must stay on its protected route`).not.toMatch(/^\/(login|access-status)/);
    expect(response?.status() ?? 200, `${route} response`).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      textLength: document.body.innerText.trim().length,
    }));
    expect(geometry.textLength, `${route} should render content`).toBeGreaterThan(20);
    expect(geometry.documentWidth, `${route} document overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.bodyWidth, `${route} body overflow`).toBeLessThanOrEqual(geometry.viewport + 1);

    if (route === "/stock-card") {
      await expect(page.getByText(/Stock Card data is temporarily unavailable/i)).toHaveCount(0);
    }
    if (route === "/low-stock") {
      await expect(page.getByText(/Use PR basket/i)).toHaveCount(0);
    }
    if (route === "/stock-transfers/new" || route === "/stock-wastage/new") {
      const search = page.getByPlaceholder(/Search (?:by )?item code or (?:item )?name/i);
      await expect(search).toBeVisible();
      await search.fill("__no_such_item__");
      await expect(page.getByText(/No items match your search|No available branch stock found/i)).toBeVisible();
      await search.fill("");
      const setup = page.locator("details").first();
      await expect(setup).toHaveAttribute("open", "");
      await setup.locator("summary").click();
      await expect(setup).not.toHaveAttribute("open", "");
      await setup.locator("summary").click();
      await expect(setup).toHaveAttribute("open", "");
    }

    const screenshotPath = path.join(artifactDir, `${String(report.length + 1).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    report.push({ name, route, finalUrl: page.url(), status: response?.status() ?? null, geometry, screenshotPath, errors: browserErrors.slice(startErrorCount) });
  }

  fs.writeFileSync(path.join(artifactDir, "mobile-final-release-audit.json"), JSON.stringify(report, null, 2));
  expect(browserErrors, browserErrors.join("\n")).toEqual([]);
});
