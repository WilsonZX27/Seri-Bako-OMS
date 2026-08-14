const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, requireAccount } = require("./helpers");

const roles = ["superAdmin", "finance", "manager", "purchasing", "kitchen", "outlet"];
const evidence = path.join(process.cwd(), "test-results", "dashboard-current-role-viewport-matrix");

async function measureHorizontalOverflow(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    viewport: { innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth, xl: window.matchMedia("(min-width: 1280px)").matches },
    offenders: [...document.querySelectorAll("body *")]
      .map((node) => ({ node: node.tagName.toLowerCase(), className: typeof node.className === "string" ? node.className.slice(0, 180) : "", right: Math.round(node.getBoundingClientRect().right), width: Math.round(node.getBoundingClientRect().width) }))
      .filter((item) => item.right > document.documentElement.clientWidth + 5 || item.width > document.documentElement.clientWidth + 5)
      .sort((a, b) => b.right - a.right)
      .slice(0, 8),
  }));
}

async function signIn(page, role) {
  const credentials = requireAccount(role);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 });
}

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

for (const role of roles) {
  test(`${role} receives a scoped terminal dashboard`, async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!hasAccount(role), `Missing local-only credentials for ${role}.`);
    const critical = [];
    page.on("console", (message) => { if (message.type() === "error") critical.push(message.text()); });
    page.on("pageerror", (error) => critical.push(error.message));
    await signIn(page, role);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("[data-dashboard-identity]").first()).toContainText(/welcome/i);
    await expect(page.locator("body")).not.toContainText(/Owner Workdesk|Finance Workdesk|Manager Workdesk|Purchasing Workdesk|Kitchen Workdesk|Outlet Today/);
    if (role === "outlet") {
      await expect(page.locator("[data-dashboard-command]")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Today's completion" })).toBeVisible();
      await expect(page.locator("[data-dashboard-quick-actions] a")).toHaveCount(3);
    }

    for (const [width, height, label] of [[390, 844, "mobile"], [820, 1180, "tablet"], [1440, 900, "desktop"]]) {
      await page.setViewportSize({ width, height });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-dashboard-identity]").first()).toContainText(/welcome/i);
      if (role === "outlet") await expect(page.locator("[data-dashboard-command]")).toHaveCount(0);
      const measurement = await measureHorizontalOverflow(page);
      expect(measurement.overflow, `${role} ${label} dashboard must not overflow: ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(5);
      await page.screenshot({ path: path.join(evidence, `${roles.indexOf(role) + 1}-${role}-${label}.png`), fullPage: true });
    }

    if (!["superAdmin", "finance"].includes(role)) {
      await expect(page.locator("body")).not.toContainText(/AP Aging|Cash Flow|aggregate debt|Payment controls/i);
      await page.goto("/supplier-invoices/aging", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/supplier-invoices\/aging$/);
    }
    if (role !== "superAdmin") {
      await page.goto("/administration/backups", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/administration\/backups$/);
    }
    expect(critical.filter((message) => /hydration|server component|uncaught|typeerror|referenceerror/i.test(message))).toEqual([]);
  });
}

test("Dashboard survives partial-data and long-label visual stress states", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only credentials for superAdmin.");
  await signIn(page, "superAdmin");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-dashboard-command]")).toBeVisible();

  await page.evaluate(() => {
    const longName = "Wilson Tan Wei Ming — Regional Operations and Procurement Administrator";
    const longRole = "Super Administrator / Owner with Company-wide Operational Oversight";
    const longScope = "All Seri Bako branches, central kitchen, event outlets, and future operating locations";
    document.querySelectorAll("[data-dashboard-user-name]").forEach((node) => { node.textContent = longName; });
    document.querySelectorAll("[data-dashboard-role-label]").forEach((node) => { node.textContent = longRole; });
    document.querySelectorAll("[data-dashboard-scope-label]").forEach((node) => { node.textContent = longScope; });

    const summary = document.querySelector("[data-dashboard-attention-summary]");
    if (!(summary instanceof HTMLElement)) throw new Error("Attention summary stress target is missing.");
    const value = summary.children.item(1);
    if (!(value instanceof HTMLElement)) throw new Error("Attention value stress target is missing.");
    value.textContent = "Partial data";
    value.setAttribute("aria-label", "Attention summary unavailable because payables and wastage data could not be loaded");
    const detail = document.createElement("p");
    detail.className = "mt-1 max-w-40 text-[11px] leading-4 text-white/85";
    detail.textContent = "Unavailable: payables, wastage";
    summary.append(detail);
  });

  for (const [width, height, label] of [[390, 844, "mobile"], [820, 1180, "tablet"], [1440, 900, "desktop"]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByText("Partial data", { exact: true })).toBeVisible();
    await expect(page.getByText("Unavailable: payables, wastage", { exact: true })).toBeVisible();
    const measurement = await measureHorizontalOverflow(page);
    expect(measurement.overflow, `${label} stress dashboard must not overflow: ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(5);
    await page.screenshot({ path: path.join(evidence, `7-stress-partial-long-label-${label}.png`), fullPage: true });
  }
});
