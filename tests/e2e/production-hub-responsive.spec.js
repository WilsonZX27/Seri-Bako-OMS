const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "production-hub-responsive");

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

test("production hub keeps one task hierarchy across phone and desktop", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
  await login(page, "superAdmin");

  for (const viewport of [
    { name: "phone", width: 390, height: 844 },
    { name: "desktop", width: 1280, height: 900 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/production", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("link", { name: /Start production job/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Production queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Production tools" })).toBeVisible();
    await expect(page.getByText("Quick Insights")).toHaveCount(0);

    const geometry = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallestTarget: Math.min(
        ...Array.from(document.querySelectorAll("[data-operational-hub] a, [data-operational-hub] button"))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height)),
      ),
    }));

    expect(geometry.documentOverflow, `${viewport.name} must not overflow horizontally`).toBeLessThanOrEqual(1);
    if (viewport.name === "phone") {
      expect(geometry.smallestTarget, "phone controls must retain a practical touch target").toBeGreaterThanOrEqual(40);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      const lastTool = await page.getByRole("link", { name: /Wastage review/ }).boundingBox();
      const mobileNav = await page.locator("[data-mobile-app-nav]").boundingBox();
      expect(lastTool, "last production tool must remain visible").not.toBeNull();
      expect(mobileNav, "mobile tab bar must remain visible").not.toBeNull();
      expect(lastTool.y + lastTool.height, "last production tool must sit above the mobile tab bar").toBeLessThanOrEqual(mobileNav.y - 8);
      await page.screenshot({
        path: path.join(evidence, "phone-bottom.png"),
      });
    }

    await page.screenshot({
      path: path.join(evidence, `${viewport.name}.png`),
      fullPage: true,
    });
  }
});
