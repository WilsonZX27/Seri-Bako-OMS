const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { name: "phone-320", width: 320, height: 700 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 960 },
  { name: "wide", width: 2560, height: 1440 },
];

async function expectNoPageOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);
}

for (const viewport of viewports) {
  test(`auth shell remains contained and console-clean at ${viewport.name}`, async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expectNoPageOverflow(page);
    if (viewport.width < 768) {
      const targetHeights = await page.locator('input[name="email"], input[name="password"], button[type="submit"], button[aria-label="Show password"], a[href="/forgot-password"]').evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
      expect(Math.min(...targetHeights), `${viewport.name} auth targets must be at least 48px high`).toBeGreaterThanOrEqual(48);
    }
    expect(errors, `console errors at ${viewport.name}`).toEqual([]);
  });
}

for (const role of ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outlet"]) {
  for (const viewport of viewports) {
    test(`${role} reaches its permission-safe workdesk without console errors at ${viewport.name}`, async ({ page }) => {
    test.skip(!hasAccount(role), `Missing isolated ${role} test credentials.`);
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.setViewportSize(viewport);
    expect(await login(page, role)).toBe(true);
    await expect(page).toHaveURL(/\/(dashboard|production\/jobs|outlet-daily-records)/);
    await expect(page.locator("main#main-content")).toBeVisible();
    await expectNoPageOverflow(page);
    const mobileNavigation = page.locator("[data-mobile-app-nav]");
    if (viewport.width < 1280) {
      await expect(mobileNavigation).toBeVisible();
    } else {
      await expect(mobileNavigation).toBeHidden();
    }
    expect(errors, `${role} dashboard console errors`).toEqual([]);
    });
  }
}

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 960 },
]) {
  test(`kitchen stock count entry remains contained and actionable at ${viewport.name}`, async ({ page }) => {
    test.skip(!hasAccount("kitchen"), "Missing isolated kitchen test credentials.");
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.setViewportSize(viewport);
    expect(await login(page, "kitchen")).toBe(true);
    await page.goto("/stock-counts/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /stock count/i })).toBeAttached();
    await expect(page.locator('input[type="hidden"][name="branch_id"]')).toHaveValue(/.+/);
    const detailsToggle = page.locator("[data-stock-count-details-toggle]");
    if (viewport.width < 1024) {
      await expect(detailsToggle).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("[data-stock-count-branch-summary]")).toBeVisible();
      await expect(page.locator("[data-stock-count-branch-lock]")).toBeAttached();
    } else {
      await expect(detailsToggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator('input[name="count_date"]')).toBeVisible();
      await expect(page.locator("[data-stock-count-branch-lock]")).toBeVisible();
    }
    const primaryAction = page.locator('button:visible').filter({ hasText: /^Save draft$/ });
    await expect(primaryAction).toBeVisible();
    await expectNoPageOverflow(page);
    if (viewport.width < 768) {
      const targetMetrics = await page.locator('main input[name="count_date"], main button').evaluateAll((nodes) => nodes
        .filter((node) => node.getBoundingClientRect().height > 0)
        .map((node) => ({ label: node.getAttribute("aria-label") || node.textContent?.trim() || node.tagName, height: Math.round(node.getBoundingClientRect().height) })));
      expect(Math.min(...targetMetrics.map((target) => target.height)), `${viewport.name} stock-count controls must be at least 48px high: ${JSON.stringify(targetMetrics)}`).toBeGreaterThanOrEqual(48);
    }
    expect(errors, `${viewport.name} stock-count console errors`).toEqual([]);
  });
}

const procurementRoutes = [
  "/purchase-requests",
  "/purchase-orders",
  "/goods-receivings",
];

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 960 },
]) {
  for (const route of procurementRoutes) {
    test(`purchasing ${route} stays contained and navigation-safe at ${viewport.name}`, async ({ page }) => {
      test.skip(!hasAccount("purchasing"), "Missing isolated purchasing test credentials.");
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.setViewportSize(viewport);
      expect(await login(page, "purchasing")).toBe(true);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main#main-content")).toBeVisible();
      await expect(page.getByRole("heading", { name: "This workspace could not finish the request" })).toHaveCount(0);
      await expectNoPageOverflow(page);

      const mobileNavigation = page.locator("[data-mobile-app-nav]");
      if (viewport.width < 1280) {
        await expect(mobileNavigation).toBeVisible();
      } else {
        await expect(mobileNavigation).toBeHidden();
      }
      expect(errors, `${route} console errors at ${viewport.name}`).toEqual([]);
    });
  }
}

const kitchenInventoryRoutes = [
  "/stock-balance",
  "/stock-counts",
  "/stock-transfers",
  "/stock-wastage",
];

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 960 },
]) {
  for (const route of kitchenInventoryRoutes) {
    test(`kitchen ${route} stays contained and navigation-safe at ${viewport.name}`, async ({ page }) => {
      test.skip(!hasAccount("kitchen"), "Missing isolated kitchen test credentials.");
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.setViewportSize(viewport);
      expect(await login(page, "kitchen")).toBe(true);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main#main-content")).toBeVisible();
      await expect(page.getByRole("heading", { name: "This workspace could not finish the request" })).toHaveCount(0);
      await expectNoPageOverflow(page);

      const mobileNavigation = page.locator("[data-mobile-app-nav]");
      if (viewport.width < 1280) {
        await expect(mobileNavigation).toBeVisible();
      } else {
        await expect(mobileNavigation).toBeHidden();
      }
      expect(errors, `${route} console errors at ${viewport.name}`).toEqual([]);
    });
  }
}

test("an unauthenticated cross-site mutation never reaches a write handler", async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/api/items/quick-create`, {
    headers: {
      origin: "https://attacker.invalid",
      "content-type": "application/json",
    },
    data: { item_name: "Blocked", category: "Test", base_unit: "KG", purchase_unit: "KG" },
    maxRedirects: 0,
  });

  expect([307, 403]).toContain(response.status());
  if (response.status() === 307) {
    expect(response.headers().location).toContain("/login");
  } else {
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  }
});
