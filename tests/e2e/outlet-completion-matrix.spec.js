const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const viewports = [
  { width: 393, height: 852, label: "phone" },
  { width: 820, height: 1180, label: "portrait-tablet" },
  { width: 1440, height: 900, label: "desktop" },
];

test("outlet completion matrix previews exact outlet-days without document overflow", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
    const matrix = page.locator("[data-outlet-completion-matrix]");
    await expect(matrix).toBeVisible();
    await expect(matrix.getByRole("columnheader")).toHaveCount(8);

    const firstCell = matrix.locator("tbody td a, tbody td button").first();
    await firstCell.hover();
    const preview = matrix.locator("[data-outlet-completion-preview]");
    await expect(preview).toBeVisible();
    const cellLabel = await firstCell.getAttribute("aria-label");
    expect(cellLabel).toBeTruthy();
    await expect(preview).toContainText(cellLabel.split(",")[0]);
    await firstCell.focus();
    await expect(firstCell).toBeFocused();

    const geometry = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
      hasContent: document.body.innerText.trim().length > 0,
    }));
    expect(geometry.documentOverflow, `${viewport.label} must not horizontally overflow`).toBeLessThanOrEqual(5);
    expect(geometry.overlay).toBe(false);
    expect(geometry.hasContent).toBe(true);

    const screenshotPath = `test-results/outlet-completion-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await test.info().attach(`outlet-completion-${viewport.label}`, { path: screenshotPath, contentType: "image/png" });
  }
});
