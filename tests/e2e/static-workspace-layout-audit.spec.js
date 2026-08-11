const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "static-workspace-layout-audit");
const workspaces = [
  "/account", "/activity", "/administration", "/administration/backups", "/administration/imports", "/administration/master-data-cleanup",
  "/branches", "/branches/new", "/company", "/daily-operations", "/dashboard", "/data-onboarding", "/documents",
  "/document-sequences", "/document-sequences/new", "/goods-receivings", "/goods-receivings/new", "/imports", "/inventory",
  "/items", "/items/new", "/low-stock", "/opening-stock/import", "/outlet-daily-records", "/outlet-daily-records/new",
  "/procurement", "/procurement/purchase-requests", "/production", "/production/jobs", "/production/jobs/new", "/production/planning",
  "/production/variance", "/products", "/products/new", "/purchase-orders", "/purchase-orders/new", "/purchase-requests",
  "/purchase-requests/new", "/purchase-returns", "/purchase-returns/new", "/quick-tools", "/recipes", "/recipes/new", "/reports",
  "/reports/costing-readiness", "/reports/demand-trends", "/reports/procurement-variance", "/reports/product-margin", "/reports/recipe-costing",
  "/roles", "/roles/new", "/settings", "/settings/backups", "/staffs", "/staffs/new", "/stock-balance", "/stock-balances", "/stock-card",
  "/stock-counts", "/stock-counts/new", "/stock-transactions", "/stock-transactions/new", "/stock-transfers", "/stock-transfers/new",
  "/stock-wastage", "/stock-wastage/new", "/supplier-invoices", "/supplier-invoices/aging", "/supplier-invoices/cash-flow", "/supplier-invoices/new",
  "/supplier-items", "/supplier-items/new", "/suppliers", "/suppliers/new", "/uom-conversions", "/uom-conversions/new",
];

const viewports = [
  { label: "mobile-320", width: 320, height: 700 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "compact-640", width: 640, height: 900 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "tablet-820", width: 820, height: 1180 },
  { label: "laptop-1024", width: 1024, height: 900 },
  { label: "desktop-1180", width: 1180, height: 820 },
  { label: "desktop-1280", width: 1280, height: 960 },
  { label: "desktop-1440", width: 1440, height: 960 },
  { label: "wide-2560", width: 2560, height: 1440 },
];

function selectedValues(value) {
  return new Set(String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
}

const routeSelection = selectedValues(process.env.STATIC_WORKSPACE_ROUTES);
const viewportSelection = selectedValues(process.env.STATIC_WORKSPACE_VIEWPORTS);
const captureScreenshots = process.env.STATIC_WORKSPACE_SCREENSHOTS === "1";
const auditedWorkspaces = routeSelection.size ? workspaces.filter((route) => routeSelection.has(route)) : workspaces;
const auditedViewports = viewportSelection.size ? viewports.filter((viewport) => viewportSelection.has(viewport.label)) : viewports;

if (routeSelection.size && !auditedWorkspaces.length) throw new Error("STATIC_WORKSPACE_ROUTES did not match a canonical workspace.");
if (viewportSelection.size && !auditedViewports.length) throw new Error("STATIC_WORKSPACE_VIEWPORTS did not match a configured viewport.");

async function hasGlobalStyles(page) {
  try {
    return await page.evaluate(() => Array.from(document.styleSheets).some((sheet) => {
      if (!sheet.href?.includes("/_next/static/css/")) return false;
      try {
        return sheet.cssRules.length > 0;
      } catch {
        return false;
      }
    }));
  } catch (error) {
    if (/Execution context was destroyed/.test(String(error))) return false;
    throw error;
  }
}

async function pageOverflow(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    } catch (error) {
      if (!/Execution context was destroyed/.test(String(error)) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(150);
    }
  }
  throw new Error("Page did not stabilize for overflow measurement.");
}

async function navigateToWorkspace(page, route) {
  try {
    await page.goto(route, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!/net::ERR_ABORTED/.test(String(error))) throw error;
    await page.waitForLoadState("domcontentloaded");
  }
  expect(new URL(page.url()).pathname, `${route} must not redirect an owner to sign-in`).not.toBe("/login");
}

async function assertNoApplicationError(page, route) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      expect(await page.getByText("This page could not load", { exact: true }).count(), `${route} must not render the application error page`).toBe(0);
      return;
    } catch (error) {
      if (!/Execution context was destroyed/.test(String(error)) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(150);
    }
  }
}

async function assertInteractiveBounds(page, route, viewport) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const outOfBounds = await page.evaluate(() => Array.from(document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link']"))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          const style = getComputedStyle(node);
          if (style.visibility === "hidden" || style.display === "none") return false;
          // A dense table is allowed to scroll inside its own contained region; it
          // must not make the document viewport scroll horizontally.
          let parent = node.parentElement;
          while (parent) {
            const parentStyle = getComputedStyle(parent);
            if ((parent.classList.contains("sb-table-region") || parent.classList.contains("overflow-x-auto")) && /(auto|scroll)/.test(parentStyle.overflowX)) return false;
            parent = parent.parentElement;
          }
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        })
        .map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 80), left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
      expect(outOfBounds, `${viewport.label} ${route} interactive controls must remain inside the viewport`).toEqual([]);
      return;
    } catch (error) {
      if (!/Execution context was destroyed/.test(String(error)) || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(150);
    }
  }
}

fs.mkdirSync(evidence, { recursive: true });

test.describe("static workspace layout audit", () => {
  // The audit intentionally walks one authenticated session through every
  // workspace. Running all eight viewport sessions in parallel overwhelms
  // the local Next/Supabase fixture and produces navigation errors unrelated
  // to the page under review, so keep the evidence run deterministic.
  test.describe.configure({ mode: "serial" });

  for (const viewport of auditedViewports) {
    test(`${viewport.label}: canonical static workspaces load styled and without viewport overflow`, async ({ page }) => {
      test.setTimeout(10 * 60_000);
      test.skip(!hasAccount("superAdmin"), "Missing local-only Super Admin credentials.");
      await login(page, "superAdmin");
    await page.setViewportSize(viewport);
    for (const route of auditedWorkspaces) {
      await navigateToWorkspace(page, route);
      await expect.poll(() => hasGlobalStyles(page), { timeout: 15_000 }).toBe(true);
      await assertNoApplicationError(page, route);
      const overflow = await pageOverflow(page);
      expect(overflow, `${viewport.label} ${route} must not cause page-level horizontal overflow`).toBeLessThanOrEqual(5);
      await assertInteractiveBounds(page, route, viewport);
      if (captureScreenshots || viewport.label === "mobile-390") {
        const safeName = route === "/" ? "root" : route.slice(1).replaceAll("/", "--");
        await page.screenshot({ path: path.join(evidence, `${viewport.label}--${safeName}.png`), fullPage: true });
      }
      console.log(`[${viewport.label}] ${route}`);
    }
    });
  }
});
