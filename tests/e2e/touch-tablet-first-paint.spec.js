const { test, expect } = require("@playwright/test");

test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
});

test("iPadOS desktop user agents select the touch-tablet shell before hydration", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
      configurable: true,
      get: () => 5,
    });
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-touch-tablet", "true");
});
