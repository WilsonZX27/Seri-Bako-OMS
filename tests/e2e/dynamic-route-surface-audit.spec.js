const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const missingId = "00000000-0000-4000-8000-000000000000";
const routes = [
  `/branches/${missingId}`, `/document-sequences/${missingId}`, `/documents/${missingId}`, `/goods-receivings/${missingId}`,
  `/imports/items`, `/items/${missingId}`, `/outlet-daily-records/${missingId}`, `/production/jobs/${missingId}`,
  `/products/${missingId}`, `/purchase-orders/${missingId}`, `/purchase-requests/${missingId}`, `/purchase-returns/${missingId}`,
  `/recipes/${missingId}`, `/recipes/${missingId}/edit`, `/staffs/${missingId}`, `/stock-counts/${missingId}`,
  `/stock-transactions/${missingId}`, `/stock-transfers/${missingId}`, `/stock-wastage/${missingId}`, `/supplier-invoices/${missingId}`,
  `/supplier-items/${missingId}`, `/suppliers/${missingId}`, `/uom-conversions/${missingId}`,
];
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
const viewportSelection = new Set(String(process.env.DYNAMIC_ROUTE_VIEWPORTS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const auditedViewports = viewportSelection.size ? viewports.filter(({ label }) => viewportSelection.has(label)) : viewports;

if (viewportSelection.size && !auditedViewports.length) throw new Error("DYNAMIC_ROUTE_VIEWPORTS did not match a configured viewport.");

for (const viewport of auditedViewports) {
  test(`${viewport.label}: dynamic not-found surfaces remain responsive`, async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
    await login(page, "superAdmin");
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect.poll(() => page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
        if (!sheet.href?.includes("/_next/static/css/")) return false;
        try { return sheet.cssRules.length > 0; } catch { return false; }
      })), { timeout: 15_000 }).toBe(true);
      await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        controls: Array.from(document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link']")).filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          if (node.classList.contains("sr-only") || rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") return false;
          if (node.getAttribute("aria-hidden") === "true") return false;
          if (style.pointerEvents === "none" && node.tabIndex < 0) return false;
          let parent = node.parentElement;
          while (parent) {
            const parentStyle = getComputedStyle(parent);
            if ((parent.classList.contains("sb-table-region") || parent.classList.contains("overflow-x-auto")) && /(auto|scroll)/.test(parentStyle.overflowX)) return false;
            parent = parent.parentElement;
          }
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        }).map((node) => ({
          tag: node.tagName,
          right: node.getBoundingClientRect().right,
          label: node.getAttribute("aria-label") || node.textContent?.trim().replace(/\s+/g, " ").slice(0, 80),
        })),
      }));
      expect(result.overflow, `${viewport.label} ${route} must not overflow`).toBeLessThanOrEqual(5);
      expect(result.controls, `${viewport.label} ${route} controls must remain in bounds`).toEqual([]);
    }
  });
}
