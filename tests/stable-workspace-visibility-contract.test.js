const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("operational workspaces never fade readable content during route streaming", () => {
  const css = read("src/app/design-system-v2.css");

  assert.doesNotMatch(css, /#main-content\s*>\s*:not\(\[data-document-workspace-header\]\)/);
  assert.doesNotMatch(css, /@keyframes\s+sb-content-enter/);
});

test("outlet daily create stays in the phone toolbar instead of covering records", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const filterBar = read("src/components/ui/filter-bar.tsx");
  const header = read("src/components/common/UnifiedListHeader.tsx");

  assert.match(page, /<WorkspaceGrid hideMobileConsole rightRail=/);
  assert.match(page, /phoneEndAction=\{canCreate/);
  assert.match(filterBar, /phoneEndAction\?: ReactNode/);
  assert.match(header, /unified-list-end-action/);
});
