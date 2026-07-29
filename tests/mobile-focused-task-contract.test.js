const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("focused create and edit tasks retain the role navigation and safe action area", () => {
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const css = read("src/app/globals.css");

  assert.match(navigation, /const isFocusedTask =/);
  assert.match(navigation, /new\|edit/);
  assert.match(navigation, /root\.dataset\.mobileTaskPage = "true"/);
  assert.doesNotMatch(navigation, /if \(isFocusedTask\) return null/);
  assert.match(css, /html\[data-mobile-task-page="true"\][\s\S]*safe-area-inset-bottom/);
});

test("persistent phone actions replace bottom navigation and rely on the shared back affordance", () => {
  const console = read("src/components/layout/right-console.tsx");
  const context = read("src/components/layout/mobile-context-header.tsx");
  const css = read("src/app/globals.css");

  assert.match(console, /root\.dataset\.mobileActionPage = "true"/);
  assert.match(css, /data-mobile-action-page="true"[\s\S]*data-mobile-app-nav/);
  assert.match(css, /data-mobile-action-page="true"[\s\S]*bottom: 0 !important/);
  assert.match(context, /route\.backHref \?\? "\/dashboard"/);
  assert.match(context, /pathname === item\.href \? "\/dashboard" : item\.href/);
});
