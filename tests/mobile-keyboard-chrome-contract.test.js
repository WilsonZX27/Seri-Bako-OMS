const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const navigation = fs.readFileSync("src/components/layout/mobile-app-navigation.tsx", "utf8");
const design = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("mobile keyboard state is derived from visual viewport and editable focus", () => {
  assert.match(navigation, /window\.visualViewport/);
  assert.match(navigation, /focusin/);
  assert.match(navigation, /root\.dataset\.mobileKeyboardOpen = "true"/);
  assert.match(navigation, /viewportDelta > 120/);
});

test("mobile keyboard state hides fixed app chrome without changing desktop layout", () => {
  assert.match(design, /html\[data-mobile-keyboard-open="true"\][\s\S]*data-mobile-document-action/);
  assert.match(design, /visibility: hidden !important/);
  assert.match(design, /scroll-padding-bottom: 1rem/);
  assert.match(design, /@media \(max-width: 767px\)/);
});
