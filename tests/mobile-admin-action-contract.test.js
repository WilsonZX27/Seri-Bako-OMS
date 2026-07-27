const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("create-capable administration lists promote their new record action to the phone FAB", () => {
  assert.match(read("src/app/(app)/branches/page.tsx"), /data-mobile-primary-action><Link href="\/branches\/new">New branch/);
  assert.match(read("src/app/(app)/staffs/page.tsx"), /data-mobile-primary-action><Link href="\/staffs\/new">New staff/);
});

test("company profile preserves save as the explicit phone form action", () => {
  const company = read("src/app/(app)/company/page.tsx");

  assert.match(company, /<WorkspaceGrid\s+documentMode\s+rightRail=/);
  assert.match(company, /form="company-form" className="w-full" data-mobile-primary-action>Save Company/);
});

test("master-data cleanup stays a read-only mobile workspace without an action bar", () => {
  assert.match(read("src/app/(app)/administration/master-data-cleanup/page.tsx"), /<WorkspaceGrid hideMobileConsole rightRail=/);
});
