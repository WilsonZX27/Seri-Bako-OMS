const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.describe("real-device mobile regressions", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await login(page, "superAdmin");
  });

  test("purchase request line keeps comments full-width and docks the action rail without a safe-area gap", async ({ page }) => {
    await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
    const line = page.locator("[data-purchase-request-line]").first();
    await expect(line).toBeVisible();

    const geometry = await page.evaluate(() => {
      const row = document.querySelector("[data-purchase-request-line]");
      const action = document.querySelector("[data-mobile-document-action]");
      if (!row || !action) return null;
      const comment = document.createElement("div");
      comment.className = "col-span-full min-w-0";
      comment.dataset.layoutProbe = "purchase-request-comment";
      row.appendChild(comment);
      const rowRect = row.getBoundingClientRect();
      const commentRect = comment.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const result = {
        rowWidth: rowRect.width,
        commentWidth: commentRect.width,
        commentLeft: commentRect.left - rowRect.left,
        actionBottom: window.innerHeight - actionRect.bottom,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
      comment.remove();
      return result;
    });

    expect(geometry).not.toBeNull();
    expect(geometry.commentWidth).toBeGreaterThan(geometry.rowWidth * 0.85);
    expect(geometry.commentLeft).toBeLessThan(16);
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
