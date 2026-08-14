const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function sourceFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.tsx$/.test(entry.name) ? [target] : [];
  });
}

test("an xl-hidden table never loses its manual replacement at tablet widths", () => {
  const offenders = [];
  for (const file of sourceFiles(path.join("src", "app", "(app)"))) {
    const source = fs.readFileSync(file, "utf8");
    if (!/<Table\b[^>]*\bmobileHidden\b/.test(source)) continue;
    if (/className="[^"]*\b(?:md|lg):hidden\b[^"]*"\s+role="list"/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `Manual compact lists must remain visible until the default mobileHidden table appears at xl: ${offenders.join(", ")}`);
});

test("the three repaired detail authorities use matching xl breakpoints", () => {
  for (const file of [
    "src/app/(app)/purchase-orders/[id]/page.tsx",
    "src/app/(app)/purchase-requests/[id]/page.tsx",
    "src/app/(app)/roles/page.tsx",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /<Table\b[^>]*\bmobileHidden\b/);
    assert.match(source, /className="[^"]*xl:hidden[^"]*"\s+role="list"/);
  }
});
