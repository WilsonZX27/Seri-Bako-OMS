const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("global navigation does not issue live queue counts or display false-zero badges", () => {
  assert.equal(fs.existsSync(path.join(root, "src/server/queries/sidebar.ts")), false);
  const sidebar = read("src/components/layout/sidebar.tsx");
  const workspace = read("src/components/layout/workspace-sidebar.tsx");
  const architecture = read("src/lib/information-architecture.ts");

  assert.match(sidebar, /Navigation must never hold the application shell behind ten live COUNT/);
  assert.doesNotMatch(sidebar, /navCounts|getSidebarCounts/);
  assert.doesNotMatch(workspace, /navCounts|SidebarCounts|badgeKey/);
  assert.doesNotMatch(architecture, /badgeKey/);
});
