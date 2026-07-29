const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync("src/app/(app)/activity/page.tsx", "utf8");

test("activity uses the shared compact operational list on phones", () => {
  assert.match(source, /<OperationalList ariaLabel="Recent activity"/);
  assert.match(source, /<OperationalListRow/);
  assert.match(source, /primary=\{activity\.message\}/);
  assert.match(source, /secondary=\{messageIncludesActor \? activity\.entity_type : `\$\{actor\} · \$\{activity\.entity_type\}`\}/);
  assert.match(source, /data-activity-desktop-list className="hidden divide-y md:block"/);
});

test("activity only exposes the contextual mobile console after a row is selected", () => {
  assert.match(source, /hideMobileConsole=\{!selected\}/);
  assert.match(source, /href=\{`\/activity\?selected=\$\{activity\.id\}`\}/);
});
