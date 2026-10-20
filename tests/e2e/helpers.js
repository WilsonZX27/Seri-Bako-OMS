const requiredAccounts = {
  peopleOperations: ["TEST_PEOPLE_OPERATIONS_EMAIL", "TEST_PEOPLE_OPERATIONS_PASSWORD"],
  finance: ["TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  chef: ["TEST_CHEF_EMAIL", "TEST_CHEF_PASSWORD"],
  kitchen: ["TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  purchasing: ["TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD"],
  manager: ["TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
  outletSupervisor: ["TEST_OUTLET_SUPERVISOR_EMAIL", "TEST_OUTLET_SUPERVISOR_PASSWORD"],
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
  let visibleError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(creds.email);
    await passwordInput.fill(creds.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await Promise.race([
      page.waitForURL((url) => !["/login", "/"].includes(url.pathname), { timeout: 20_000 }).catch(() => null),
      page.locator("text=/Invalid email or password|disabled|expired|temporarily limited/i").waitFor({ timeout: 20_000 }).catch(() => null),
    ]);
    const pathname = new URL(page.url()).pathname;
    if (!["/login", "/change-password", "/set-password", "/access-status", "/"].includes(pathname)) return true;
    visibleError = await page.locator("text=/Invalid email or password|disabled|expired|temporarily limited|could not/i").first().textContent({ timeout: 1000 }).catch(() => null);
    await page.waitForTimeout(750);
  }
  throw new Error(`Login failed for ${role} (${creds.email}). ${visibleError ? `Message: ${visibleError}` : "No dashboard redirect was observed."}`);
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
