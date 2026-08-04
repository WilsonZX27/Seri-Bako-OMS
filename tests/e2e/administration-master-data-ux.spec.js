const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 5)).toBe(true);
}

test("administration and master data pages use the shared list and detail patterns", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/items?search=QA-IMP-ITEM-733", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New item" })).toBeVisible();
  await expect(page.locator('input[name="search"]')).toBeVisible();
  await expect(page.locator("table thead")).toContainText("Current Stock");
  await expectNoPageOverflow(page);
  const itemAction = page.locator('tbody tr[data-href] td:last-child a[aria-label^="Open"]');
  if (await itemAction.count()) {
    await itemAction.first().click();
    await expect(page.locator("[data-center-workspace]")).toContainText("Inventory Controls");
    await expect(page.locator("[data-right-console]")).toContainText("Save Item");
    await expectNoPageOverflow(page);
  } else {
    await expect(page.getByText(/No records match|No items/i).first()).toBeVisible();
  }

  await page.goto("/suppliers?search=QA-IMP-SUP-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("table thead")).toContainText("Action");

  await page.goto("/suppliers/new", { waitUntil: "domcontentloaded" });
  for (const section of ["Supplier Identity", "Contact Information", "Address", "Commercial Terms"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
  await expect(page.locator("[data-right-console]")).toContainText("Create Supplier");

  await page.goto("/branches?search=QA-IMP-BR-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("table thead")).toContainText("Address");
  await expect(page.locator("table thead")).toContainText("Action");

  await page.goto("/staffs?search=QA-IMP-STAFF-733", { waitUntil: "domcontentloaded" });
  await expect(page.locator("table thead")).toContainText("Account Status");
  await expect(page.locator("table thead")).toContainText("Action");

  await page.goto("/recipes?search=RCP-20260711-NEW", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[name="search"]')).toBeVisible();
  const recipeLink = page.getByRole("link", { name: "View" }).first();
  if (await recipeLink.count()) {
    await recipeLink.click();
    await expect(page.locator("[data-right-console]")).toContainText("Recipe Workflow");
  }

  await page.goto("/roles", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-right-console]")).toContainText("Role Summary");
  const roleLink = page.getByRole("link", { name: "Edit" }).first();
  if (await roleLink.count()) {
    const roleHref = await roleLink.getAttribute("href");
    expect(roleHref).toMatch(/^\/roles\//);
    await page.goto(roleHref, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Business Permission Matrix" })).toBeVisible();
    await expect(page.locator("[data-right-console]")).toContainText("Role Summary");
  }

  await page.goto("/imports", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Import Data" })).toBeVisible();
  await page.goto("/imports/items", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Import workflow", { exact: true })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("3. Upload");
  await expectNoPageOverflow(page);

  await page.goto("/company", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Company Profile" })).toBeVisible();
  await expect(page.locator("[data-right-console]")).toContainText("Save Company");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/items", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-right-console]")).toBeVisible();
  await expectNoPageOverflow(page);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/suppliers/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Create Supplier" })).toBeVisible();
  await expectNoPageOverflow(page);
});

test("mobile master-data form keeps its save action reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/items/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create item" })).toBeVisible();
  await expectNoPageOverflow(page);
});
