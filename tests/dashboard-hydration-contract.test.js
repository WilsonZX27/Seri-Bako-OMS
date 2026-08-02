const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("dashboard clock hydrates from one server timestamp and timezone", () => {
  const page = read("src/app/(app)/dashboard/page.tsx");
  const workspace = read("src/components/dashboard-workspace.tsx");
  const utils = read("src/lib/utils.ts");

  assert.match(page, /renderedAt=\{new Date\(\)\.toISOString\(\)\}/);
  assert.match(workspace, /useState\(\(\) => new Date\(renderedAt\)\)/);
  assert.match(workspace, /formatDateTime\(now\.toISOString\(\)\)/);
  assert.match(utils, /timeZone: "Asia\/Kuala_Lumpur"/);
  assert.doesNotMatch(workspace, /useState\(\(\) => new Date\(\)\)/);
  assert.doesNotMatch(workspace, /suppressHydrationWarning/);
});
