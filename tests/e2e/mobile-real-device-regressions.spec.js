const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.describe("real-device mobile regressions", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await login(page, "superAdmin");
  });

  test("purchase request line keeps search and controls in two deliberate rows without a safe-area gap", async ({ page }) => {
    await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
    const line = page.locator("[data-purchase-request-line]").first();
    await expect(line).toBeVisible();
    const geometry = await page.evaluate(() => {
      const row = document.querySelector("[data-purchase-request-line]");
      const action = document.querySelector("[data-mobile-document-action]");
      const item = row?.querySelector("[data-pr-line-item]");
      const quantity = row?.querySelector(".pr-line-quantity");
      const uom = row?.querySelector(".pr-line-uom");
      const actions = row?.querySelector("[data-pr-line-actions]");
      const quantityControl = quantity?.querySelector("input[name='line_qty']")?.parentElement;
      const uomControl = uom?.querySelector("select[name='line_uom']");
      const commentAction = actions?.querySelector("button[aria-label^='Add comment']");
      const number = row?.querySelector("[data-pr-line-number] > span");
      if (!row || !action || !item || !quantityControl || !uomControl || !actions || !commentAction || !number) return null;
      const rowRect = row.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const quantityRect = quantityControl.getBoundingClientRect();
      const uomRect = uomControl.getBoundingClientRect();
      const commentRect = commentAction.getBoundingClientRect();
      const numberRect = number.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      return {
        rowWidth: rowRect.width,
        itemWidth: itemRect.width,
        itemLeft: itemRect.left,
        itemRight: itemRect.right,
        quantityTop: quantityRect.top,
        uomTop: uomRect.top,
        commentTop: commentRect.top,
        quantityWidth: quantityRect.width,
        quantityLeft: quantityRect.left,
        uomWidth: uomRect.width,
        uomRight: uomRect.right,
        commentWidth: commentRect.width,
        commentHeight: commentRect.height,
        numberWidth: numberRect.width,
        numberHeight: numberRect.height,
        quantityRight: quantityRect.right,
        uomLeft: uomRect.left,
        uomRight: uomRect.right,
        actionsLeft: commentRect.left,
        actionBottom: window.innerHeight - actionRect.bottom,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry.itemWidth).toBeGreaterThan(250);
    expect(Math.abs(geometry.itemLeft - geometry.quantityLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.itemRight - geometry.uomRight)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.quantityTop - geometry.uomTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.quantityTop - geometry.commentTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.quantityWidth - geometry.uomWidth)).toBeLessThanOrEqual(1);
    expect(geometry.commentWidth).toBe(40);
    expect(geometry.commentHeight).toBe(40);
    expect(geometry.numberWidth).toBe(24);
    expect(geometry.numberHeight).toBe(24);
    expect(geometry.quantityRight).toBeLessThanOrEqual(geometry.uomLeft);
    expect(geometry.uomRight).toBeLessThanOrEqual(geometry.actionsLeft);
    expect(Math.abs(geometry.actionBottom)).toBeLessThanOrEqual(1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  });

  test("low-stock basket control remains a visible button above the bottom navigation", async ({ page }) => {
    await page.goto("/low-stock", { waitUntil: "domcontentloaded" });
    const basket = page.getByRole("button", { name: /open pr basket/i });
    await expect(basket).toBeVisible();
    const style = await basket.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { backgroundColor: computed.backgroundColor, color: computed.color };
    });
    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.backgroundColor).not.toBe("transparent");
    expect(style.color).toBe("rgb(255, 255, 255)");
  });

  test("outlet wastage chart keeps every axis label inside its SVG viewport", async ({ page }) => {
    await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
    const chart = page.getByRole("img", { name: /daily wastage percentage/i });
    if (!(await chart.count())) {
      await expect(page.getByText("No completed records in the last 30 days", { exact: true })).toBeVisible();
      return;
    }
    await expect(chart).toBeVisible();
    const labelsFit = await chart.evaluate((svg) => {
      const viewport = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("text")].every((label) => {
        const rect = label.getBoundingClientRect();
        return rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
      });
    });
    expect(labelsFit).toBe(true);
  });
});
