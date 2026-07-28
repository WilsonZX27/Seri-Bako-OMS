const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("static workspace audit supports bounded route and viewport verification", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "tests/e2e/static-workspace-layout-audit.spec.js"), "utf8");

  assert.match(source, /STATIC_WORKSPACE_ROUTES/);
  assert.match(source, /STATIC_WORKSPACE_VIEWPORTS/);
  assert.match(source, /STATIC_WORKSPACE_SCREENSHOTS/);
  assert.match(source, /for \(const viewport of auditedViewports\)/);
  assert.match(source, /for \(const route of auditedWorkspaces\)/);
});
