const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => ({
    ok: document.documentElement.scrollWidth <= window.innerWidth + 5,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.ok, `page must not overflow horizontally (${overflow.scrollWidth}px > ${overflow.width}px)`).toBe(true);
}

test("core list and document pages keep the operational UX skeleton", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/purchase-requests", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Purchase Requests" })).toBeVisible();
  await expect(page.locator("[data-right-console]").getByRole("link", { name: "New PR" })).toBeVisible();
  // Both desktop and mobile filter shells are rendered for responsive hydration;
  // assert the canonical desktop shell explicitly at this viewport.
  await expect(page.locator('form[data-unified-list-desktop="true"]').filter({ has: page.locator('input[name="search"]') })).toBeVisible();
  await expect(page.locator("table thead")).toContainText("PR No");
  await expectNoPageOverflow(page);

  await page.goto("/production/jobs?search=PJ-00001", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Production Jobs" })).toBeVisible();
  await expect(page.locator("[data-right-console]").getByRole("link", { name: "New Production Job" })).toBeVisible();
  await expect(page.locator("table thead")).toContainText("Job No");
  await expectNoPageOverflow(page);

  const jobLink = page.locator('a[href^="/production/jobs/"][aria-label^="Open PJ-00001"]');
  if ((await jobLink.count()) === 1) {
    await jobLink.click();
    await expect(page).toHaveURL(/\/production\/jobs\//);
    await expect(page.locator("[data-center-workspace]")).toHaveCount(1);
    await expect(page.locator("[data-right-console]")).toBeVisible();
    await expect(page.locator("body")).toContainText("PJ-00001");
    await expectNoPageOverflow(page);
  }
});

test("mobile create form remains reachable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await login(page, "superAdmin")).toBe(true);
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form#purchase-request-form")).toBeVisible();
  await expect(page.locator("[data-mobile-page-title]")).toHaveText("Purchase Requests");
  // Document/task pages intentionally replace the global nav with their fixed action rail.
  await expect(page.locator("[data-mobile-app-nav]")).toBeHidden();
  await expectNoPageOverflow(page);
});
