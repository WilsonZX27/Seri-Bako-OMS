const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const app = (route) => fs.readFileSync(path.join(__dirname, "..", "src/app/(app)", route, "page.tsx"), "utf8");

test("high-frequency administration registers show a consistent filter result summary", () => {
  for (const [route, label] of [["branches", "Branches"], ["staffs", "Staff members"], ["document-sequences", "Document sequences"]]) {
    const source = app(route);
    assert.match(source, /resultCount=\{(?:branches|staffs|sequences)\.length\}/, `${route}: result count`);
    assert.match(source, /filtered=\{filtered\}/, `${route}: reset state`);
    assert.match(source, new RegExp(`aria-label="${label}"`), `${route}: accessible table label`);
    assert.doesNotMatch(source, /<div className="overflow-x-auto">/, `${route}: shared table owns scrolling`);
  }
});
