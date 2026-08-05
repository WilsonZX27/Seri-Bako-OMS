const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const viewports = [
  { width: 390, height: 844, label: "mobile" },
  { width: 820, height: 1180, label: "tablet" },
  { width: 1440, height: 900, label: "desktop" },
];

test("outlet daily record keeps the direct-post workflow usable at every viewport", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Daily Product Lines", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Find product by name, code, or category")).toBeVisible();
    await expect(page.getByText("Review", { exact: true })).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.label} must not horizontally overflow`).toBeLessThanOrEqual(5);

    if (viewport.width < 768) {
      await page.getByRole("button", { name: "View workflow" }).click();
      const workflowSheet = page.getByRole("dialog", { name: "Workflow progress" });
      await expect(workflowSheet.getByText("Posted", { exact: true })).toBeVisible();
      await workflowSheet.getByRole("button", { name: "Close Workflow progress" }).click();

      const primary = page.getByRole("button", { name: "Confirm Qty Sent" });
      await expect(primary).toBeVisible();
      await expect(primary.locator("svg")).toHaveCount(1);
      await expect(page.locator("[data-mobile-app-nav]")).toBeVisible();

      await page.locator("[data-mobile-document-action]").getByRole("button", { name: "More" }).click();
      const sheet = page.getByRole("dialog", { name: "More options" });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Post Daily Record" })).toBeVisible();
      await sheet.getByRole("button", { name: "Close More options" }).click();
      await expect(sheet).toHaveCount(0);
      await expect(primary).toBeVisible();
    } else {
      await expect(page.locator("[data-workflow-pipeline]").getByText("Posted", { exact: true })).toBeVisible();
    }
  }
});
