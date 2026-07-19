const { test, expect } = require("@playwright/test");
const { account, hasAccount, login, missingAccountVars } = require("./helpers");

const roles = ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outlet"];
const widths = [1440, 1024, 768, 430, 390, 360];
const filterRoutes = ["/items", "/purchase-requests", "/purchase-orders", "/supplier-invoices"];

async function signInAllowingStableAccessState(page, role) {
  const credentials = account(role);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 });
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|too many redirects/i);
}

for (const role of roles) {
  test(`${role} reaches a stable authenticated page`, async ({ page }) => {
    test.skip(!hasAccount(role), `Missing ${role} credentials: ${missingAccountVars(role).join(", ")}`);
    await signInAllowingStableAccessState(page, role);
    await expect(page.locator("body")).toContainText("v7.23.5.6");
  });
}

test("Staff list, detail, create and edit controls use one six-role catalogue", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing Owner credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");
  await page.goto("/staffs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Staffs" })).toBeVisible();
  const href = await page.locator('a[aria-label^="Open "]').first().getAttribute("href");
  expect(href).toMatch(/^\/staffs\//);

  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText(/more than one relationship|Application error|Internal Server Error/i);
  await expect(page.getByRole("combobox", { name: "Default Branch" })).toBeVisible();
  await expect(page.getByText(/^Accessible Branches/).first()).toBeVisible();
  await expect(page.getByText(/Branch \/ Outlet|Accessible Branches \/ Outlets|Default Branch \/ Outlet/)).toHaveCount(0);

  await page.goto("/staffs/new", { waitUntil: "domcontentloaded" });
  const roleSelect = page.getByRole("combobox", { name: "Role" });
  const branchSelect = page.getByRole("combobox", { name: "Default Branch" });
  await expect(roleSelect).toBeVisible();
  await expect(branchSelect).toBeVisible();
  await roleSelect.click();
  await expect(page.getByRole("option")).toHaveText(["Super Admin / Owner", "Finance", "Manager", "Purchasing", "Kitchen", "Outlet Staff"]);
  await page.keyboard.press("Escape");
  await expect(roleSelect).toBeFocused();
  await branchSelect.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(branchSelect).toBeFocused();

  for (const width of widths) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/staffs/new", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/more than one relationship|Application error|Internal Server Error/i);
    const responsiveRoleSelect = page.getByRole("combobox", { name: "Role" });
    await responsiveRoleSelect.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    const bounds = await listbox.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(responsiveRoleSelect).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }

  await page.setViewportSize({ width: 1440, height: 850 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const desktopSidebar = await page.locator("nav").first().evaluate((nav) => {
    const token = getComputedStyle(document.documentElement).getPropertyValue("--sb-sidebar-width").trim();
    return { actual: nav.parentElement.getBoundingClientRect().width, expected: Number.parseFloat(token) * Number.parseFloat(getComputedStyle(document.documentElement).fontSize) };
  });
  expect(desktopSidebar.actual).toBeCloseTo(desktopSidebar.expected, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileSidebar = page.getByRole("dialog", { name: "Application navigation" });
  await expect(mobileSidebar).toBeVisible();
  expect((await mobileSidebar.boundingBox()).width).toBeCloseTo(desktopSidebar.expected, 0);
  await page.getByRole("button", { name: "Close navigation menu" }).last().click();
});

test("canonical FilterBar never owns a vertical scrollbar at supported widths", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!hasAccount("superAdmin"), `Missing Owner credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await login(page, "superAdmin");

  for (const width of widths) {
    await page.setViewportSize({ width, height: 850 });
    for (const route of filterRoutes) {
      await test.step(`${route} at ${width}px`, async () => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("body"), `${route} at ${width}px`).not.toContainText(/Application error|Internal Server Error/i);
        const bar = page.locator(".sb-list-filters").first();
        await expect(bar).toBeVisible();
        const overflow = await bar.evaluate((node) => ({
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          overflowY: getComputedStyle(node).overflowY,
        }));
        expect(overflow.overflowY).not.toBe("auto");
        expect(overflow.overflowY).not.toBe("scroll");
        expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 1);
      });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items", { waitUntil: "domcontentloaded" });
  await page.getByText("More filters", { exact: false }).click();
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Filters" })).toBeHidden();
});
