const requiredAccounts = {
  admin: ["TEST_ADMIN_EMAIL", "TEST_ADMIN_PASSWORD"],
  finance: ["TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  kitchen: ["TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  purchasing: ["TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD"],
  manager: ["TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
  outlet: ["TEST_OUTLET_EMAIL", "TEST_OUTLET_PASSWORD"],
  superAdmin: ["TEST_SUPER_ADMIN_EMAIL", "TEST_SUPER_ADMIN_PASSWORD"],
};

function account(role) {
  const keys = requiredAccounts[role];
  if (!keys) throw new Error(`Unknown test role: ${role}`);
  const [emailKey, passwordKey] = keys;
  const email = process.env[emailKey];
  const password = process.env[passwordKey];
  if (!email || !password) return null;
  return { email, password };
}

function hasAccount(role) {
  return missingAccountVars(role).length === 0;
}

function missingAccountVars(role) {
  const keys = requiredAccounts[role];
  if (!keys) throw new Error(`Unknown test role: ${role}`);
  return keys.filter((key) => !process.env[key]);
}

function requireAccount(role) {
  const missing = missingAccountVars(role);
  if (missing.length) {
    throw new Error(`Missing test credentials for ${role}: ${missing.join(", ")}`);
  }
  return account(role);
}

async function login(page, role) {
  const creds = requireAccount(role);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await Promise.race([
    page.waitForURL(/dashboard|change-password/, { timeout: 20_000 }).catch(() => null),
    page.locator("text=/Invalid email or password|disabled|expired|temporarily limited/i").waitFor({ timeout: 20_000 }).catch(() => null),
  ]);
  const ok = page.url().includes("/dashboard");
  if (!ok) {
    const visibleError = await page
      .locator("text=/Invalid email or password|disabled|expired|temporarily limited|could not/i")
      .first()
      .textContent({ timeout: 1000 })
      .catch(() => null);
    throw new Error(`Login failed for ${role} (${creds.email}). ${visibleError ? `Message: ${visibleError}` : "No dashboard redirect was observed."}`);
  }
  return true;
}

async function logout(page) {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {});
  const menu = page.getByRole("button", { name: /open workspace updates/i });
  if (await menu.count()) {
    // Keep focus away from the notifications menu before opening account controls.
    await page.keyboard.press("Escape").catch(() => {});
  }
  const signOut = page.getByRole("button", { name: /sign out/i });
  if (await signOut.count()) {
    await signOut.first().click();
    await page.waitForURL(/\/login/, { timeout: 15_000 }).catch(() => {});
  }
}

module.exports = { account, hasAccount, login, logout, missingAccountVars, requireAccount };
