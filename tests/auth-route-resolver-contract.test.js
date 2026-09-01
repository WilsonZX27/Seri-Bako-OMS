const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function loadResolver() {
  const iaSource = fs.readFileSync("src/lib/information-architecture.ts", "utf8");
  const iaCode = ts.transpileModule(iaSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const iaModule = { exports: {} };
  new Function("exports", "module", "require", iaCode)(iaModule.exports, iaModule, require);
  const source = fs.readFileSync("src/server/auth/route-resolver.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", code)(module.exports, module, (id) => id === "@/lib/information-architecture" ? iaModule.exports : require(id));
  return module.exports;
}

const { resolveAuthRoute } = loadResolver();

function follow(start, stateFor) {
  const chain = [start];
  for (let index = 0; index < 8; index += 1) {
    const current = chain.at(-1);
    const decision = resolveAuthRoute({ pathname: current, ...stateFor(current) });
    if (!decision) return chain;
    const destination = new URL(decision.destination, "http://local.test").pathname;
    assert.notEqual(destination, current, `${current} must not redirect to itself`);
    chain.push(destination);
  }
  assert.fail(`redirect chain did not terminate: ${chain.join(" -> ")}`);
}

const activeRoles = {
  owner: "/dashboard",
  people_operations: "/people",
  manager: "/dashboard",
  finance: "/dashboard",
  purchasing: "/dashboard",
  kitchen: "/production/jobs",
  outlet_staff: "/outlet-daily-records",
};

for (const [role, terminal] of Object.entries(activeRoles)) {
  test(`${role} reaches one finite terminal route`, () => {
    const chain = follow("/login", (pathname) => ({
      authenticated: true,
      staffStatus: "active",
      mustChangePassword: false,
      routeProtected: pathname !== "/login",
      routeAllowed: pathname === terminal,
      firstPermittedRoute: terminal,
    }));
    assert.deepEqual(chain, ["/login", terminal]);
  });
}

test("invited and password-change-required users terminate on their setup route", () => {
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: true, staffStatus: "invited", mustChangePassword: false, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/set-password"]);
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: true, staffStatus: "invited", mustChangePassword: true, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/change-password"]);
});

test("inactive, missing, unassigned, denied-dashboard, signed-out, and stale-cookie states converge", () => {
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: true, staffStatus: "disabled", mustChangePassword: false, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/access-status"]);
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: true, staffStatus: null, mustChangePassword: false, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/access-status"]);
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: true, staffStatus: "active", mustChangePassword: false, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/access-status"]);
  assert.deepEqual(follow("/dashboard", (pathname) => ({ authenticated: true, staffStatus: "active", mustChangePassword: false, routeProtected: true, routeAllowed: pathname === "/purchase-requests", firstPermittedRoute: "/purchase-requests" })), ["/dashboard", "/access-status"]);
  assert.deepEqual(follow("/dashboard", () => ({ authenticated: false, staffStatus: null, mustChangePassword: false, routeProtected: true, routeAllowed: false, firstPermittedRoute: null })), ["/dashboard", "/login"]);
});

test("completed password setup cannot return an active user to change-password", () => {
  assert.deepEqual(follow("/change-password", (pathname) => ({ authenticated: true, staffStatus: "active", mustChangePassword: false, routeProtected: false, routeAllowed: true, firstPermittedRoute: "/dashboard" })), ["/change-password", "/dashboard"]);
});

test("middleware preserves refreshed cookies and guards identical-path redirects", () => {
  const middleware = fs.readFileSync("src/lib/supabase/middleware.ts", "utf8");
  assert.match(middleware, /url\.pathname === request\.nextUrl\.pathname/);
  assert.match(middleware, /response\.cookies\.getAll\(\)/);
});

test("the shared app layout resolves an expired profile before tenant permission RPCs", () => {
  const layout = fs.readFileSync("src/app/(app)/layout.tsx", "utf8");
  const profileRead = layout.indexOf("const profile = await getCurrentProfile()");
  const missingProfileRedirect = layout.indexOf('if (!profile) redirect("/login")');
  const permissionRead = layout.indexOf("getPermissionMap(permissionCodes)");
  assert.ok(profileRead >= 0 && missingProfileRedirect > profileRead);
  assert.ok(permissionRead > missingProfileRedirect);
  assert.doesNotMatch(layout, /Promise\.all\(\[getCurrentProfile\(\), getPermissionMap/);
});

test("route denial is explicit and does not masquerade as a signed-out session", () => {
  const resolver = fs.readFileSync("src/server/auth/route-resolver.ts", "utf8");
  const status = fs.readFileSync("src/app/(auth)/access-status/page.tsx", "utf8");
  assert.match(resolver, /destination: "\/access-status\?reason=route-not-permitted"/);
  assert.match(status, /You do not have permission to open this workspace or action/);
  assert.match(status, /Return to Dashboard/);
  assert.doesNotMatch(status, /auth\.getUser\(\)/);
});
