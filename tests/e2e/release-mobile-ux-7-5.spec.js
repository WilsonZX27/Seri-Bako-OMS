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

test("mobile shell keeps one primary action and separate context access", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");

  for (const expectation of [
    ["/purchase-requests", "New PR"],
    ["/purchase-orders", "New PO"],
    ["/purchase-returns", "New Return"],
    ["/products", "New product"],
    ["/locations", "New location"],
    ["/items", "New item"],
    ["/recipes", "New recipe"],
    ["/production/jobs/new", "Create draft production job"],
  ]) {
    await page.goto(expectation[0], { waitUntil: "domcontentloaded" });
    const bar = page.locator("[data-mobile-action-bar]");
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: expectation[1] }).or(bar.getByRole("link", { name: expectation[1] }))).toBeVisible();
    await expect(bar.getByRole("button", { name: "Open page actions" })).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("shared mobile filters stay within two control rows", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page, "superAdmin");
  for (const route of ["/items", "/purchase-requests", "/purchase-orders", "/stock-transfers"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const filter = page.locator(".sb-list-filters").first();
    await expect(filter).toBeVisible();
    const rowTops = await filter.locator(":scope > *:visible").evaluateAll((elements) =>
      Array.from(new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top)))).sort((a, b) => a - b),
    );
    expect(rowTops.length, `${route} filter rows: ${rowTops.join(", ")}`).toBeLessThanOrEqual(2);
    await expectNoPageOverflow(page);
  }
});

test("core mobile tables retain essential columns and final actions", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  const cases = [
    ["/items", ["Item Code", "Item Name", "Base Unit", "Status", "Action"]],
    ["/purchase-requests", ["PR No", "Needed By", "Status", "Action"]],
    ["/purchase-orders", ["PO No", "Supplier", "Status", "Action"]],
    ["/staffs", ["Staff Code", "Name", "Role", "Staff Status", "Action"]],
    ["/recipes", ["Recipe No", "Product", "Status", "Action"]],
  ];
  for (const [route, essential] of cases) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("table")).toBeVisible();
    const visibleHeaders = (await page.locator("table thead th:visible").allTextContents()).map((value) => value.trim()).filter(Boolean);
    for (const header of essential) expect(visibleHeaders).toContain(header);
    expect(visibleHeaders.at(-1)).toMatch(/^Actions?$/i);
    await expectNoPageOverflow(page);
  }
});

test("reported typography and action-placement regressions stay corrected", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");

  await page.goto("/production/jobs/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-right-console]").getByRole("button", { name: "Create draft production job" })).toBeVisible();
  const recipeWarning = page.getByText("No active recipe found. Activate a recipe before creating production job.");
  if (await recipeWarning.count()) {
    expect(await recipeWarning.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(13);
  }

  await page.goto("/recipes", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-right-console]").getByRole("link", { name: "New recipe" })).toBeVisible();
  await expect(page.locator("main header").getByRole("link", { name: "New recipe" })).toHaveCount(0);

  await page.goto("/purchase-orders", { waitUntil: "domcontentloaded" });
  const headerHeight = await page.locator("main > header").evaluate((element) => element.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(64);
});

test("latest responsive feedback keeps actions contextual and mobile UI compact", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");

  for (const [route, actions] of [
    ["/products", ["New product", "Import products"]],
    ["/locations", ["New location", "Fix missing stock areas", "Clean duplicate internal locations"]],
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const console = page.locator("[data-right-console]");
    for (const action of actions) await expect(console.getByRole("link", { name: action }).or(console.getByRole("button", { name: action }))).toBeVisible();
    for (const action of actions) await expect(page.locator("main > header").getByText(action, { exact: true })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-mobile-action-bar]").getByRole("link", { name: "New item" })).toBeVisible();
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  const filter = page.locator(".sb-list-filters").first();
  await expect(filter).toBeVisible();
  expect((await filter.boundingBox()).height).toBeLessThanOrEqual(90);
  await expectNoPageOverflow(page);

});

test("release viewports have stable shell, dates, controls, and contextual console", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/production/jobs/new", { waitUntil: "domcontentloaded" });
    await expectNoPageOverflow(page);
    const date = page.locator('input[type="date"]:visible').first();
    if (await date.count()) {
      const box = await date.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    if (viewport.width >= 1280) {
      await expect(page.locator("[data-right-console]")).toBeVisible();
      await expect(page.locator("[data-mobile-action-bar]")).toBeHidden();
    } else {
      await expect(page.locator("[data-right-console]")).toBeHidden();
      await expect(page.locator("[data-mobile-action-bar]")).toBeVisible();
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
  await expect(page.getByText(/Barcodes? \(/)).toHaveCount(0);
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

    await adminPage.getByRole("button", { name: "Reset to role defaults" }).click();
    await expect(adminPage.getByText("Permission overrides reset to role defaults.", { exact: true }).first()).toBeVisible();
    await openManagerStaff(adminPage);
    await expect(adminPage.getByRole("button", { name: "Reset to role defaults" })).toHaveCount(0);
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
});
