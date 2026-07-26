const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("mobile web uses a permission-aware app shell without replacing desktop navigation", () => {
  const appLayout = read("src/app/(app)/layout.tsx");
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const sidebar = read("src/components/layout/sidebar.tsx");

  assert.match(appLayout, /MobileAppNavigation/);
  assert.match(appLayout, /mobileNavigationPermissionCodes/);
  assert.match(navigation, /data-mobile-app-nav/);
  assert.match(navigation, /grid-cols-5/);
  assert.match(navigation, /md:hidden/);
  assert.match(navigation, /getVisibleNavGroups\(role, permissionMap\)/);
  assert.match(navigation, /role === "outlet_staff"/);
  assert.match(navigation, /role === "kitchen"/);
  assert.match(navigation, /role === "purchasing"/);
  assert.match(navigation, /role === "finance"/);
  assert.match(navigation, /href: "\/stock-counts"/);
  assert.match(navigation, /isFocusedTask/);
  assert.match(navigation, /\/\(\?:new\|edit\)\$/);
  assert.match(navigation, /if \(isFocusedTask\) return null/);
  assert.match(sidebar, /xl:block/);
});

test("mobile shell respects safe areas, action stacking, and standalone web installation", () => {
  const css = read("src/app/globals.css");
  const rootLayout = read("src/app/layout.tsx");
  const appLayout = read("src/app/(app)/layout.tsx");
  const workspace = read("src/components/layout/workspace-layout.tsx");
  const manifest = read("src/app/manifest.ts");
  const contextHeader = read("src/components/layout/mobile-context-header.tsx");

  assert.match(css, /--sb-mobile-nav-height/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\[data-mobile-document-action\]/);
  assert.match(css, /data-mobile-task-page="true"/);
  assert.match(css, /bottom: calc\(env\(safe-area-inset-bottom\) \+ 0\.5rem\)/);
  assert.match(appLayout, /pb-\[calc\(var\(--sb-mobile-nav-height\)\+env\(safe-area-inset-bottom\)\+1rem\)\]/);
  assert.match(workspace, /rightRail && !hideMobileConsole && "pb-32 md:pb-3"/);
  assert.match(rootLayout, /viewportFit: "cover"/);
  assert.match(rootLayout, /appleWebApp/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/dashboard"/);
  assert.match(contextHeader, /Back to/);
  assert.match(contextHeader, /ChevronLeft/);
  assert.match(contextHeader, /text-center/);
  assert.match(contextHeader, /MobileContextTitle/);
});

test("phone top context is a stable three-slot bar with centered titles", () => {
  const contextHeader = read("src/components/layout/mobile-context-header.tsx");
  const topBar = read("src/components/layout/top-bar.tsx");

  assert.match(contextHeader, /h-11 w-11/);
  assert.match(contextHeader, /aria-label=\{`Back to \$\{context\.title\}`\}/);
  assert.match(contextHeader, /data-mobile-page-title/);
  assert.match(contextHeader, /text-center/);
  assert.match(topBar, /MobileContextBack/);
  assert.match(topBar, /MobileContextTitle/);
  assert.match(topBar, /TopBarActivityMenu/);
});

test("More retains search, profile, and logout after the phone top bar is simplified", () => {
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const topBar = read("src/components/layout/top-bar.tsx");
  const search = read("src/components/search/global-search.tsx");

  assert.match(navigation, /Search OMS/);
  assert.match(navigation, /href="\/account"/);
  assert.match(navigation, /action=\{signOut\}/);
  assert.match(navigation, /<GlobalSearch permissionMap=\{permissionMap\} mobile open=\{searchOpen\}/);
  assert.match(topBar, /topbar-search-region" className="hidden md:block"/);
  assert.match(search, /hideTrigger/);
  assert.match(search, /mobile \? "\(max-width: 767px\)" : "\(min-width: 768px\)"/);
});

test("dashboard exposes direct mobile actions and field forms keep touch-first grouping", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const receiving = read("src/components/goods-receiving-form.tsx");
  const stock = read("src/components/stock-balance-table.tsx");

  assert.match(dashboard, /MobileQuickActions/);
  assert.match(dashboard, /Based on your role/);
  assert.match(dashboard, /Stock count/);
  assert.match(receiving, /grid-cols-2/);
  assert.match(receiving, /inputMode="decimal"/);
  assert.match(stock, /h-11 w-11/);
});
