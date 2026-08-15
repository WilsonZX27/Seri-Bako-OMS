const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("mobile date-first filters keep an explicit readable date affordance", () => {
  const component = fs.readFileSync(path.join(root, "src", "components", "common", "UnifiedListHeader.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "src", "app", "design-system-v2.css"), "utf8");
  const outletPage = fs.readFileSync(path.join(root, "src", "app", "(app)", "outlet-daily-records", "page.tsx"), "utf8");

  assert.match(component, /CalendarDays[\s\S]*unified-list-date-placeholder[\s\S]*Any date/);
  assert.match(component, /data-empty=\{!value \|\| undefined\}/);
  assert.match(component, /props\.type === "date"[\s\S]*value,[\s\S]*onChange:/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*\.unified-list-date-control input\[type="date"\]/);
  assert.match(styles, /\.unified-list-date-control input\[type="date"\][\s\S]*width: 100% !important/);
  assert.match(styles, /\.unified-list-date-placeholder[\s\S]*pointer-events: none/);
  assert.match(outletPage, /className="sb-list-filters--date-first"/);
});
