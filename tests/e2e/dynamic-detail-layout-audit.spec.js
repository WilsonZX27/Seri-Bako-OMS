const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const viewports = [
  { label: "mobile-320", width: 320, height: 700 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "compact-640", width: 640, height: 900 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "laptop-1024", width: 1024, height: 900 },
  { label: "desktop-1280", width: 1280, height: 960 },
  { label: "desktop-1440", width: 1440, height: 960 },
  { label: "wide-2560", width: 2560, height: 1440 },
];
const sources = [
  ["/branches", "/branches/", 2], ["/document-sequences", "/document-sequences/", 2], ["/documents", "/documents/", 2],
  ["/goods-receivings", "/goods-receivings/", 2], ["/items", "/items/", 2], ["/outlet-daily-records", "/outlet-daily-records/", 2],
  ["/production/jobs", "/production/jobs/", 3], ["/products", "/products/", 2], ["/purchase-orders", "/purchase-orders/", 2],
  ["/purchase-requests", "/purchase-requests/", 2], ["/purchase-returns", "/purchase-returns/", 2], ["/recipes", "/recipes/", 2],
  ["/roles", "/roles/", 2], ["/staffs", "/staffs/", 2], ["/stock-counts", "/stock-counts/", 2],
  ["/stock-transactions", "/stock-transactions/", 2], ["/stock-transfers", "/stock-transfers/", 2], ["/stock-wastage", "/stock-wastage/", 2],
  ["/supplier-invoices", "/supplier-invoices/", 2], ["/supplier-items", "/supplier-items/", 2], ["/suppliers", "/suppliers/", 2],
  ["/uom-conversions", "/uom-conversions/", 2],
];

async function assertBounds(page, route, viewport) {
  await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    controls: Array.from(document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link']")).filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") return false;
      let parent = node.parentElement;
      while (parent) {
        const parentStyle = getComputedStyle(parent);
        if ((parent.classList.contains("sb-table-region") || parent.classList.contains("overflow-x-auto")) && /(auto|scroll)/.test(parentStyle.overflowX)) return false;
        parent = parent.parentElement;
      }
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    }).map((node) => ({ tag: node.tagName, right: node.getBoundingClientRect().right })),
  }));
  expect(result.overflow, `${viewport.label} ${route} must not overflow`).toBeLessThanOrEqual(5);
  expect(result.controls, `${viewport.label} ${route} controls must remain in bounds`).toEqual([]);
}

for (const viewport of viewports) {
  test(`${viewport.label}: populated dynamic detail surfaces stay responsive`, async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
    await login(page, "superAdmin");
    await page.setViewportSize(viewport);
    let covered = 0;
    for (const [listRoute, prefix, depth] of sources) {
      await page.goto(listRoute, { waitUntil: "domcontentloaded" });
      const detail = await page.locator("a[href]").evaluateAll((nodes, args) => nodes.map((node) => {
        try { return new URL(node.getAttribute("href"), window.location.origin).pathname; } catch { return null; }
      }).filter((pathname) => pathname && pathname.startsWith(args.prefix) && pathname.split("/").filter(Boolean).length === args.depth && !pathname.endsWith("/new"))[0] ?? null, { prefix, depth });
      if (!detail) { console.log(`[${viewport.label}] no populated detail link from ${listRoute}`); continue; }
      await page.goto(detail, { waitUntil: "domcontentloaded" });
      await expect.poll(() => page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
        if (!sheet.href?.includes("/_next/static/css/")) return false;
        try { return sheet.cssRules.length > 0; } catch { return false; }
      })), { timeout: 15_000 }).toBe(true);
      await assertBounds(page, detail, viewport);
      covered += 1;
    }
    console.log(`[${viewport.label}] populated dynamic detail surfaces covered: ${covered}`);
    expect(covered, `${viewport.label} should cover at least one populated dynamic detail surface`).toBeGreaterThan(0);
  });
}
