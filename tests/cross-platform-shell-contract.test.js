const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("tablet keeps workspace actions in context instead of a phone action bar", () => {
  const workspaceGrid = read("src", "components", "layout", "workspace-layout.tsx");
  const rightConsole = read("src", "components", "layout", "right-console.tsx");
  const appLayout = read("src", "app", "(app)", "layout.tsx");
  const documentWorkspace = read("src", "components", "documents", "document-workspace.tsx");
  const stockCountForm = read("src", "components", "stock-count-form.tsx");
  const topBar = read("src", "components", "layout", "top-bar.tsx");
  const tabletSidebar = read("src", "components", "layout", "mobile-sidebar.tsx");

  assert.match(workspaceGrid, /data-tablet-context/);
  assert.match(workspaceGrid, /md:block xl:hidden/);
  assert.match(rightConsole, /"md:hidden"/);
  assert.doesNotMatch(rightConsole, /mobileOnlyBar/);
  assert.match(appLayout, /md:pb-4 xl:pb-0/);
  assert.match(documentWorkspace, /mobilePrimaryAction && "pb-20 md:pb-3"/);
  assert.match(documentWorkspace, /md:hidden \[&>\*\]:w-full/);
  assert.match(stockCountForm, /pb-20 md:pb-0/);
  assert.match(stockCountForm, /hidden md:inline-flex/);
  assert.match(topBar, /<MobileSidebar/);
  assert.match(tabletSidebar, /hidden md:inline-flex xl:hidden/);
  assert.match(tabletSidebar, /fixed inset-0 z-50 hidden md:block xl:hidden/);
});

test("desktop and tablet shared geometry remains token based", () => {
  const tailwind = read("tailwind.config.ts");
  const design = read("DESIGN.md");

  assert.match(tailwind, /md: "var\(--sb-radius-control\)"/);
  assert.match(tailwind, /sm: "var\(--sb-radius-control\)"/);
  assert.match(design, /Tablet \(`768px-1279px`\)/);
  assert.match(design, /Desktop \(`>=1280px`\)/);
});

test("document workspaces preserve supplied desktop and tablet navigation context", () => {
  const documentWorkspace = read("src", "components", "documents", "document-workspace.tsx");

  assert.match(documentWorkspace, /import Link from "next\/link"/);
  assert.match(documentWorkspace, /breadcrumbs\.length/);
  assert.match(documentWorkspace, /aria-label="Breadcrumb"/);
  assert.match(documentWorkspace, /hidden min-w-0 items-center[\s\S]*md:flex/);
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

test("administration collection pages reuse the shared category presentation", () => {
  const imports = read("src", "app", "(app)", "imports", "page.tsx");
  const backups = read("src", "app", "(app)", "settings", "backups", "backup-page.tsx");

  assert.match(imports, /CategoryCardGrid/);
  assert.match(imports, /sm:p-5/);
  assert.match(backups, /rounded-\[var\(--sb-radius-control\)\]/);
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
