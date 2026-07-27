const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("legacy record workspaces promote their safe create and save actions on phone", () => {
  const files = [
    "src/app/(app)/branches/new/page.tsx",
    "src/app/(app)/branches/[id]/page.tsx",
    "src/app/(app)/recipes/new/page.tsx",
    "src/app/(app)/recipes/[id]/edit/page.tsx",
    "src/app/(app)/suppliers/new/page.tsx",
    "src/app/(app)/suppliers/[id]/page.tsx",
  ];

  for (const file of files) assert.match(read(file), /data-mobile-primary-action/, file);
});

test("recipe workflow promotes forward state transitions but not rejection", () => {
  const recipe = read("src/app/(app)/recipes/[id]/page.tsx");

  assert.match(recipe, /data-mobile-primary-action>Submit/);
  assert.match(recipe, /data-mobile-primary-action>Approve/);
  assert.match(recipe, /data-mobile-primary-action>Activate/);
  assert.doesNotMatch(recipe, /variant="destructive" data-mobile-primary-action/);
});
