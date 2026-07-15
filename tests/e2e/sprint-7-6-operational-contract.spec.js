const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 5)).toBe(true);
}

test("PR create owns pending state and Cancel never submits", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/purchase-requests/new");

  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route("**/purchase-requests/new", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await held;
    await route.abort();
  });

  await page.locator("#purchase-request-form").evaluate((form) => { form.noValidate = true; });
  const submission = page.getByRole("button", { name: "Create PR" }).click({ noWaitAfter: true });
  await expect(page.getByRole("button", { name: "Creating..." })).toBeDisabled();
  const cancel = page.getByRole("link", { name: "Cancel" });
  await expect(cancel).toHaveAttribute("href", "/purchase-requests");
  await expect(cancel.locator(".animate-spin")).toHaveCount(0);
  release();
  await submission.catch(() => {});
});

test("supplier filters and page never overflow at supported widths", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/suppliers");
    await expect(page.locator(".sb-list-filters")).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("destructive lifecycle actions explain consequences", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/suppliers");
  const supplierLink = page.locator('a[href^="/suppliers/"][aria-label^="Open "]').first();
  const supplierHref = await supplierLink.count() ? await supplierLink.getAttribute("href") : null;
  test.skip(!supplierHref, "No supplier exists for lifecycle verification.");
  await page.goto(supplierHref);
  await page.getByRole("button", { name: /deactivate supplier/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(/purchasing history/i);
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: /deactivate supplier/i })).toBeDisabled();
});

test("primary and destructive button hierarchy uses the shared contract", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/suppliers");
  await expect(page.getByRole("button", { name: "Filter" })).toHaveClass(/bg-\[var\(--sb-amber-700\)\]/);
  const supplierLink = page.locator('a[href^="/suppliers/"][aria-label^="Open "]').first();
  const supplierHref = await supplierLink.count() ? await supplierLink.getAttribute("href") : null;
  test.skip(!supplierHref, "No supplier exists for destructive hierarchy verification.");
  await page.goto(supplierHref);
  await expect(page.getByRole("button", { name: /deactivate supplier/i })).toHaveClass(/bg-white/);
});
