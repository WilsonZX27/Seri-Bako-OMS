const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src/components/status-tabs.tsx"), "utf8");

test("the first status tab stays at a stable mobile scroll origin", () => {
  assert.match(source, /const tabsRef = useRef<HTMLElement>\(null\);/);
  assert.match(source, /if \(selected === "all"\) \{/);
  assert.match(source, /tabsRef\.current\?\.scrollTo\(\{ left: 0, behavior: "auto" \}\)/);
  assert.match(source, /\[scroll-padding-inline:0\.5rem\]/);
});
