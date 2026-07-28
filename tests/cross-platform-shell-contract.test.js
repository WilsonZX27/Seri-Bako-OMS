const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("tablet keeps role navigation sticky while primary actions stay visible", () => {
  const workspaceGrid = read("src", "components", "layout", "workspace-layout.tsx");
  const rightConsole = read("src", "components", "layout", "right-console.tsx");
  const appLayout = read("src", "app", "(app)", "layout.tsx");
  const documentWorkspace = read("src", "components", "documents", "document-workspace.tsx");
  const stockCountForm = read("src", "components", "stock-count-form.tsx");
  const topBar = read("src", "components", "layout", "top-bar.tsx");
  const tabletSidebar = read("src", "components", "layout", "mobile-sidebar.tsx");

  assert.doesNotMatch(workspaceGrid, /data-tablet-context/);
  assert.doesNotMatch(workspaceGrid, /absolute right-0 z-\[var\(--sb-z-dropdown\)\]/);
  assert.match(rightConsole, /"xl:hidden"/);
  assert.doesNotMatch(rightConsole, /mobileOnlyBar/);
  assert.match(appLayout, /pb-\[calc\(var\(--sb-mobile-nav-height\)\+env\(safe-area-inset-bottom\)\+1rem\)\] xl:pb-0/);
  assert.doesNotMatch(appLayout, /lg:pb-4/);
  assert.match(documentWorkspace, /mobilePrimaryAction && "pb-20 xl:pb-3"/);
  assert.match(documentWorkspace, /xl:hidden \[&>\*\]:w-full/);
  assert.match(stockCountForm, /pb-20 xl:pb-0/);
  // Tablet's visible primary action is the shared sticky task action; the
  // duplicate in-surface button begins only at the desktop shell breakpoint.
  assert.match(stockCountForm, /hidden xl:inline-flex/);
  assert.match(topBar, /<MobileSidebar/);
  assert.match(tabletSidebar, /hidden md:inline-flex xl:hidden/);
  assert.match(tabletSidebar, /fixed inset-0 z-50 hidden md:block xl:hidden/);
});

test("desktop and tablet shared geometry remains token based", () => {
  const tailwind = read("tailwind.config.ts");
  const design = read("DESIGN.md");
  const globals = read("src", "app", "globals.css");
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  const operationalHub = read("src", "components", "operational-hub.tsx");

  assert.match(tailwind, /md: "var\(--sb-radius-control\)"/);
  assert.match(tailwind, /sm: "var\(--sb-radius-control\)"/);
  assert.match(design, /Tablet \(`768px-1279px`\)/);
  assert.match(design, /Desktop \(`>=1280px`\)/);
  assert.match(globals, /\.rounded-\\\[2px\\\],[\s\S]*\.rounded-md,[\s\S]*\.rounded-none[\s\S]*border-radius: var\(--sb-radius-control\)/);
  assert.match(globals, /--sb-panel-radius:/);
  assert.doesNotMatch(`${dashboard}\n${operationalHub}`, /--sb-radius-panel/);
});

test("shared activity and identity surfaces use OMS semantic tokens", () => {
  const activityMenu = read("src", "components", "layout", "top-bar-activity-menu.tsx");
  const account = read("src", "app", "(app)", "account", "page.tsx");

  assert.match(activityMenu, /bg-\[var\(--sb-warning\)\]/);
  assert.match(activityMenu, /bg-\[var\(--sb-warning-bg\)\]/);
  assert.match(activityMenu, /bg-\[var\(--sb-neutral-bg\)\]/);
  assert.doesNotMatch(activityMenu, /(?:bg|text)-red-|(?:bg|text)-slate-/);
  assert.match(account, /h-16 w-16[\s\S]*rounded-full/);
});

test("document workspaces retain route context without repeating the shared top-bar breadcrumb", () => {
  const documentWorkspace = read("src", "components", "documents", "document-workspace.tsx");

  assert.match(documentWorkspace, /breadcrumbs\.map\(\(crumb\) => crumb\.label\)/);
  assert.match(documentWorkspace, /data-document-breadcrumb/);
  assert.doesNotMatch(documentWorkspace, /aria-label="Breadcrumb"/);
  assert.doesNotMatch(documentWorkspace, /void _breadcrumbs/);
});

test("master-data forms use the shared responsive action rail without duplicate submit bars", () => {
  const masterForms = read("src", "components", "master-data-forms.tsx");
  const routes = [
    read("src", "app", "(app)", "supplier-items", "new", "page.tsx"),
    read("src", "app", "(app)", "supplier-items", "[id]", "page.tsx"),
    read("src", "app", "(app)", "uom-conversions", "new", "page.tsx"),
    read("src", "app", "(app)", "uom-conversions", "[id]", "page.tsx"),
    read("src", "app", "(app)", "document-sequences", "new", "page.tsx"),
    read("src", "app", "(app)", "document-sequences", "[id]", "page.tsx"),
  ];

  assert.match(masterForms, /formId\?: string/);
  assert.match(masterForms, /showSubmit = true/);
  assert.match(masterForms, /rounded-\[var\(--sb-radius-control\)\]/);
  const sequenceForm = read("src", "components", "document-sequence-form.tsx");
  assert.match(sequenceForm, /formId\?: string/);
  assert.match(sequenceForm, /showSubmit = true/);
  for (const route of routes) {
    assert.match(route, /RecordWorkspace/);
    assert.match(route, /showSubmit=\{false\}/);
    assert.match(route, /data-mobile-primary-action/);
  }
});

test("workspace right-rail styling is applied consistently at tablet and desktop breakpoints", () => {
  const workspaceGrid = read("src", "components", "layout", "workspace-layout.tsx");

  assert.match(workspaceGrid, /const contextualRail = rightRailClassName/);
  assert.match(workspaceGrid, /\{contextualRail\}/);
  assert.doesNotMatch(workspaceGrid, /void rightRailClassName/);
});

test("administration collection pages reuse the contained operational tool-list presentation", () => {
  const imports = read("src", "app", "(app)", "imports", "page.tsx");
  const administration = read("src", "app", "(app)", "administration", "page.tsx");
  const toolList = read("src", "components", "operational-tool-list.tsx");

  assert.match(imports, /<WorkspaceGrid tabletCanvas="contained">/);
  assert.match(administration, /<WorkspaceGrid tabletCanvas="contained">/);
  assert.match(imports, /OperationalToolList/);
  assert.match(administration, /OperationalToolList/);
  assert.match(toolList, /divide-y divide-\[var\(--sb-border-soft\)\]/);
  assert.equal(fs.existsSync(path.join(root, "src", "components", "category-card-grid.tsx")), false);
});

test("dashboard identity context uses the canonical role and branch delimiter", () => {
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  const design = read("DESIGN.md");

  assert.match(dashboard, /Welcome, \{summary\.userName\}/);
  assert.match(dashboard, />\|<\/span>/);
  assert.match(design, /Welcome, \[staff name\] \| \[role\] \| \[actual branch scope\]/);
});

test("retired multi-theme display components stay removed", () => {
  assert.equal(fs.existsSync(path.join(root, "src", "components", "workspace-panels.tsx")), false);
  assert.equal(fs.existsSync(path.join(root, "src", "components", "ui", "stat-card.tsx")), false);
});
