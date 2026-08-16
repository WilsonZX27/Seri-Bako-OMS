const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "src", "app", "(app)");

function collectTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectTsxFiles(target) : entry.name.endsWith(".tsx") ? [target] : [];
  });
}

test("row selection is exposed only where a real bulk operation exists", () => {
  const providers = collectTsxFiles(appRoot)
    .map((file) => ({ file, source: fs.readFileSync(file, "utf8") }))
    .filter(({ source }) => source.includes("<BulkSelectionProvider"));

  assert.deepEqual(
    providers.map(({ file }) => path.relative(root, file).replaceAll("\\", "/")).sort(),
    [
      "src/app/(app)/branches/page.tsx",
      "src/app/(app)/purchase-requests/page.tsx",
    ],
  );

  const branches = providers.find(({ file }) => file.endsWith(path.join("branches", "page.tsx"))).source;
  const requests = providers.find(({ file }) => file.endsWith(path.join("purchase-requests", "page.tsx"))).source;

  assert.match(branches, /<BulkSelectionProvider[\s\S]*action=\{archiveBranches\}/);
  assert.match(requests, /<BulkSelectionProvider[\s\S]*selectionActions=\{<BulkPhaseOneDelete \/>\}/);
  assert.doesNotMatch(branches, /canAct=\{false\}/);
  assert.doesNotMatch(requests, /canAct=\{false\}/);
});
