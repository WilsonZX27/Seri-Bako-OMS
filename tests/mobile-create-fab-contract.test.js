const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("new and create links become a phone FAB above the tab bar", () => {
  const consoleSource = read("src/components/layout/right-console.tsx");
  const css = read("src/app/globals.css");

  assert.match(consoleSource, /primaryHref\?\.includes\("\/new"\)/);
  assert.match(consoleSource, /\/\^\(new\|create\)\\b\/i/);
  assert.match(consoleSource, /data-mobile-create-fab/);
  assert.match(consoleSource, /bottom-\[calc\(var\(--sb-mobile-nav-height\)\+env\(safe-area-inset-bottom\)\+1rem\)\]/);
  assert.match(consoleSource, /rounded-full/);
  assert.match(consoleSource, /<Plus/);
  assert.match(css, /data-mobile-create-fab[\s\S]*var\(--sb-mobile-nav-height\)/);
  assert.doesNotMatch(css, /\[data-mobile-action-bar\],\s*\[data-mobile-create-fab\],\s*\[data-mobile-document-action\]/);
});

test("workflow actions retain descriptive mobile controls", () => {
  const source = read("src/components/layout/right-console.tsx");

  assert.match(source, /hasCreateFab \? "hidden" : "flex", "xl:hidden"/);
  assert.match(source, /primaryAction \? <div data-mobile-primary-slot/);
  assert.match(source, /aria-label="Open more actions"/);
});
