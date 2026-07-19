const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const evidenceDir = path.join(process.cwd(), "test-results", "sprint-7-23-5-1");

async function expectNoOverflow(page) {
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
}

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

for (const width of [1440, 1024, 768, 430, 390, 360]) {
  test(`filtered PR list and Daily Record remain stable at ${width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: width <= 430 ? 844 : 900 } });
    const critical = [];
    page.on("pageerror", (error) => critical.push(error.message));

    await page.goto("/purchase-requests?status=in_review", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Purchase Requests" })).toBeVisible();
    await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
    await expect(page.getByLabel("Priority")).toBeVisible();
    await expectNoOverflow(page);

    await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "New Outlet Daily Record" })).toBeVisible();
    await expect(page.getByText("Page actions", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Central Kitchen records Qty Sent/).first()).toBeVisible();
    await expect(page.locator("form table")).toHaveCount(0);
    await expect(page.getByLabel("Record Remarks")).toHaveAttribute("rows", "2");
    await expectNoOverflow(page);
    expect(critical).toEqual([]);
    await page.screenshot({ path: path.join(evidenceDir, `daily-record-${width}.png`), fullPage: true });
    await page.close();
  });
}

test("Import has no generic mobile Page actions footer", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("/imports/items", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Page actions", { exact: true })).toHaveCount(0);
  await expectNoOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, "import-no-page-actions-390.png"), fullPage: true });
  await page.close();
});

test("Owner recipe route remains available in the local UI", async ({ page }) => {
  await page.goto("/recipes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Recipe / BOM" })).toBeVisible();
  await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
});
