const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const { discoverRouteMatrix } = require("../tests/e2e/v9-route-matrix.cjs");

const baseUrl = process.env.AUDIT_BASE_URL || "http://localhost:3210";
const target = new URL(baseUrl);
if (!["localhost", "127.0.0.1"].includes(target.hostname)) {
  throw new Error("Control geometry audit is restricted to a local mock server.");
}
const requestedRoutes = process.env.AUDIT_ROUTES?.split(",").map((route) => route.trim()).filter(Boolean);
const routes = discoverRouteMatrix().filter((entry) => !entry.public && !entry.route.includes("00000000") && (!requestedRoutes || requestedRoutes.includes(entry.route)));
const allViewports = [
  { label: "small-phone", width: 320, height: 700 },
  { label: "phone", width: 390, height: 844 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
];
const requestedViewports = process.env.AUDIT_VIEWPORTS?.split(",").map((viewport) => viewport.trim()).filter(Boolean);
const viewports = allViewports.filter((viewport) => !requestedViewports || requestedViewports.includes(viewport.label));
const output = path.resolve(process.env.AUDIT_OUTPUT || path.join(process.cwd(), "test-results", "control-geometry-audit.json"));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const entry of routes) {
      errors.length = 0;
      const start = Date.now();
      try {
        const response = await page.goto(`${baseUrl}${entry.route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.evaluate(() => document.fonts?.ready).catch(() => {});
        await page.waitForTimeout(120);
        const measure = () => page.evaluate(() => {
          const visible = (node) => {
            const r = node.getBoundingClientRect();
            const s = getComputedStyle(node);
            return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.pointerEvents !== "none" && !node.classList.contains("sr-only") && node.getAttribute("aria-hidden") !== "true";
          };
          const controls = [...document.querySelectorAll("button,[role=button],input:not([type=hidden]),select,textarea,summary,a")]
            .filter(visible).map((node) => {
              const r = node.getBoundingClientRect();
              return { tag: node.tagName.toLowerCase(), label: (node.getAttribute("aria-label") || node.textContent || node.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 60), width: Math.round(r.width), height: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), className: String(node.className).slice(0, 120) };
            });
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            controls: controls.filter((node) => node.x >= -1 && node.x < innerWidth && node.y >= -1 && node.y < innerHeight),
            heading: document.querySelector("main h1")?.textContent?.trim() || null,
            errorBoundary: document.body.innerText.includes("This workspace could not finish the request"),
          };
        });
        let measured;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await page.waitForFunction(() => document.documentElement && document.body, undefined, { timeout: 5000 });
            measured = await measure();
            break;
          } catch (error) {
            if (attempt === 2 || !/Execution context was destroyed|Cannot read properties of null/.test(String(error))) throw error;
            await page.waitForLoadState("domcontentloaded").catch(() => {});
            await page.waitForTimeout(100);
          }
        }
        results.push({ viewport: viewport.label, route: entry.route, status: response?.status(), landed: new URL(page.url()).pathname, ms: Date.now() - start, errors: [...errors], ...measured });
      } catch (error) {
        results.push({ viewport: viewport.label, route: entry.route, failed: String(error), ms: Date.now() - start });
      }
      if (results.length % 20 === 0) console.log(`Audited ${results.length}/${routes.length * viewports.length}`);
    }
    await page.close();
  }
  await browser.close();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ date: new Date().toISOString(), baseUrl, results }, null, 2));
  const problems = results.filter((row) => row.failed || row.errors?.length || row.overflow > 5 || row.errorBoundary);
  const undersized = results.flatMap((row) => (row.controls || []).filter((control) => ["small-phone", "phone"].includes(row.viewport) && control.tag !== "a" && (control.width < 44 || control.height < 44)).map((control) => ({ viewport: row.viewport, route: row.route, ...control })));
  console.log(JSON.stringify({ routes: routes.length, pages: results.length, problems: problems.length, navigationFailures: results.filter((row) => row.failed).length, errorBoundaries: results.filter((row) => row.errorBoundary).length, overflowPages: results.filter((row) => row.overflow > 5).length, undersized: undersized.length, output }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
