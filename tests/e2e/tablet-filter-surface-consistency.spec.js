const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { hasAccount, requireAccount } = require("./helpers");

const evidence = path.join(process.cwd(), "test-results", "tablet-filter-surface-consistency");
const routes = ["/purchase-requests", "/goods-receivings", "/stock-counts"];

async function signIn(page) {
  const credentials = requireAccount("superAdmin");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 });
}

test.beforeAll(() => fs.mkdirSync(evidence, { recursive: true }));

test("tablet list filters use one two-row grammar without an outer card", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only credentials for superAdmin.");
  await page.setViewportSize({ width: 820, height: 1180 });
  await signIn(page);

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const form = page.locator('form[data-unified-list-desktop="true"]').first();
    await expect(form).toBeVisible();
    const formHeight = await form.evaluate((node) => Math.round(node.getBoundingClientRect().height));
    expect(formHeight, `${route} query card must remain a two-row tablet surface`).toBeLessThanOrEqual(120);

    const outerSurface = page.locator("[data-tablet-main-list]").first();
    const outerStyle = await outerSurface.evaluate((node) => {
      const style = getComputedStyle(node);
      return { boxShadow: style.boxShadow, borderTopWidth: style.borderTopWidth, backgroundColor: style.backgroundColor };
    });
    expect(outerStyle.boxShadow).toBe("none");
    expect(outerStyle.borderTopWidth).toBe("0px");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} must not overflow at 820px`).toBeLessThanOrEqual(5);
    await page.screenshot({ path: path.join(evidence, `${route.slice(1).replaceAll("/", "-")}-820.png`), fullPage: true });
  }
});

test("opening another desktop filter closes the previous overlay", async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(!hasAccount("superAdmin"), "Missing local-only credentials for superAdmin.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/stock-wastage", { waitUntil: "domcontentloaded" });
  const reason = page.getByRole("combobox", { name: "Reason" });
  await reason.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await page.evaluate(() => {
    window.__filterOverlayEvents = [];
    document.addEventListener("sb:close-filter-more", () => window.__filterOverlayEvents.push("close-more"));
    document.addEventListener("sb:close-select-controls", () => window.__filterOverlayEvents.push("close-selects"));
  });

  const more = page.locator("details[data-filter-more-wrapper]");
  await more.locator("summary").click();
  await expect(more).toHaveAttribute("open", "");

  await reason.click();
  const overlayEvidence = await page.evaluate(() => ({ events: window.__filterOverlayEvents, open: document.querySelector("details[data-filter-more-wrapper]")?.hasAttribute("open"), listbox: Boolean(document.querySelector('[role="listbox"]')) }));
  await expect(more.locator(".sb-filter-more-panel"), JSON.stringify(overlayEvidence)).toBeHidden();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(more).not.toHaveAttribute("open", "");
  await page.screenshot({ path: path.join(evidence, "stock-wastage-filter-mutual-exclusion-1440.png"), fullPage: true });
});
