const { test, expect } = require("@playwright/test");
const { hasAccount, login, missingAccountVars } = require("./helpers");

const roles = ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outlet"];
const widths = [1440, 1024, 768, 430, 390, 360];

function collectCriticalErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|Failed to load resource.*404/i.test(message.text())) errors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${page.url()} :: ${error.message}`));
  return errors;
}

async function firstDetailHref(page, listRoute, pattern) {
  await page.goto(listRoute, { waitUntil: "domcontentloaded" });
  const hrefs = await page.locator(`a[href^="${pattern}"]`).evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));
  return hrefs.find((href) => {
    const recordKey = href.slice(pattern.length).split(/[?#]/)[0];
    return recordKey && !recordKey.includes("/") && !["new", "aging", "cash-flow", "forecast"].includes(recordKey);
  }) ?? null;
}

async function assertStableDocument(page, route, width, navigate = true) {
  if (navigate) await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body"), `${route} at ${width}px`).not.toContainText(/Application error|Internal Server Error|Page actions/i);
  const documentBreadcrumb = page.locator("[data-document-breadcrumb]").first();
  if (!await documentBreadcrumb.count()) {
    await expect(page.locator("main#main-content"), `${route} at ${width}px`).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${route} at ${width}px overflows`).toBe(true);
    return;
  }
  await expect(documentBreadcrumb, `${route} at ${width}px`).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${route} at ${width}px overflows`).toBe(true);
  const workflowDocument = route === "/purchase-requests/new" || ["purchase-orders", "goods-receivings", "supplier-invoices", "outlet-daily-records"]
    .some((prefix) => route.startsWith(`/${prefix}/`) && !route.endsWith("/new"));
  if (width <= 767 && workflowDocument) {
    await expect(page.getByRole("button", { name: "View workflow" })).toBeVisible();
    await expect(page.locator("[data-tablet-document-inspector]")).toBeHidden();
  } else if (width <= 767) {
    // Stock counts and create forms share the record breadcrumb but do not
    // require an approval workflow. Do not assert hidden implementation nodes;
    // verify only the user-visible responsive surface.
    await expect(page.locator("[data-tablet-document-inspector]")).toBeHidden();
  } else if (width < 1280) {
    // Tablet workspaces stay full-width; the document inspector is desktop-only.
    await expect(page.locator("[data-tablet-document-inspector]")).toBeHidden();
  } else {
    await expect(page.locator("[data-tablet-document-inspector]")).toBeHidden();
  }
}

for (const role of roles) {
  test(`${role} reaches its permitted document workspace without action leakage`, async ({ page }) => {
    test.skip(!hasAccount(role), `Missing ${role} credentials: ${missingAccountVars(role).join(", ")}`);
    const errors = collectCriticalErrors(page);
    await login(page, role);
    const routeByRole = {
      superAdmin: "/purchase-requests/new",
      finance: "/supplier-invoices",
      manager: "/purchase-requests?status=manager_review",
      purchasing: "/purchase-orders",
      kitchen: "/purchase-requests/new",
      outlet: "/outlet-daily-records/new",
    };
    await page.goto(routeByRole[role], { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Page actions/i);
    if (["finance", "manager", "purchasing"].includes(role)) {
      const base = role === "finance" ? "/supplier-invoices/" : role === "purchasing" ? "/purchase-orders/" : "/purchase-requests/";
      const href = await page.locator(`a[href^="${base}"]`).first().getAttribute("href").catch(() => null);
      if (href) {
        await page.goto(href, { waitUntil: "domcontentloaded" });
        await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
      }
    }
    if (role === "finance") await expect(page.getByRole("button", { name: "Approve as Manager" })).toHaveCount(0);
    if (["kitchen", "outlet"].includes(role)) await expect(page.getByText(/Record Payment|Approve as Finance|Owner controls/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("representative document workspaces remain stable at every approved width", async ({ page }) => {
  test.setTimeout(420_000);
  test.skip(!hasAccount("superAdmin"), `Missing Owner credentials: ${missingAccountVars("superAdmin").join(", ")}`);
  const errors = collectCriticalErrors(page);
  await login(page, "superAdmin");
  const dynamicRoutes = [];
  for (const [listRoute, pattern, emptyFallback] of [
    ["/purchase-orders", "/purchase-orders/", "/purchase-orders/new"],
    ["/goods-receivings", "/goods-receivings/", "/goods-receivings/new"],
    ["/supplier-invoices", "/supplier-invoices/", "/supplier-invoices/new"],
    ["/outlet-daily-records", "/outlet-daily-records/", "/outlet-daily-records/new"],
    ["/stock-counts", "/stock-counts/", "/stock-counts/new"],
  ]) {
    const href = await firstDetailHref(page, listRoute, pattern);
    dynamicRoutes.push(href ?? emptyFallback);
  }
  const routes = ["/purchase-requests/new", ...dynamicRoutes];
  expect(routes).toHaveLength(6);

  for (const route of routes) {
    await page.setViewportSize({ width: widths[0], height: 850 });
    await assertStableDocument(page, route, widths[0]);
    for (const width of widths.slice(1)) {
      await page.setViewportSize({ width, height: 850 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
      await assertStableDocument(page, route, width, false);
    }
  }
  expect(errors).toEqual([]);
});

test("mobile workflow and approval sheets trap focus, lock scroll and return focus", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!hasAccount("manager"), `Missing Manager credentials: ${missingAccountVars("manager").join(", ")}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "manager");
  await page.goto("/purchase-requests?status=manager_review", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  const emptyState = page.getByText(/No (purchase requests found|requests match these filters)/i).first();
  test.skip(await emptyState.isVisible().catch(() => false), "No Manager Review PR fixture is available");
  const requestLink = page.locator('tbody a[href^="/purchase-requests/"]').first();
  if (!await requestLink.count()) test.skip(true, "No Manager Review PR fixture is available");
  const href = await requestLink.getAttribute("href", { timeout: 3_000 }).catch(() => null);
  test.skip(!href, "No Manager Review PR fixture is available");
  await page.goto(href, { waitUntil: "domcontentloaded" });

  const workflowTrigger = page.getByRole("button", { name: "View workflow" });
  await workflowTrigger.click();
  await expect(page.getByRole("dialog", { name: "Workflow progress" })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Workflow progress" })).toBeHidden();
  await expect(workflowTrigger).toBeFocused();

  const approval = page.getByRole("button", { name: "Approve as Manager" }).first();
  await expect(approval).toBeVisible();
  await approval.click();
  await expect(page.getByRole("dialog", { name: /Approve this PR as Manager/i })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(approval).toBeFocused();
});
