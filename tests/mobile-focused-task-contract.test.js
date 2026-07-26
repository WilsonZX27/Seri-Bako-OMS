const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("focused create and edit tasks hide the tab bar but retain a safe action area", () => {
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const css = read("src/app/globals.css");

  assert.match(navigation, /const isFocusedTask =/);
  assert.match(navigation, /new\|edit/);
  assert.match(navigation, /root\.dataset\.mobileTaskPage = "true"/);
  assert.match(navigation, /if \(isFocusedTask\) return null/);
  assert.match(css, /html\[data-mobile-task-page="true"\][\s\S]*safe-area-inset-bottom/);
});
