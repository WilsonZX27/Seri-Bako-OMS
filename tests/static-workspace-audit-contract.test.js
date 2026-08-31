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

test("dynamic detail audit covers the real tablet and laptop review widths", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "tests/e2e/dynamic-detail-layout-audit.spec.js"), "utf8");

  assert.match(source, /label: "tablet-820", width: 820, height: 1180/);
  assert.match(source, /label: "laptop-1180", width: 1180, height: 820/);
  assert.match(source, /test\.setTimeout\(10 \* 60_000\)/);
  assert.match(source, /getAttribute\("aria-hidden"\) === "true"/);
});

test("seven-role workdesk audit uses the release-gate viewport matrix", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "tests/e2e/role-workspaces-7-23-5-6.spec.js"), "utf8");
  assert.match(source, /peopleOperations: "People Operations"/);
  for (const viewport of [
    "{ width: 390, height: 844 }",
    "{ width: 820, height: 1180 }",
    "{ width: 1180, height: 820 }",
    "{ width: 1440, height: 900 }",
  ]) assert.match(source, new RegExp(viewport.replace(/[{}]/g, "\\$&")));
});
