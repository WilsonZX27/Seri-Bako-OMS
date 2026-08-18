const { test, expect } = require("@playwright/test");
const { hasAccount, login, missingAccountVars } = require("./helpers");

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function expectNoPageOverflow(page) {
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document, `document width ${widths.document} at viewport ${widths.viewport}`).toBeLessThanOrEqual(widths.viewport + 1);
}

async function gotoSettled(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

function actionIn(locator, name) {
  return locator.getByRole("button", { name }).or(locator.getByRole("link", { name }));
}

async function expectPhoneActionSurface(page, name, { documentAction = false } = {}) {
  const createFab = page.locator("[data-mobile-create-fab]");
  const actionBar = page.locator(documentAction ? "[data-mobile-document-action]" : "[data-mobile-action-bar]");
  if (await createFab.count()) {
    await expect(createFab).toBeVisible();
    await expect(createFab).toHaveAttribute("aria-label", name);
  } else {
    await expect(actionBar).toBeVisible();
    await expect(actionIn(actionBar, name)).toBeVisible();
  }
}

test("mobile shell keeps one primary action and separate context access", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");

  for (const expectation of [
    ["/purchase-requests", "New purchase request"],
    ["/purchase-orders", "New PO"],
    ["/purchase-returns", "New Return"],
    ["/products", "New product"],
    ["/items", "New item"],
    ["/recipes", "New recipe"],
  ]) {
    await gotoSettled(page, expectation[0]);
    await expectPhoneActionSurface(page, expectation[1]);
    await expectNoPageOverflow(page);
  }
  await gotoSettled(page, "/production/jobs/new");
  await expectPhoneActionSurface(page, "Create Draft Production Job", { documentAction: true });
  await expectNoPageOverflow(page);
});

test("shared mobile filters stay within two control rows", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page, "superAdmin");
  for (const route of ["/items", "/purchase-requests", "/purchase-orders", "/stock-transfers"]) {
    await gotoSettled(page, route);
    const filter = page.locator(".unified-list-header:visible").first();
    await expect(filter).toBeVisible();
    const rowTops = await filter.locator(":scope > *:visible").evaluateAll((elements) =>
      Array.from(new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top)))).sort((a, b) => a - b),
    );
    expect(rowTops.length, `${route} filter rows: ${rowTops.join(", ")}`).toBeLessThanOrEqual(2);
    await expectNoPageOverflow(page);
  }
});

test("core mobile registers retain essential records and final actions", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  const cases = ["/items", "/purchase-requests", "/purchase-orders", "/staffs", "/recipes"];
  for (const route of cases) {
    await gotoSettled(page, route);
    const list = page.locator('[role="list"]:visible').first();
    await expect(list).toBeVisible();
    const listItems = list.locator('[role="listitem"]:visible');
    if (await listItems.count()) {
      await expect(listItems.first()).toBeVisible();
    } else {
      await expect(page.locator("p:visible").filter({ hasText: /No (.+) yet|No records match/i }).first()).toBeVisible();
    }
    await expect(page.locator("table:visible")).toHaveCount(0);
    await expectNoPageOverflow(page);
  }
});

test("reported typography and action-placement regressions stay corrected", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");

  await gotoSettled(page, "/production/jobs/new");
  await expect(actionIn(page.locator("[data-right-console]"), "Create Draft Production Job")).toBeVisible();
  const recipeWarning = page.getByText("No active recipe found. Activate a recipe before creating production job.");
  if (await recipeWarning.count()) {
    expect(await recipeWarning.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(13);
  }

  await gotoSettled(page, "/recipes");
  await expect(actionIn(page.locator("[data-right-console]"), "New recipe")).toBeVisible();
  await expect(page.locator("main header").getByRole("link", { name: "New recipe" })).toHaveCount(0);

  await gotoSettled(page, "/purchase-orders");
  const header = page.locator("main > header").first();
  await expect(header).toBeVisible();
  const headerHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(72);
});

test("latest responsive feedback keeps actions contextual and mobile UI compact", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");

  for (const [route, actions] of [
    ["/products", ["New product", "Import products"]],
  ]) {
    await gotoSettled(page, route);
    const console = page.locator("[data-right-console]");
    for (const action of actions) await expect(console.getByRole("link", { name: action }).or(console.getByRole("button", { name: action }))).toBeVisible();
    for (const action of actions) await expect(page.locator("main > header").getByText(action, { exact: true })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoSettled(page, "/items");
  await expectPhoneActionSurface(page, "New item");
  await gotoSettled(page, "/products");
  const filter = page.locator(".unified-list-header:visible").first();
  await expect(filter).toBeVisible();
  expect((await filter.boundingBox()).height).toBeLessThanOrEqual(90);
  await expectNoPageOverflow(page);

});

test("inventory creation forms keep lifecycle and primary actions in context", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1355, height: 792 });
  await login(page, "superAdmin");

  await gotoSettled(page, "/products/new");
  await expect(page.locator('input[type="file"][name="product_image"]')).toBeVisible();
  await expect(page.getByLabel("Product Image URL")).toHaveCount(0);
  await expect(page.getByLabel("Status")).toHaveCount(0);
  await expect(actionIn(page.locator("[data-right-console]"), "Create product")).toBeVisible();

  for (const [route, action] of [
    ["/stock-counts/new", "Save draft"],
    ["/stock-wastage/new", "Create wastage"],
    ["/stock-transfers/new", "Save Transfer Draft"],
    ["/stock-transactions/new", "Post stock transaction"],
  ]) {
    await gotoSettled(page, route);
    await expect(actionIn(page.locator("[data-right-console]"), action)).toBeVisible();
    await expect(page.getByLabel("Status")).toHaveCount(0);
    await expect(page.getByText("Select the outlet, kitchen, office, or event booth this record belongs to.")).toHaveCount(0);
  }
});

test("release viewports have stable shell, dates, controls, and contextual console", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await gotoSettled(page, "/production/jobs/new");
    await expectNoPageOverflow(page);
    const date = page.locator('input[type="date"]:visible').first();
    if (await date.count()) {
      const box = await date.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    if (viewport.width >= 1280) {
      await expect(page.locator("[data-right-console]")).toBeVisible();
      await expect(page.locator("[data-mobile-action-bar], [data-mobile-document-action], [data-mobile-create-fab]")).toBeHidden();
    } else {
      await expect(page.locator("[data-right-console]")).toBeHidden();
      if (viewport.width < 640) {
        await expect(page.locator("[data-mobile-document-action]")).toBeVisible();
        await expect(page.locator("[data-mobile-app-nav]")).toBeHidden();
      } else if (viewport.width < 1024) {
        await expect(page.locator("[data-mobile-document-action], [data-mobile-action-bar], [data-mobile-create-fab]")).toBeHidden();
        await expect(page.locator("[data-mobile-app-nav]")).toBeHidden();
        const split = page.locator("[data-tablet-split-actions]");
        if (await split.count()) await expect(split).toBeVisible();
      } else {
        await expect(page.locator("[data-mobile-document-action], [data-mobile-action-bar], [data-mobile-create-fab]")).toBeHidden();
        await expect(page.locator("[data-mobile-app-nav]")).toBeVisible();
        const split = page.locator("[data-tablet-split-actions]");
        if (await split.count()) await expect(split).toBeVisible();
      }
    }
  }
});

test("staff permission overrides are catalog-driven and owner-safe", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");
  await page.goto(`/staffs?search=${encodeURIComponent(process.env.TEST_SUPER_ADMIN_EMAIL)}`, { waitUntil: "domcontentloaded" });
  const ownerRow = page.locator("tbody tr").filter({ hasText: process.env.TEST_SUPER_ADMIN_EMAIL }).first();
  await expect(ownerRow).toBeVisible();
  const ownerHref = await ownerRow.locator("a[aria-label^='Open']").getAttribute("href");
  expect(ownerHref).toMatch(/^\/staffs\//);
  await page.goto(ownerHref, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Permission Overrides" })).toBeVisible();
  await expect(page.getByText("Role permissions are defaults. Individual staff overrides may alter effective access.")).toBeVisible();
  await expect(page.getByText("Super Admin / Owner permissions are protected and cannot be overridden.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save overrides" })).toHaveCount(0);
  await expect(page.locator('select[name^="permission:"]').first().locator("option")).toHaveText(["Inherit", "Allow", "Deny"]);
  await expect(page.getByRole("button", { name: "Resend email invitation" })).toHaveCount(0);
  await expect(page.getByText("Branch Access Summary")).toHaveCount(0);
});

test("staff allow and deny overrides affect direct routes without granting mutation authority", async ({ browser }) => {
  test.setTimeout(180_000);
  test.skip(process.env.RUN_PERMISSION_OVERRIDE_MUTATION_TESTS !== "true", "Set RUN_PERMISSION_OVERRIDE_MUTATION_TESTS=true only for the isolated permission fixture.");
  test.skip(!hasAccount("superAdmin") || !hasAccount("manager"), "Super admin and manager test credentials are required.");
  const managerEmail = process.env.TEST_MANAGER_EMAIL;
  const adminContext = await browser.newContext();
  const managerContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const managerPage = await managerContext.newPage();
  let directRouteUrl = "";
  let inheritedRouteUrl = "";

  async function openManagerStaff(page) {
    await page.goto(`/staffs?search=${encodeURIComponent(managerEmail)}`, { waitUntil: "domcontentloaded" });
    const row = page.locator("tbody tr").filter({ hasText: managerEmail }).first();
    await expect(row).toBeVisible();
    const staffHref = await row.locator("a[aria-label^='Open']").getAttribute("href");
    expect(staffHref).toMatch(/^\/staffs\//);
    await page.goto(staffHref, { waitUntil: "domcontentloaded" });
    await page.locator("details").evaluateAll((details) => details.forEach((detail) => { detail.open = true; }));
  }

  async function chooseOverride(permissionCode, value) {
    await adminPage.getByLabel(`Override ${permissionCode}`).selectOption(value, { force: true });
    await expect(adminPage.getByLabel(`Override ${permissionCode}`)).toHaveValue(value);
  }

  try {
    await login(adminPage, "superAdmin");
    await login(managerPage, "manager");
    await openManagerStaff(adminPage);
    if (await adminPage.getByRole("button", { name: "Reset to role defaults" }).count()) {
      await adminPage.getByRole("button", { name: "Reset to role defaults" }).click();
      await expect(adminPage.getByText("Permission overrides reset to role defaults.", { exact: true }).first()).toBeVisible();
      await openManagerStaff(adminPage);
    }
    await expect(adminPage.getByRole("button", { name: "Reset to role defaults" })).toHaveCount(0);
    for (const permissionCode of ["reports.view", "documents.read", "inventory.read"]) {
      await chooseOverride(permissionCode, "deny");
    }
    const saveOverrides = adminPage.getByRole("button", { name: "Save overrides" });
    const submittedDenyCount = await saveOverrides.evaluate((button) => Array.from(new FormData(button.form).values()).filter((value) => value === "deny").length);
    expect(submittedDenyCount).toBe(3);
    await saveOverrides.click();
    await expect(adminPage.getByText("Permission overrides updated.", { exact: true }).first()).toBeVisible();
    await openManagerStaff(adminPage);
    await expect(adminPage.getByRole("button", { name: "Reset to role defaults" })).toBeVisible();
    for (const permissionCode of ["reports.view", "documents.read", "inventory.read"]) {
      await expect(adminPage.getByLabel(`Override ${permissionCode}`)).toHaveValue("deny");
    }

    const directRouteResponse = await managerPage.goto("/reports", { waitUntil: "domcontentloaded" });
    directRouteUrl = managerPage.url();
    expect(directRouteResponse?.status()).toBeLessThan(400);
    expect(directRouteUrl).toMatch(/\/dashboard\?error=/);
    await expect(managerPage.getByRole("heading", { name: "Reports", exact: true })).toHaveCount(0);

    await adminPage.getByRole("button", { name: "Reset to role defaults" }).click();
    await expect(adminPage.getByText("Permission overrides reset to role defaults.", { exact: true }).first()).toBeVisible();
    await openManagerStaff(adminPage);
    await expect(adminPage.getByRole("button", { name: "Reset to role defaults" })).toHaveCount(0);
    await managerPage.goto("/reports", { waitUntil: "domcontentloaded" });
    inheritedRouteUrl = managerPage.url();
    await expect(managerPage.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  } finally {
    if (!adminPage.isClosed()) await openManagerStaff(adminPage).catch(() => {});
    if (!adminPage.isClosed() && await adminPage.getByRole("button", { name: "Reset to role defaults" }).count().catch(() => 0)) {
      await adminPage.getByRole("button", { name: "Reset to role defaults" }).click().catch(() => {});
      await expect(adminPage.getByText("Permission overrides reset to role defaults.", { exact: true }).first()).toBeVisible().catch(() => {});
      await expect(adminPage.getByRole("button", { name: "Reset to role defaults" })).toHaveCount(0).catch(() => {});
    }
    await adminContext.close();
    await managerContext.close();
  }
  expect(directRouteUrl).toMatch(/\/dashboard\?error=/);
  expect(inheritedRouteUrl).toMatch(/\/reports$/);
});
