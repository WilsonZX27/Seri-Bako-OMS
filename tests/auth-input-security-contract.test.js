const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("authentication inputs are server-validated and upstream sign-in errors are not reflected", () => {
  const auth = read("src/server/actions/auth.ts");
  const input = read("src/server/auth/auth-input.ts");
  const login = read("src/app/(auth)/login/page.tsx");

  assert.match(auth, /readSignInInput\(formData\)/);
  assert.match(auth, /readEmailInput\(formData\.get\("email"\)\)/);
  assert.match(auth, /readPasswordChangeInput\(formData\)/);
  assert.match(input, /\.email\(/);
  assert.match(input, /\.max\(1024/);
  assert.match(auth, /Invalid email, username or password/);
  assert.doesNotMatch(auth, /encodeURIComponent\(error\.message\)/);
  assert.doesNotMatch(login, /return error;/);
});

test("server-side auth failures use the redacting logger rather than raw console output", () => {
  const auth = read("src/server/actions/auth.ts");
  const dashboard = read("src/app/(app)/dashboard/page.tsx");
  const callback = read("src/app/auth/callback/route.ts");

  assert.match(auth, /logServerError/);
  assert.doesNotMatch(auth, /console\.error/);
  assert.doesNotMatch(dashboard, /console\.error/);
  assert.doesNotMatch(callback, /console\.error/);
});

test("auth callback accepts only explicit same-origin password setup destinations", () => {
  const callback = read("src/app/auth/callback/route.ts");

  assert.match(callback, /function resolvePasswordSetupDestination\(raw: string \| null, origin: string\)/);
  assert.match(callback, /const candidate = new URL\(raw, origin\)/);
  assert.match(callback, /candidate\.origin !== origin/);
  assert.match(callback, /passwordSetupDestinations\.has\(candidate\.pathname\)/);
  assert.doesNotMatch(callback, /nextParam\?\.startsWith\("\/"\)/);
});

test("post-auth identity and staff lookup failures are distinct, recoverable states", () => {
  const auth = read("src/server/actions/auth.ts");
  const accessStatus = read("src/app/(auth)/access-status/page.tsx");

  assert.match(auth, /error: userError/);
  assert.match(auth, /await supabase\.auth\.signOut\(\)/);
  assert.match(auth, /error: staffError/);
  assert.match(auth, /access-status\?reason=workspace-unavailable/);
  assert.match(accessStatus, /workspace-unavailable/);
});

test("shared permission checks reject inactive or unlinked staff before evaluating grants", () => {
  const permissions = read("src/server/auth/permissions.ts");

  assert.match(permissions, /import \{ requireActiveTenantActor \} from "@\/server\/auth\/tenant-actor"/);
  assert.match(permissions, /const checkPermission = cache\(async \(permission: string\) => \{\s*[\s\S]*?await requireActiveTenantActor\(\)/);
  assert.match(permissions, /export async function getPermissionMap\(permissions: string\[\]\) \{\s*await requireActiveTenantActor\(\)/);
});

test("self-service account changes validate profile, password, and avatar bytes on the server", () => {
  const account = read("src/server/actions/account.ts");
  const inputs = read("src/server/auth/auth-input.ts");

  assert.match(inputs, /ownProfileSchema/);
  assert.match(inputs, /ownPasswordChangeSchema/);
  assert.match(account, /readOwnProfileInput/);
  assert.match(account, /readOwnPasswordChangeInput/);
  assert.match(account, /hasExpectedAvatarSignature/);
  assert.match(account, /requireActiveTenantActor/);
  assert.match(account, /\.eq\("company_id", actor\.companyId\)/);
  assert.match(account, /\.eq\("auth_user_id", user\.id\)/);
  assert.match(account, /staffUpdateError/);
  assert.match(account, /Your password changed, but the account status could not be refreshed/);
  assert.match(account, /image\/png/);
  assert.match(account, /image\/jpeg/);
  assert.match(account, /WEBP/);
});

test("company asset upload rejects active SVG content and verifies raster file signatures", () => {
  const foundation = read("src/server/actions/foundation.ts");
  const logoForm = read("src/components/company-logo-form.tsx");

  assert.match(foundation, /hasExpectedRasterSignature/);
  assert.doesNotMatch(foundation, /"image\/svg\+xml":/);
  assert.match(foundation, /public, user-provided SVG can carry/);
  assert.doesNotMatch(logoForm, /image\/svg\+xml/);
  assert.doesNotMatch(logoForm, /WEBP, SVG/);
});

test("company actions derive their target from the authenticated tenant rather than a bound route ID", () => {
  const foundation = read("src/server/actions/foundation.ts");
  const companyPage = read("src/app/(app)/company/page.tsx");

  assert.match(foundation, /export async function updateCompany\(formData: FormData\)/);
  assert.match(foundation, /export async function updateCompanyLogo\(formData: FormData\)/);
  assert.match(foundation, /export async function removeCompanyLogo\(\)/);
  assert.doesNotMatch(companyPage, /updateCompany\.bind/);
  assert.doesNotMatch(companyPage, /updateCompanyLogo\.bind/);
  assert.doesNotMatch(companyPage, /removeCompanyLogo\.bind/);
});
