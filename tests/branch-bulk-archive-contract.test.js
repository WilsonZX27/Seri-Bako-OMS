const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("branch bulk selection exposes a real tenant-scoped archive action", () => {
  const page = read("src/app/(app)/branches/page.tsx");
  const selection = read("src/components/bulk-selection.tsx");
  const actions = read("src/server/actions/foundation.ts");

  assert.match(page, /action=\{archiveBranches\}/);
  assert.match(page, /fieldName="branch_id"/);
  assert.match(selection, /<form action=\{action\}>/);
  assert.match(selection, /variant="destructive"/);
  assert.match(actions, /export async function archiveBranches\(formData: FormData\)/);
  assert.match(actions, /\.max\(100,/);
  assert.match(actions, /\.eq\("company_id", actor\.companyId\)/);
  assert.match(actions, /\.is\("deleted_at", null\)/);
  assert.match(actions, /writeActivityLog/);
});

test("backup reuses the canonical tablet split action rail", () => {
  const backup = read("src/app/(app)/administration/backups/backup-page.tsx");
  assert.match(backup, /<WorkspaceGrid documentMode tabletRailMode="split" rightRail=/);
  assert.match(backup, /data-mobile-primary-action/);
});
