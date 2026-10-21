const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("new and create links become a phone FAB above the tab bar", () => {
  const consoleSource = read("src/components/layout/right-console.tsx");
  const css = read("src/app/globals.css") + fs.readFileSync("src/app/design-system-v2.css", "utf8");

  assert.match(consoleSource, /primaryHref\?\.includes\("\/new"\)/);
  assert.match(consoleSource, /\/\^\(new\|create\)\\b\/i/);
  assert.match(consoleSource, /data-mobile-create-fab/);
  assert.match(consoleSource, /bottom-\[calc\(var\(--sb-mobile-nav-height\)\+env\(safe-area-inset-bottom\)\+1rem\)\]/);
  assert.match(consoleSource, /rounded-full/);
  assert.match(consoleSource, /<Plus/);
  assert.match(css, /data-mobile-create-fab[\s\S]*var\(--sb-mobile-nav-height\)/);
  assert.match(consoleSource, /mobileCreatePage/);
  assert.match(css, /data-mobile-create-page[\s\S]*padding-bottom: calc\(var\(--sb-mobile-nav-height\)/);
  assert.doesNotMatch(css, /\[data-mobile-action-bar\],\s*\[data-mobile-create-fab\],\s*\[data-mobile-document-action\]/);
});

test("workflow actions retain descriptive mobile controls", () => {
  const source = read("src/components/layout/right-console.tsx");

  assert.match(source, /ownsMobileActionArea/);
  assert.match(source, /data-mobile-action-bar/);
  assert.match(source, /md:hidden xl:hidden/);
  assert.match(source, /primaryAction \? <div data-mobile-primary-slot/);
  assert.match(source, /useState\("More actions"\)/);
  assert.match(source, /aria-label=\{`Open \$\{mobileConsoleLabel\.toLowerCase\(\)\}`\}/);
});

test("page-header create actions are icon-only below desktop without an empty action strip", () => {
  const source = read("src/components/ui/page-header.tsx");

  assert.match(source, /data-page-create-fab/);
  assert.match(source, /data-mobile-create-fab/);
  assert.match(source, /<span className="sr-only">\{props\.action\.label\}<\/span>/);
  assert.match(source, /props\.secondaryAction \|\| \(props\.action && !isCreateAction\)/);
  assert.equal((source.match(/props\.secondaryAction \|\| \(props\.action && !isCreateAction\)/g) ?? []).length, 2);
  assert.match(source, /data-tablet-page-actions[\s\S]*xl:hidden/);
  assert.doesNotMatch(source, /xl:not-sr-only/);
});

test("warning semantics remain distinct from blocking danger", () => {
  const css = read("src/app/globals.css") + fs.readFileSync("src/app/design-system-v2.css", "utf8");
  const badge = read("src/components/ui/badge.tsx");
  const states = read("src/components/ui/system-states.tsx");

  assert.match(css, /--sb-warning: #9A6700/);
  assert.match(css, /--sb-warning-bg: #FFF4CC/);
  assert.match(badge, /warning: "border-\[var\(--sb-warning-bg\)\]/);
  assert.match(states, /warning: "border-\[var\(--sb-warning\)\]/);
});
