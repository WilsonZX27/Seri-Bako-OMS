const { test, expect } = require("@playwright/test");
const { requireAccount } = require("./helpers");
const packageVersion = require("../../package.json").version;

const roles = ["superAdmin", "manager", "finance", "purchasing", "chef", "kitchen", "outlet"];

for (const role of roles) {
  test(`${role} login reaches one stable terminal route`, async ({ page }) => {
    const credentials = requireAccount(role);
    const redirects = [];
    page.on("response", (response) => {
      if (response.status() >= 300 && response.status() < 400) {
        const source = new URL(response.url()).pathname;
        const location = response.headers().location;
        if (location) redirects.push([source, new URL(location, response.url()).pathname]);
      }
    });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !["/login", "/"].includes(url.pathname), { timeout: 20_000 });
    await page.waitForTimeout(500);

    const terminal = new URL(page.url()).pathname;
    console.log(`[auth-route] ${role}: ${redirects.map(([source, destination]) => `${source}->${destination}`).join(", ")} => ${terminal}`);
    expect(redirects.every(([source, destination]) => source !== destination)).toBe(true);
    expect(redirects.length).toBeLessThan(8);
    expect(["/login", "/"].includes(terminal)).toBe(false);
    await expect(page.locator("body")).toContainText(`v${packageVersion}`);
  });
}

test("desktop and mobile keep usable navigation after login", async ({ browser }) => {
  const credentials = requireAccount("superAdmin");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !["/login", "/"].includes(url.pathname), { timeout: 20_000 });
    if (viewport.width < 640) {
      await expect(page.getByRole("navigation", { name: "Primary mobile navigation" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation").first()).toBeVisible();
    }
    await page.close();
  }
});
