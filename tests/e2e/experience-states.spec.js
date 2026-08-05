const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 5)).toBe(true);
}

test("core error, empty, feedback, and mobile states stay usable", async ({ page }) => {
  test.setTimeout(360_000);
  expect(await login(page, "superAdmin")).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/items?search=NO_MATCH_SPRINT_734", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByRole("cell").getByText(/No items found|No records match/i)).toBeVisible();
  await expect(page.getByRole("cell").getByRole("link", { name: "Clear filters" })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto("/definitely-not-a-real-route-734", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to dashboard" })).toBeVisible();

  await page.goto("/production/jobs/not-a-real-job-id-734", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Production job not found")).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to production jobs/i })).toBeVisible();

  await page.goto("/items/new?error=A%20record%20with%20this%20code%20already%20exists.", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert").filter({ hasText: "already exists" })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Create Item" });
  await expect(createButton).toBeVisible();

  await page.goto("/stock-transactions/new?error=You%20do%20not%20have%20permission%20to%20complete%20this%20action.", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert").filter({ hasText: "permission" })).toBeVisible();

  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  const submit = page.getByRole("button", { name: "Submit PR" });
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not create this purchase request" })).toBeVisible();

  await page.goto("/production/jobs?search=PJ-00001", { waitUntil: "domcontentloaded" });
  const jobLink = page.locator('a[href^="/production/jobs/"][aria-label^="Open PJ-00001"]');
  if ((await jobLink.count()) === 1) {
    await jobLink.click();
    await expect(page.locator("[data-right-console]")).toContainText(/Workflow|No further action|Posted|Completed/i);
    await expect(page.getByRole("button", { name: /Post Production/i })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items/new?error=Review%20the%20required%20fields%20and%20try%20again.", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert").filter({ hasText: "Review the required fields" })).toBeVisible();
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("button", { name: "Create Item" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
  await expectNoPageOverflow(page);
});
