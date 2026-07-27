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

  assert.match(workspaceGrid, /data-tablet-context/);
  assert.match(workspaceGrid, /md:block xl:hidden/);
  assert.match(rightConsole, /"md:hidden"/);
  assert.doesNotMatch(rightConsole, /mobileOnlyBar/);
  assert.match(appLayout, /md:pb-4 xl:pb-0/);
  assert.match(documentWorkspace, /mobilePrimaryAction && "pb-20 md:pb-3"/);
  assert.match(documentWorkspace, /md:hidden \[&>\*\]:w-full/);
  assert.match(stockCountForm, /pb-20 md:pb-0/);
  assert.match(stockCountForm, /hidden md:inline-flex/);
});

test("desktop and tablet shared geometry remains token based", () => {
  const tailwind = read("tailwind.config.ts");
  const design = read("DESIGN.md");

  assert.match(tailwind, /md: "var\(--sb-radius-control\)"/);
  assert.match(tailwind, /sm: "var\(--sb-radius-control\)"/);
  assert.match(design, /Tablet \(`768px–1279px`\)/);
  assert.match(design, /Desktop \(`>=1280px`\)/);
});

test("retired multi-theme display components stay removed", () => {
  assert.equal(fs.existsSync(path.join(root, "src", "components", "workspace-panels.tsx")), false);
  assert.equal(fs.existsSync(path.join(root, "src", "components", "ui", "stat-card.tsx")), false);
});
