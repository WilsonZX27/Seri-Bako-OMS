const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const styles = fs.readFileSync(
  path.join(__dirname, "../src/components/common/UnifiedListHeader.module.css"),
  "utf8",
);

test("compact search toolbar keeps grid tracks and touch controls on the same 44px rhythm", () => {
  assert.match(styles, /\.card\s*\{[^}]*--query-control-size:\s*44px;/s);
  assert.match(styles, /\.row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--query-control-size\)\s+var\(--query-control-size\)\s+max-content;/s);
  assert.match(styles, /\.row \.searchSubmit,\s*\.filterTrigger\s*\{[^}]*width:\s*var\(--query-control-size\);[^}]*min-width:\s*var\(--query-control-size\);[^}]*height:\s*var\(--query-control-size\);/s);
  assert.doesNotMatch(styles, /@media\s*\([^)]*pointer:\s*fine[^)]*\)[^{]*\{[^}]*--query-control-size:\s*36px/s);
});
