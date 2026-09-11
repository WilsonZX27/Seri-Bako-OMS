const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

for (const viewport of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "phone", width: 390, height: 844 },
]) {
  test(`${viewport.label} bulk confirmation traps focus and returns it safely`, async ({ page }) => {
    test.setTimeout(90_000);
    expect(await login(page, "superAdmin")).toBe(true);
    await page.setViewportSize(viewport);
    await page.goto("/branches", { waitUntil: "domcontentloaded" });

    const rowCheckbox = viewport.label === "phone"
      ? page.getByRole("checkbox", { name: /^Select (?!all visible)/ }).first()
      : page.getByLabel("Select row").first();
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.check();

    const trigger = page.getByRole("button", { name: "Archive selected" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Archive selected" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(5);
  });
}

test("global success feedback is visible, bounded and dismissible", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/branches?success=Branch%20restored.", { waitUntil: "domcontentloaded" });
  const toast = page.getByRole("status").filter({ hasText: "Branch restored." });
  await expect(toast).toBeVisible();
  const box = await toast.boundingBox();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await toast.getByRole("button", { name: "Close message" }).click();
  await expect(toast).toBeHidden();
});
