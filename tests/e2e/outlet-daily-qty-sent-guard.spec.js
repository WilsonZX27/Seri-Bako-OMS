const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

test("Outlet cannot post a daily record before Qty Sent is confirmed", async ({ page }) => {
  test.skip(!hasAccount("outlet"), "Missing Outlet test credentials.");
  await login(page, "outlet");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
  const branch = page.getByRole("combobox", { name: "Branch" });
  const outletOption = branch.locator("option").filter({ hasText: "Local E2E Outlet" }).first();
  if (await outletOption.count()) await branch.selectOption(await outletOption.getAttribute("value"));
  else if (await branch.locator("option").count() > 1) await branch.selectOption({ index: 1 });
  await page.locator('input[name="record_date"]').evaluate((input) => {
    input.value = "2026-08-23";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const complete = page.getByRole("button", { name: /Complete(?: Daily)? Record/i }).first();
  await expect(complete).toBeVisible();
  await complete.click();
  await expect(page).toHaveURL(/\/outlet-daily-records\/new\?error=/);
  await expect(page.getByText(/Qty Sent is missing/i).first()).toBeVisible();
  await expect(page.getByText(/Kitchen or authorised company-wide user must confirm Qty Sent/i).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Outlet daily record saved\./i);
});
