const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

test("Outlet can enter Received/Wastage while Qty Sent is pending, but saves as draft", async ({ page }) => {
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
  await expect(page.locator("[data-qty-sent-ownership]")).toContainText("Only Kitchen and authorised company-wide staff can enter it.");
  await expect(page.locator('input[name="morning_received_qty"]').first()).toBeEnabled();
  await expect(page.locator('input[name="wastage_qty"]').first()).toBeEnabled();
  const saveEntry = page.getByRole("button", { name: "Save Outlet Entry" }).first();
  await expect(saveEntry).toBeVisible();
  await saveEntry.click();
  await expect(page).toHaveURL(/\/outlet-daily-records\/[^?]+\?success=/);
  await expect(page.getByText(/You can enter Received and Wastage now/i).first()).toBeVisible();
});
