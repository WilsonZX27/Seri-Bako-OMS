const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("lightweight master-data forms keep their submit action above mobile navigation", () => {
  for (const file of ["src/components/document-sequence-form.tsx", "src/components/master-data-forms.tsx"]) {
    const source = read(file);
    assert.match(source, /sb-mobile-action-bar fixed inset-x-3 bottom-\[calc\(env\(safe-area-inset-bottom\)\+0\.5rem\)\]/, file);
    assert.match(source, /pb-20 md:/, file);
  }
});

test("the lightweight form actions return to their original desktop placement", () => {
  const source = read("src/components/master-data-forms.tsx");
  assert.match(source, /md:static md:flex md:justify-end/);
  assert.match(source, /md:w-auto/);
});
