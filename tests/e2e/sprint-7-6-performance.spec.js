const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("records representative route latency without inventing server metrics", async ({ page }) => {
  test.setTimeout(180_000);
  expect(await login(page, "superAdmin")).toBe(true);

  const routes = ["/dashboard", "/procurement", "/purchase-requests", "/purchase-orders", "/suppliers", "/items", "/staffs"];
  const detailLists = ["/purchase-requests", "/purchase-orders", "/suppliers", "/items", "/staffs"];
  for (const list of detailLists) {
    await page.goto(list, { waitUntil: "domcontentloaded" });
    const detail = await page.locator(`a[href^="${list}/"][aria-label^="Open "]`).first().getAttribute("href").catch(() => null);
    if (detail) routes.push(detail);
  }

  const metrics = [];
  for (const route of routes) {
    for (const run of ["first", "warm"]) {
      const started = Date.now();
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      const visualMs = Date.now() - started;
      const timing = response?.request().timing();
      metrics.push({
        route,
        run,
        visualMs,
        responseStartMs: timing && timing.responseStart >= 0 ? Math.round(timing.responseStart) : null,
        responseEndMs: timing && timing.responseEnd >= 0 ? Math.round(timing.responseEnd) : null,
      });
    }
  }

  console.log(`SPRINT_7_6_ROUTE_METRICS ${JSON.stringify(metrics)}`);
});

test("records hosting response evidence", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const headers = await response.allHeaders();
  console.log(`SPRINT_7_6_HOSTING_HEADERS ${JSON.stringify({
    age: headers.age ?? null,
    cache: headers["x-vercel-cache"] ?? null,
    id: headers["x-vercel-id"] ?? null,
    serverTiming: headers["server-timing"] ?? null,
  })}`);
});
