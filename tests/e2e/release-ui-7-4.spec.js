const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, login, missingAccountVars } = require("./helpers");

const evidenceDir = path.join(process.cwd(), "test-results", "release-ui-7-4");
const mobileViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const representativeRoutes = [
  "/dashboard",
  "/items",
  "/purchase-requests",
  "/purchase-requests/new",
  "/stock-balance",
  "/staffs",
  "/roles",
  "/company",
  "/branches",
  "/locations",
];

async function assertNoPageOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, `page width ${dimensions.document}px must fit ${dimensions.viewport}px viewport`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function assertNamedButtons(page) {
  const unnamed = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons.filter((button) => !(button.getAttribute("aria-label") || button.getAttribute("title") || button.textContent.trim())).length,
  );
  expect(unnamed, "every visible button must have an accessible name").toBe(0);
}

async function assertMobileControls(page) {
  const undersized = await page.locator("button:visible:not([aria-label='Open Next.js Dev Tools']), input:visible, select:visible, textarea:visible, summary:visible").evaluateAll((controls) =>
    controls
      .map((control) => {
        const box = control.getBoundingClientRect();
        return { name: control.getAttribute("aria-label") || control.textContent.trim() || control.getAttribute("name"), width: box.width, height: box.height };
      })
      .filter((control) => control.width < 44 || control.height < 44),
  );
  expect(undersized, `undersized mobile controls: ${JSON.stringify(undersized)}`).toEqual([]);
}

test.beforeAll(() => fs.mkdirSync(evidenceDir, { recursive: true }));

for (const viewport of mobileViewports) {
  test(`login is stable and usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "username");
    await expect(page.locator('input[name="password"]')).toHaveAttribute("autocomplete", "current-password");
    await assertNoPageOverflow(page);
    await assertNamedButtons(page);
    await assertMobileControls(page);
    await page.screenshot({ path: path.join(evidenceDir, `login-${viewport.width}x${viewport.height}.png`), fullPage: true });
  });
}

test("login acknowledges one submit immediately", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("invalid@example.com");
  await page.locator('input[name="password"]').fill("not-a-valid-password");
  const submit = page.getByRole("button", { name: "Sign in" });
  let actionRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/login")) actionRequests += 1;
  });
  await submit.click();
  await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Signing in…" })).toHaveAttribute("aria-busy", "true");
  await page.waitForURL(/\/login\?error=/, { timeout: 20_000 });
  expect(actionRequests).toBe(1);
});

test("authenticated mobile shell keeps navigation and context reachable", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "superAdmin");
  await assertNoPageOverflow(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("dialog", { name: "Application navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Application navigation" })).toHaveCount(0);
  await page.getByRole("button", { name: "Actions & context" }).click();
  await expect(page.getByRole("dialog", { name: "Actions & context" })).toBeVisible();
  await page.keyboard.press("Escape");
  await assertNamedButtons(page);
  await assertMobileControls(page);
  await page.screenshot({ path: path.join(evidenceDir, "shell-mobile-390x844.png"), fullPage: true });
  for (const route of ["/items", "/purchase-requests/new", "/company"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await assertNoPageOverflow(page);
    await assertNamedButtons(page);
  }
  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(evidenceDir, "form-purchase-request-390x844.png"), fullPage: true });
});

test("shell switches between drawer and persistent console at release widths", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 768, height: 1024 });
  await login(page, "superAdmin");
  const viewports = [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertNoPageOverflow(page);
    const persistentConsole = page.locator("[data-right-console]");
    const contextTrigger = page.getByRole("button", { name: "Actions & context" });
    if (viewport.width >= 1280) {
      await expect(persistentConsole).toBeVisible();
      await expect(contextTrigger).toBeHidden();
    } else {
      await expect(persistentConsole).toBeHidden();
      await expect(contextTrigger).toBeVisible();
    }
    if ([1024, 1280, 1440].includes(viewport.width)) {
      await page.screenshot({ path: path.join(evidenceDir, `shell-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
});

test("representative release routes have no page overflow or indefinite loading", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");
  for (const route of representativeRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error/i);
    await expect(page.locator("body")).not.toContainText(/Loading data\.\.\./i, { timeout: 10_000 });
    await assertNoPageOverflow(page);
    await assertNamedButtons(page);
    for (const table of await page.locator("table").all()) {
      const headers = (await table.locator("thead th").allTextContents()).map((header) => header.trim()).filter(Boolean);
      const actionIndex = headers.findIndex((header) => /^actions?$/i.test(header));
      if (actionIndex >= 0) expect(actionIndex, `${route} row action must be the final table column`).toBe(headers.length - 1);
    }
    const evidenceNames = {
      "/dashboard": "app-shell-desktop",
      "/items": "list-items",
      "/purchase-requests": "list-purchase-requests",
      "/purchase-requests/new": "form-purchase-request",
      "/company": "document-company",
    };
    if (evidenceNames[route]) await page.screenshot({ path: path.join(evidenceDir, `${evidenceNames[route]}-1440x900.png`), fullPage: true });
  }
  await expect(page.locator("[data-right-console]")).toBeVisible();
});

test("records local development route timings without inventing production metrics", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), `Missing super admin credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "superAdmin");
  const measurements = [];
  for (const route of ["/dashboard", "/items", "/purchase-requests", "/stock-balance", "/company"]) {
    const started = Date.now();
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const elapsedMs = Date.now() - started;
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0];
      if (!entry) return null;
      return {
        ttfbMs: Math.round(entry.responseStart),
        domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
        transferSize: entry.transferSize,
      };
    });
    measurements.push({ route, status: response?.status() ?? null, elapsedMs, ...navigation });
  }
  fs.writeFileSync(path.join(evidenceDir, "local-dev-route-metrics.json"), `${JSON.stringify({ environment: "local Next.js development server; not production", measuredAt: new Date().toISOString(), measurements }, null, 2)}\n`);
});
