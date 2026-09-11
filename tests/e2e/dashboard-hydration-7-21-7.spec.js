const { test, expect } = require("@playwright/test");
const { requireAccount } = require("./helpers");

const terminalRoutes = {
  superAdmin: "/dashboard",
  manager: "/dashboard",
  finance: "/dashboard",
  purchasing: "/dashboard",
  kitchen: "/dashboard",
  outlet: "/dashboard",
};

for (const [role, terminalRoute] of Object.entries(terminalRoutes)) {
  test(`${role} has a stable hydrated landing page`, async ({ page }) => {
    const credentials = requireAccount(role);
    const criticalErrors = [];
    if (["superAdmin", "manager"].includes(role)) {
      await page.route("**/_next/static/chunks/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1_200));
        await route.continue();
      });
    }
    page.on("console", (message) => {
      if (message.type() === "error") criticalErrors.push(message.text());
    });
    page.on("pageerror", (error) => criticalErrors.push(error.message));

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !["/", "/login"].includes(url.pathname), { timeout: 20_000 });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === terminalRoute, { timeout: 20_000 });

    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe(terminalRoute);
    console.log(`[dashboard-hydration] ${role}: ${terminalRoute}; critical errors=${criticalErrors.length}`);
    expect(criticalErrors).toEqual([]);
  });
}
