const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");
const { FIXTURE, adminClient, cleanupCreatedStaff, seedLocalReleaseFixture } = require("./local-release-fixture");

const routes = [
  "/purchase-requests", "/purchase-orders", "/goods-receivings", "/supplier-invoices", "/purchase-returns",
  "/items", "/products", "/suppliers", "/supplier-items", "/stock-balance", "/stock-transactions",
  "/stock-transfers", "/stock-counts", "/stock-wastage", "/production/jobs", "/outlet-daily-records", "/recipes",
];

test.describe.serial("v7.23.5.9 authenticated release blockers", () => {
  test.beforeAll(async () => {
    await seedLocalReleaseFixture({ managerCanComment: process.env.EXPECT_MANAGER_COMMENT_DENIED !== "1" });
  });

  test("new Kitchen staff completes temporary-password onboarding into the Kitchen workspace", async ({ page }) => {
    test.setTimeout(90_000);
    const stamp = Date.now();
    const email = `kitchen-${stamp}@example.test`;
    const temporaryPassword = `Temp!${stamp}Aa`;
    const permanentPassword = `Ready!${stamp}Bb`;
    let staffId;

    try {
      await login(page, "superAdmin");
      await page.goto("/staffs/new", { waitUntil: "networkidle" });
      await page.locator('input[name="staff_code"]').fill(`K${String(stamp).slice(-7)}`);
      await page.locator('input[name="full_name"]').fill("Disposable Kitchen Onboarding");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="temporary_password"]:visible').fill(temporaryPassword);
      await page.locator('button[aria-label="Role"]:visible').click();
      await page.getByRole("option", { name: "Kitchen", exact: true }).click();
      await page.locator('button:visible').filter({ hasText: "Create Staff" }).click();
      await expect(page).toHaveURL(/\/staffs\/[0-9a-f-]+/i, { timeout: 20_000 });
      staffId = new URL(page.url()).pathname.split("/").pop();
      await expect(page.locator("span:visible").filter({ hasText: /^Setup pending$/ })).toBeVisible();

      await page.context().clearCookies();
      await page.goto("/login");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(temporaryPassword);
      await page.getByRole("button", { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/change-password/, { timeout: 20_000 });
      await page.locator('input[name="password"]').fill(permanentPassword);
      await page.locator('input[name="confirm_password"]').fill(permanentPassword);
      await page.getByRole("button", { name: "Change password" }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
      await expect(page.getByRole("heading", { name: "Kitchen Workdesk", exact: true })).toBeVisible();

      const admin = adminClient();
      const { data, error } = await admin.from("staffs").select("auth_user_id, status, must_change_password, invitation_status").eq("id", staffId).single();
      expect(error).toBeNull();
      expect(data).toMatchObject({ status: "active", must_change_password: false, invitation_status: "completed" });
      expect(data.auth_user_id).toBeTruthy();
    } finally {
      await cleanupCreatedStaff(staffId);
    }
  });

  test("Manager comment submit persists across PR reload", async ({ page }) => {
    const expectDenied = process.env.EXPECT_MANAGER_COMMENT_DENIED === "1";
    const comment = `Manager release-blocker comment ${Date.now()}`;
    const clientErrors = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") clientErrors.push(message.text()); });

    await login(page, "manager");
    await page.goto(`/purchase-requests/${FIXTURE.purchaseRequestId}`, { waitUntil: "networkidle" });
    const form = page.locator('form:has(textarea[name="comment_text"]):visible').first();
    await form.locator('textarea[name="comment_text"]').fill(comment);
    await form.getByRole("button", { name: "Add comment" }).click();

    if (expectDenied) {
      await page.waitForTimeout(1_000);
      await expect(page.getByText(comment, { exact: true })).toHaveCount(0);
      expect(clientErrors.join("\n")).toMatch(/documents\.comment|Server Components|digest|permission/i);
      return;
    }

    const visibleComment = page.locator("p:visible").filter({ hasText: new RegExp(`^${comment}$`) }).first();
    await expect(visibleComment).toBeVisible({ timeout: 15_000 });
    await page.reload({ waitUntil: "networkidle" });
    await expect(visibleComment).toBeVisible();
    expect(clientErrors).toEqual([]);
  });

  test("Owner completes the authenticated 17-route operational sweep without backend or runtime failures", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, "superAdmin");

    for (const route of routes) {
      await test.step(route, async () => {
        errors.length = 0;
        const response = await page.goto(route, { waitUntil: "load", timeout: 30_000 });
        expect(response?.status(), `${route} HTTP status`).toBeLessThan(400);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|fetch failed|Failed to fetch/i);
        expect(errors, `${route} browser errors`).toEqual([]);
      });
    }
  });
});
