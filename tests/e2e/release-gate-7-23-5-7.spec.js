const { test, expect } = require("@playwright/test");
const { hasAccount, login } = require("./helpers");

test("shared visual and accessibility hardening matches the annotated release gate", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing local-only Owner credentials.");
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
  await login(page, "superAdmin");
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Protected controls", { exact: true })).toHaveCount(0);
  const consoleActions = page.locator("[data-right-console]").getByRole("heading", { name: "Actions" });
  await expect(consoleActions).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Open approval pipeline" })).toBeHidden();

  const account = page.getByRole("button", { name: /open account for/i });
  await account.click();
  const accountMenu = page.getByRole("menu");
  await expect(accountMenu).toBeVisible();
  await expect(accountMenu).toHaveClass(/sb-popover-surface/);
  await page.keyboard.press("Escape");
  await expect(accountMenu).toBeHidden();
  await expect(account).toBeFocused();

  await page.goto("/low-stock", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-select-control][aria-label="Branch"]')).toBeVisible();
  await expect(page.locator('[data-select-control][aria-label="Stock status"]')).toBeVisible();

  await page.goto("/items", { waitUntil: "domcontentloaded" });
  const selectionHead = page.locator("thead th").first();
  if (await selectionHead.isVisible()) expect((await selectionHead.boundingBox()).width).toBeLessThanOrEqual(44);

  await page.goto("/document-sequences", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-right-console]").getByRole("link", { name: "New sequence" })).toBeVisible();
  await expect(page.locator("main > header").getByRole("link", { name: "New sequence" })).toHaveCount(0);

  await page.goto("/administration/master-data-cleanup", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Reset" })).toHaveCount(0);
  await page.goto("/administration/master-data-cleanup?severity=warning", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Reset" })).toBeVisible();

  await page.goto("/purchase-requests/new", { waitUntil: "domcontentloaded" });
  await expect(page.locator("section").filter({ hasText: "Requested Items" }).locator("svg.lucide-search")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
  await expect(page.locator("[data-mobile-action-bar]:visible")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(5);

  await page.setViewportSize({ width: 390, height: 844 });
  const workflowTrigger = page.getByRole("button", { name: "View workflow" });
  await workflowTrigger.click();
  await expect(page.getByRole("dialog", { name: "Workflow progress" })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(workflowTrigger).toBeFocused();

  const unlabeled = await page.evaluate(() => [...document.querySelectorAll("button, input, select, textarea")].filter((element) => {
    if (element.type === "hidden") return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true" || element.tabIndex === -1) return false;
    if (element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.closest("label")) return false;
    if (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)) return false;
    return element.tagName === "BUTTON" ? !element.textContent.trim() : true;
  }).map((element) => `${element.tagName.toLowerCase()}[name="${element.getAttribute("name") ?? ""}"][type="${element.getAttribute("type") ?? ""}"]`));
  expect(unlabeled).toEqual([]);
  expect(runtimeErrors.filter((message) => /hydration|uncaught|typeerror|referenceerror|permission denied/i.test(message))).toEqual([]);
});

test("account logout ends the authenticated session safely", async ({ page }) => {
  test.skip(!hasAccount("superAdmin"), "Missing local-only Owner credentials.");
  await login(page, "superAdmin");
  const account = page.getByRole("button", { name: /open account for/i });
  await account.click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
