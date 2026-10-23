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
  assert.match(navigation, /gridTemplateColumns: `repeat\(\$\{tabs\.length \+ 1\}, minmax\(0, 1fr\)\)`/);
  assert.match(navigation, /xl:hidden/);
  assert.match(navigation, /getVisibleNavGroups\(role, permissionMap, attentionHrefs\)/);
  assert.match(navigation, /role === "outlet_staff"/);
  assert.match(navigation, /role === "kitchen"/);
  assert.match(navigation, /role === "purchasing"/);
  assert.match(navigation, /role === "finance"/);
  assert.match(navigation, /href: "\/stock-counts"/);
  assert.match(navigation, /isFocusedTask/);
  assert.match(navigation, /touchTablet/);
  assert.match(navigation, /\/\(\?:new\|edit\)\$/);
  assert.doesNotMatch(navigation, /if \(isFocusedTask\) return null/);
  assert.match(sidebar, /data-app-sidebar/);
  assert.match(sidebar, /xl:block/);
});

test("Kitchen mobile navigation exposes only checklist, schedule and payslips", () => {
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const kitchenStart = navigation.indexOf('if (role === "kitchen")');
  const kitchenEnd = navigation.indexOf('if (role === "chef")');
  const kitchenTabs = navigation.slice(kitchenStart, kitchenEnd);

  assert.match(kitchenTabs, /href: "\/asset-management\?view=checklist"[\s\S]*?label: "Checklist"/);
  assert.match(kitchenTabs, /href: "\/attendance\/my-schedule"[\s\S]*?label: "Schedule"/);
  assert.match(kitchenTabs, /href: "\/attendance\/payslips"[\s\S]*?label: "Payslips"/);
  assert.doesNotMatch(kitchenTabs, /stock-counts|purchase-requests|stock-balance|stock-wastage/);
});

test("mobile shell respects safe areas, action stacking, and standalone web installation", () => {
  const css = `${read("src/app/globals.css")}\n${read("src/app/design-system-v2.css")}`;
  const rootLayout = read("src/app/layout.tsx");
  const appLayout = read("src/app/(app)/layout.tsx");
  const workspace = read("src/components/layout/workspace-layout.tsx");
  const manifest = read("src/app/manifest.ts");
  const contextHeader = read("src/components/layout/mobile-context-header.tsx");

  assert.match(css, /--sb-mobile-nav-height/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\[data-mobile-document-action\]/);
  assert.match(css, /data-touch-tablet/);
  assert.match(css, /data-tablet-canvas="contained"/);
  assert.match(css, /data-tablet-canvas="wide"/);
  assert.match(css, /data-mobile-task-page="true"/);
  assert.match(css, /html:is\(\[data-mobile-task-page="true"\], \[data-mobile-action-page="true"\]\)[\s\S]*?bottom: 0 !important/);
  assert.doesNotMatch(css, /\.sb-mobile-action-bar\s*\{\s*bottom: env\(safe-area-inset-bottom\)/);
  assert.match(css, /\[data-mobile-document-action\][\s\S]*padding-bottom: max\(0\.75rem, env\(safe-area-inset-bottom\)\)/);
  assert.match(appLayout, /pb-\[calc\(var\(--sb-mobile-nav-height\)\+env\(safe-area-inset-bottom\)\+1rem\)\]/);
  assert.doesNotMatch(workspace, /pb-32/);
  assert.match(workspace, /rightRail && !hideMobileConsole && "xl:pb-3"/);
  assert.match(css, /html\[data-mobile-action-page="true"\] \[data-workspace-canvas\][\s\S]*?padding-bottom:/);
  assert.match(rootLayout, /viewportFit: "cover"/);
  assert.match(rootLayout, /appleWebApp/);
  assert.match(rootLayout, /id="touch-tablet-bootstrap"/);
  assert.match(rootLayout, /strategy="beforeInteractive"/);
  assert.match(rootLayout, /maxTouchPoints/);
  assert.match(rootLayout, /dataset\.touchTablet/);
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

  // Field users operate this navigation with the same wet-hand 48px target
  // standard as document controls.
  assert.match(contextHeader, /h-12 w-12/);
  assert.match(contextHeader, /aria-label=\{`Back to \$\{context\.title\}`\}/);
  assert.match(contextHeader, /data-mobile-page-title/);
  assert.match(contextHeader, /text-center/);
  assert.match(topBar, /MobileContextBack/);
  assert.match(topBar, /MobileContextTitle/);
  assert.match(topBar, /TopBarActivityMenu/);
});

test("shared dialogs contain their content within the dynamic mobile viewport and preserve keyboard safety", () => {
  const modal = read("src/components/ui/modal-shell.tsx");

  assert.match(modal, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modal, /createPortal\(/);
  assert.match(modal, /document\.body/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /containDialogTab\(event, dialog\)/);
});

test("top-bar updates stay within the dynamic viewport rather than relying on a fixed popover height", () => {
  const activityMenu = read("src/components/layout/top-bar-activity-menu.tsx");

  const css = require("postcss").parse(read("src/app/design-system-v2.css"));
  const heights = [];
  css.walkRules(rule => { if (rule.selector === ".sb-workspace-updates") rule.walkDecls("max-height", declaration => heights.push({ value: declaration.value, media: rule.parent.type === "atrule" ? rule.parent.params : null })); });
  assert.ok(heights.some(rule => !rule.media && rule.value.includes("100dvh")), "outer tray owns a dynamic viewport bound");
  assert.ok(heights.some(rule => rule.media === "(max-width: 1279px)" && rule.value.includes("100dvh - 9rem") && rule.value.includes("safe-area-inset-bottom")), "mobile tray reserves fixed-navigation and safe-area space");
  assert.match(activityMenu, /min-h-0 flex-1 divide-y overflow-y-auto/);
  assert.match(activityMenu, /overflow-y-auto/);
  assert.doesNotMatch(activityMenu, /max-h-96/);
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

  assert.match(dashboard, /QuickActionsCluster/);
  assert.doesNotMatch(dashboard, /Based on your role/);
  assert.match(dashboard, /Stock count/);
  assert.match(receiving, /grid-cols-2/);
  assert.match(receiving, /inputMode="decimal"/);
  assert.match(stock, /h-(?:9|10) w-(?:9|10)/);
});
