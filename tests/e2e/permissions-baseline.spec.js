const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("super admin keeps core operational access and ledger export", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/v\d+\.\d+\.\d+/);
  await expect(page.getByRole("link", { name: /CSV/i })).toBeVisible();
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(200);
  for (const label of ["Purchase Requests", "Goods Receiving", "Supplier Invoices", "Stock Count", "Stock Wastage", "Movement Ledger", "Production Jobs", "Roles & Permissions"]) {
    await expect(page.locator("body")).toContainText(label);
  }
});

test("purchasing can reach PR creation but not role administration", async ({ page }) => {
  test.skip(!process.env.TEST_PURCHASING_EMAIL || !process.env.TEST_PURCHASING_PASSWORD, "Missing purchasing test credentials.");
  expect(await login(page, "purchasing")).toBe(true);
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form#purchase-request-form")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Roles & Permissions");
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /CSV/i })).toHaveCount(0);
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(403);
});

test("chef retains production access and cannot export ledger or manage roles", async ({ page }) => {
  test.skip(!process.env.TEST_CHEF_EMAIL || !process.env.TEST_CHEF_PASSWORD, "Missing Chef test credentials.");
  expect(await login(page, "chef")).toBe(true);
  await page.goto("/production/jobs", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/Production/i);
  await page.goto("/stock-transactions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /CSV/i })).toHaveCount(0);
  expect((await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).status()).toBe(403);
});

test("Kitchen is limited to its personal workspace and assigned asset checklist", async ({ page }) => {
  test.skip(!process.env.TEST_KITCHEN_EMAIL || !process.env.TEST_KITCHEN_PASSWORD, "Missing kitchen test credentials.");
  expect(await login(page, "kitchen")).toBe(true);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/Asset Checklist|Checklist/i);
  await expect(page.locator("body")).not.toContainText(/Purchase Requests|Production Jobs|Stock Count/i);
  await page.goto("/asset-management?view=checklist", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/Daily Checklist|Daily checks/i);
  await expect(page.locator("body")).not.toContainText("Overview");
  for (const route of ["/purchase-requests", "/items", "/stock-balance", "/production/jobs", "/supplier-invoices"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}(?:\\?.*)?$`));
  }
});
