const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("dashboard stays server-rendered instead of hydrating the whole workspace for a hidden clock", () => {
  const page = read("src/app/(app)/dashboard/page.tsx");
  const workspace = read("src/components/dashboard-workspace.tsx");
  const utils = read("src/lib/utils.ts");

  assert.match(page, /<DashboardWorkspace summary=\{summary\} \/>/);
  assert.doesNotMatch(workspace, /"use client"/);
  assert.doesNotMatch(workspace, /useState|useEffect|setInterval|aria-live="polite"/);
  assert.doesNotMatch(page, /renderedAt/);
  assert.match(utils, /timeZone: "Asia\/Kuala_Lumpur"/);
  assert.doesNotMatch(workspace, /useState\(\(\) => new Date\(\)\)/);
  assert.doesNotMatch(workspace, /suppressHydrationWarning/);
});
