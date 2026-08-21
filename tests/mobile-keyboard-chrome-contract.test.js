const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const navigation = fs.readFileSync("src/components/layout/mobile-app-navigation.tsx", "utf8");
const design = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("mobile keyboard state is derived from visual viewport and editable focus", () => {
  assert.match(navigation, /window\.visualViewport/);
  assert.match(navigation, /focusin/);
  assert.match(navigation, /root\.dataset\.mobileKeyboardOpen = "true"/);
  assert.match(navigation, /root\.dataset\.mobileEditableFocus = "true"/);
  assert.match(navigation, /viewportDelta > 120/);
  assert.match(navigation, /stableViewportHeight/);
  assert.match(navigation, /document\.documentElement\.clientHeight/);
});

test("software keyboard keeps bottom navigation at the physical screen bottom across phone and tablet shells", () => {
  assert.match(design, /data-mobile-keyboard-open="true"[\s\S]*data-mobile-document-action/);
  assert.match(design, /data-mobile-create-fab/);
  assert.match(navigation, /max-width: 1279px/);
  assert.match(navigation, /--sb-virtual-keyboard-inset/);
  assert.match(design, /data-mobile-bottom-nav[\s\S]*translateY\(var\(--sb-virtual-keyboard-inset/);
  assert.doesNotMatch(design, /data-mobile-keyboard-open="true"\][^{]*\[data-mobile-bottom-nav\][^{]*\{[^}]*visibility:\s*hidden/);
  assert.match(design, /data-mobile-editable-focus="true"/);
  assert.match(design, /visibility: hidden !important/);
  assert.match(design, /scroll-padding-bottom: 1rem/);
  assert.match(design, /@media \(max-width: 1279px\)/);
});
