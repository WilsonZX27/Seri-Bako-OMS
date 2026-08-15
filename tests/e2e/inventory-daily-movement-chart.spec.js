const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "inventory-daily-movement-chart");
fs.mkdirSync(evidence, { recursive: true });

test.describe("bounded Inventory daily movement insight", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superAdmin");
  });

  test("desktop exposes hover, keyboard preview, and same-date ledger drill-through", async ({ page }) => {
    await page.goto("/inventory?consumption=7d", { waitUntil: "domcontentloaded" });
    const chart = page.locator("[data-inventory-daily-movement-chart]");
    await expect(chart).toBeVisible();
    const svg = chart.locator("svg");
    const bounds = await svg.boundingBox();
    expect(bounds).not.toBeNull();

    await page.mouse.move(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.45);
    const preview = chart.locator("[data-inventory-movement-preview]");
    await expect(preview).toContainText(/Inbound/);
    await expect(preview).toContainText(/Outbound/);

    await svg.focus();
    await page.keyboard.press("Home");
    await expect(preview.getByRole("link", { name: "Open inbound" })).toHaveAttribute("href", /from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}&direction=inbound/);
    await page.keyboard.press("ArrowRight");
    await expect(preview.getByRole("link", { name: "Open outbound" })).toHaveAttribute("href", /direction=outbound/);
    await expect(chart.getByText("Daily data")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "desktop-1440.png"), fullPage: true });
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

    test("tap updates the preview and the chart remains inside the viewport", async ({ page }) => {
      await page.goto("/inventory?consumption=30d", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Inventory tools" })).toBeHidden();
      await expect(page.getByText("Inventory tools · 7")).toBeVisible();
      const chart = page.locator("[data-inventory-daily-movement-chart]");
      await expect(chart).toBeVisible();
      const svg = chart.locator("svg");
      await chart.scrollIntoViewIfNeeded();
      const bounds = await svg.boundingBox();
      expect(bounds).not.toBeNull();
      await expect(chart.locator("[data-inventory-movement-preview]")).toHaveClass(/sr-only/);
      await page.touchscreen.tap(bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.5);
      await expect(chart.locator("[data-inventory-movement-preview]")).toContainText(/All posted entries/);
      const geometry = await chart.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
      await page.screenshot({ path: path.join(evidence, "phone-393.png"), fullPage: true });
    });
  });
});
