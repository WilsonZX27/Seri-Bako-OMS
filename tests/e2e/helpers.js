const requiredAccounts = {
  admin: ["TEST_ADMIN_EMAIL", "TEST_ADMIN_PASSWORD"],
  finance: ["TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  kitchen: ["TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  purchasing: ["TEST_PURCHASE_EMAIL", "TEST_PURCHASE_PASSWORD"],
  manager: ["TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
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

async function login(page, role) {
  const creds = account(role);
  if (!creds) return false;
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|change-password|login/, { timeout: 20_000 });
  return page.url().includes("/dashboard");
}

module.exports = { account, login };
