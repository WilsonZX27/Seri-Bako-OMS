const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidenceDir = path.join(process.cwd(), "test-results", "sprint-7-23-5");

async function assertNoOverflow(page) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client);
}

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

test("idle, expired-link, and unauthenticated states remain distinct", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/access-status?reason=idle-timeout", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Your session ended due to inactivity. Please sign in again.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await expect(page.getByText(/expired|password setup|contact owner/i)).toHaveCount(0);

  await page.goto("/set-password?invite=expired", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Invitation link expired" })).toBeVisible();
  await expect(page.getByText("Your invitation link has expired or was already used.")).toBeVisible();

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login/);
  await page.close();
});

for (const width of [1440, 1024, 768, 390]) {
  test(`PR creation hierarchy is compact at ${width}px`, async ({ browser }) => {
    test.skip(!hasAccount("superAdmin"), "Local owner E2E credentials are required.");
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await login(page, "superAdmin");
    await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });

    const requestDetails = page.getByRole("heading", { name: "Request details" });
    const requestedItems = page.getByText("Requested Items", { exact: true });
    await expect(requestDetails).toBeVisible();
    await expect(requestedItems).toBeVisible();
    await expect(page.getByLabel("Remarks")).toHaveAttribute("rows", "2");
    await expect(page.getByText(/When and where|Additional details/)).toHaveCount(0);

    const [detailsBox, itemsBox] = await Promise.all([requestDetails.boundingBox(), requestedItems.boundingBox()]);
    expect(itemsBox.y - detailsBox.y).toBeLessThan(width === 390 ? 330 : 250);
    await assertNoOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, `01-pr-create-${width}.png`), fullPage: true });
    await page.close();
  });
}

test("urgency select exposes every consistent selected state", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Local owner E2E credentials are required.");
  await login(page, "superAdmin");
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  const urgency = page.getByRole("combobox", { name: "Urgency" });
  await expect(urgency).toContainText("Normal");
  await urgency.click();
  await expect(page.getByRole("option", { name: "Critical" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, "02-urgency-options.png"), fullPage: false });
  await page.keyboard.press("Escape");
  for (const label of ["Critical", "Urgent", "Normal", "Low"]) {
    await urgency.click();
    const option = page.getByRole("option", { name: label });
    await expect(option).toBeVisible();
    await option.click();
    await expect(urgency).toContainText(label);
    await page.screenshot({ path: path.join(evidenceDir, `02-urgency-${label.toLowerCase()}.png`), fullPage: false });
  }
});

test("desktop group labels navigate to canonical workspaces", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Local owner E2E credentials are required.");
  await login(page, "superAdmin");
  for (const [route, heading, evidence] of [["/procurement", "Procurement Workspace", "03-procurement-workspace-desktop.png"], ["/inventory", "Inventory Workspace", "03-inventory-workspace-desktop.png"]]) {
    await page.locator(`nav a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText(/optional location detail|default locations/i)).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, evidence), fullPage: true });
  }
});

test("mobile drawer group labels navigate independently from their chevrons", async ({ browser }) => {
  test.skip(!hasAccount("superAdmin"), "Local owner E2E credentials are required.");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page, "superAdmin");
  for (const [route, heading, label, evidence] of [["/procurement", "Procurement Workspace", "Procurement", "04-procurement-workspace-mobile-390.png"], ["/inventory", "Inventory Workspace", "Inventory", "04-inventory-workspace-mobile-390.png"]]) {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("button", { name: new RegExp(`(Expand|Collapse) ${label}`) })).toBeVisible();
    await drawer.locator(`nav a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText(/optional location detail|default locations/i)).toHaveCount(0);
    await assertNoOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, evidence), fullPage: true });
  }
  await page.close();
});

for (const width of [1440, 768, 390]) {
  test(`Import controls share the canonical typography at ${width}px`, async ({ browser }) => {
    test.skip(!hasAccount("superAdmin"), "Local owner E2E credentials are required.");
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await login(page, "superAdmin");
    await page.goto("/imports/items", { waitUntil: "domcontentloaded" });
    const file = page.locator('input[type="file"]');
    const mode = page.locator("select").filter({ has: page.locator("option") }).first();
    await expect(file).toBeVisible();
    await expect(mode).toBeVisible();
    const styles = await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]');
      const select = document.querySelector("select");
      const fileStyle = getComputedStyle(fileInput);
      const selectStyle = getComputedStyle(select);
      const buttonStyle = getComputedStyle(fileInput, "::file-selector-button");
      return {
        fileFamily: fileStyle.fontFamily,
        selectFamily: selectStyle.fontFamily,
        fileSize: fileStyle.fontSize,
        selectSize: selectStyle.fontSize,
        buttonFamily: buttonStyle.fontFamily,
      };
    });
    expect(styles.fileFamily).toBe(styles.selectFamily);
    expect(styles.fileSize).toBe(styles.selectSize);
    expect(styles.buttonFamily).toBe(styles.selectFamily);
    await assertNoOverflow(page);
    await file.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidenceDir, `05-import-items-${width}.png`), fullPage: true });
    await page.close();
  });
}
