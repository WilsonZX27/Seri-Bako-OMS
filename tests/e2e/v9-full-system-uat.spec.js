const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");
const {
  discoverRouteMatrix,
  requireFreshProductionLikeClone,
  roles,
  viewports,
} = require("./v9-route-matrix.cjs");

const fullMode = process.env.RUN_V9_FULL_UAT === "1";
const localPreflightMode = process.env.RUN_V9_LOCAL_UAT === "1";
const enabled = fullMode || localPreflightMode;
if (fullMode) requireFreshProductionLikeClone();
if (localPreflightMode) {
  const target = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || process.env.RUN_TENANT_BOUNDARY_E2E !== "1") {
    throw new Error("v9 local preflight is restricted to the explicitly enabled local app and Supabase fixture.");
  }
}

function selected(rawValue) {
  return new Set(String(rawValue ?? "").split(",").map((value) => value.trim()).filter(Boolean));
}

const roleSelection = selected(process.env.V9_UAT_ROLES);
const viewportSelection = selected(process.env.V9_UAT_VIEWPORTS);
const routeSelection = selected(process.env.V9_UAT_ROUTES);
const surfaceSelection = process.env.V9_UAT_SURFACE?.trim() || "all";
if (!["all", "app", "public"].includes(surfaceSelection)) throw new Error("V9_UAT_SURFACE must be all, app, or public.");
const includeApp = surfaceSelection !== "public";
const includePublic = surfaceSelection !== "app";
const auditedRoles = roleSelection.size ? roles.filter((role) => roleSelection.has(role)) : roles;
const auditedViewports = viewportSelection.size ? viewports.filter((viewport) => viewportSelection.has(viewport.label)) : viewports;
const discoveredRoutes = discoverRouteMatrix();
const appRoutes = discoveredRoutes.filter((entry) => !entry.public && (!routeSelection.size || routeSelection.has(entry.route)));
const publicRoutes = discoveredRoutes.filter((entry) => entry.public && (!routeSelection.size || routeSelection.has(entry.route)));
const evidence = path.join(process.cwd(), "test-results", "v9-full-system-uat");

if (roleSelection.size && !auditedRoles.length) throw new Error("V9_UAT_ROLES did not match a canonical role.");
if (viewportSelection.size && !auditedViewports.length) throw new Error("V9_UAT_VIEWPORTS did not match a canonical viewport.");
if (routeSelection.size && !appRoutes.length && !publicRoutes.length) throw new Error("V9_UAT_ROUTES did not match a canonical route.");

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function navigate(page, route) {
  try {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    if (!/net::ERR_ABORTED|Execution context was destroyed/.test(String(error))) throw error;
    await page.waitForLoadState("domcontentloaded");
  }
}

async function assertApplicationHealth(page, context) {
  await expect(page.getByText("This page could not load", { exact: true }), `${context} must not render the application error boundary`).toHaveCount(0);
  await expect(page.getByText(/Unhandled Runtime Error|Application error: a client-side exception/i), `${context} must not expose a framework error`).toHaveCount(0);
}

async function waitForCraftSettle(page) {
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".sb-table-region")).every((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return true;
    if (node.scrollWidth <= node.clientWidth + 2) return true;
    return ["start", "middle", "end"].includes(node.getAttribute("data-overflow-state") ?? "");
  }), undefined, { timeout: 1_000 }).catch(() => {});
}

async function inspectCraft(page, viewport) {
  return page.evaluate(({ mobile }) => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const withinContainedHorizontalScroll = (node) => {
      let current = node.parentElement;
      while (current) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 1) return true;
        current = current.parentElement;
      }
      return false;
    };
    const controls = Array.from(document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link']"))
      .filter(visible)
      // Radix keeps native form controls in the DOM for form submission, but
      // marks them aria-hidden and delegates interaction to its named trigger.
      .filter((node) => node.getAttribute("aria-hidden") !== "true");
    const fileInputProxy = (node) => {
      if (!node.matches("input[type='file']")) return null;
      if (node.closest("label")) return node.closest("label");
      const id = node.getAttribute("id");
      return id ? document.querySelector(`label[for='${CSS.escape(id)}']`) : null;
    };
    const iconButtons = Array.from(document.querySelectorAll("button,[role='button']")).filter(visible).filter((node) => {
      const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return !text && !node.getAttribute("aria-label") && !node.getAttribute("title");
    });
    const outOfBounds = controls.filter((node) => {
      if (node.getAttribute("aria-hidden") === "true") return false;
      const style = getComputedStyle(node);
      if (style.pointerEvents === "none" && node.tabIndex < 0) return false;
      const rect = node.getBoundingClientRect();
      return !withinContainedHorizontalScroll(node) && (rect.left < -1 || rect.right > window.innerWidth + 1);
    });
    const undersized = mobile ? controls.filter((node) => {
      if (node.matches("a:not([role='button']), input[type='checkbox'], input[type='radio']")) return false;
      const rect = node.getBoundingClientRect();
      // A native file input can itself be the practical target. Only fall
      // back to its visible label when the input is visually collapsed.
      if (node.matches("input[type='file']") && rect.width >= 36 && rect.height >= 36) return false;
      const proxy = fileInputProxy(node);
      if (proxy && visible(proxy)) {
        const proxyRect = proxy.getBoundingClientRect();
        return proxyRect.width < 36 || proxyRect.height < 36;
      }
      return rect.width < 36 || rect.height < 36;
    }) : [];
    const heavyHeadings = Array.from(document.querySelectorAll("h1,h2,h3")).filter(visible).filter((node) => Number.parseInt(getComputedStyle(node).fontWeight, 10) > 600);
    const oversizedHeadings = Array.from(document.querySelectorAll("h1,h2,h3")).filter(visible).filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) > (mobile ? 26 : 34));
    const verboseCopy = Array.from(document.querySelectorAll("main p,main li")).filter(visible).filter((node) => {
      if (node.closest("[role='alert'],dialog,[data-document-timeline]")) return false;
      return (node.textContent?.replace(/\s+/g, " ").trim().length ?? 0) > 260;
    });
    const tableRegions = Array.from(document.querySelectorAll(".sb-table-region")).filter(visible);
    // Match the shared Table authority's 2px rounding tolerance. Anything
    // larger is meaningful hidden overflow and must expose an edge affordance.
    const unhintedHorizontalScroll = tableRegions
      .filter((node) => node.scrollWidth > node.clientWidth + 2 && !["start", "middle", "end"].includes(node.getAttribute("data-overflow-state") ?? ""))
      .map((node) => ({
        label: node.getAttribute("aria-label"),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        state: node.getAttribute("data-overflow-state"),
      }));
    const visibleNativeScrollbar = tableRegions.filter((node) => getComputedStyle(node).scrollbarWidth !== "none");
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      iconButtons: iconButtons.map((node) => node.outerHTML.slice(0, 180)),
      outOfBounds: outOfBounds.map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 60), left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })),
      undersized: undersized.map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 60), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
      heavyHeadings: heavyHeadings.map((node) => ({ text: node.textContent?.trim().slice(0, 80), weight: getComputedStyle(node).fontWeight })),
      oversizedHeadings: oversizedHeadings.map((node) => ({ text: node.textContent?.trim().slice(0, 80), size: getComputedStyle(node).fontSize })),
      verboseCopy: verboseCopy.map((node) => node.textContent?.replace(/\s+/g, " ").trim().slice(0, 280)),
      unhintedHorizontalScroll,
      visibleNativeScrollbar: visibleNativeScrollbar.length,
    };
  }, { mobile: viewport.width < 640 });
}

function assertCraft(result, context) {
  expect(result.overflow, `${context} must not create document-level horizontal overflow`).toBeLessThanOrEqual(5);
  expect(result.iconButtons, `${context} icon-only controls need an accessible name`).toEqual([]);
  expect(result.outOfBounds, `${context} controls must remain inside the viewport or an intentional contained scroller`).toEqual([]);
  expect(result.undersized, `${context} mobile controls need a practical touch target`).toEqual([]);
  expect(result.heavyHeadings, `${context} headings must use the approved regular/medium hierarchy`).toEqual([]);
  expect(result.oversizedHeadings, `${context} headings must preserve operational density`).toEqual([]);
  expect(result.verboseCopy, `${context} must not carry essay-like explanatory copy in the primary workspace`).toEqual([]);
  expect(result.unhintedHorizontalScroll, `${context} hidden scrollbars require an edge affordance`).toEqual([]);
  expect(result.visibleNativeScrollbar, `${context} must honor the approved hidden-scrollbar design decision`).toBe(0);
}

fs.mkdirSync(evidence, { recursive: true });

test.describe("v9 full-system authenticated UAT", () => {
  test.skip(!enabled, "Set RUN_V9_LOCAL_UAT=1 for local preflight or RUN_V9_FULL_UAT=1 after preparing the sanitized Production-like clone.");

  for (const role of includeApp ? auditedRoles : []) {
    for (const viewport of auditedViewports) {
      test(`${role} · ${viewport.label} · route, access, craft, motion and runtime matrix`, async ({ page }) => {
        test.setTimeout(45 * 60_000);
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await login(page, role);
        const runtimeFailures = [];
        const matrixFailures = [];
        page.on("pageerror", (error) => runtimeFailures.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          const source = message.location().url;
          if (message.text().includes("ERR_NETWORK_ACCESS_DENIED") && source.includes("/storage/v1/object/public/company-assets/")) return;
          runtimeFailures.push(`console: ${message.text()}${source ? ` (${source})` : ""}`);
        });

        for (const entry of appRoutes) {
          runtimeFailures.length = 0;
          try {
            await navigate(page, entry.route);
            await assertApplicationHealth(page, `${role} ${viewport.label} ${entry.route}`);
            const pathname = new URL(page.url()).pathname;
            const permitted = entry.permittedRoles.includes(role);
            if (permitted) {
              expect(pathname, `${role} should not be sent to an access or login page for ${entry.route}`).not.toMatch(/^\/(?:login|access-status)$/);
              await waitForCraftSettle(page);
              const craft = await inspectCraft(page, viewport);
              assertCraft(craft, `${role} ${viewport.label} ${entry.route}`);
            } else {
              const deniedInPlace = await page.getByText(/do not have (?:access|permission)|not available|could not be found/i).count();
              const denialCopy = await page.locator("main").innerText().catch(() => "");
              expect(pathname === "/access-status" || deniedInPlace > 0, `${role} must fail closed for ${entry.route}; landed on ${pathname}; visible copy: ${denialCopy.replace(/\s+/g, " ").slice(0, 180)}`).toBe(true);
            }
            await page.waitForTimeout(80);
            expect(runtimeFailures, `${role} ${viewport.label} ${entry.route} must not emit browser errors`).toEqual([]);
          } catch (error) {
            matrixFailures.push(`${entry.route}: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            if (role === "superAdmin") {
              const safeRoute = entry.route.replace(/^\//, "").replaceAll("/", "--") || "root";
              await page.screenshot({ path: path.join(evidence, `${viewport.label}--${safeRoute}.png`), fullPage: true });
            }
          }
        }
        expect(matrixFailures, `${role} ${viewport.label} route matrix failures`).toEqual([]);
      });
    }
  }

  for (const viewport of includePublic ? auditedViewports : []) {
    test(`public auth surfaces · ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const entry of publicRoutes) {
        await navigate(page, entry.route);
        await assertApplicationHealth(page, `${viewport.label} ${entry.route}`);
        await waitForCraftSettle(page);
        const craft = await inspectCraft(page, viewport);
        assertCraft(craft, `${viewport.label} ${entry.route}`);
      }
    });
  }
});
