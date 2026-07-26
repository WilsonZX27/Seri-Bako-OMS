const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const globals = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8");
const input = fs.readFileSync(path.join(root, "src", "components", "ui", "input.tsx"), "utf8");
const tabs = fs.readFileSync(path.join(root, "src", "components", "status-tabs.tsx"), "utf8");

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(tsx|ts)$/.test(entry.name) ? [target] : [];
  });
}

test("all date inputs inherit shrink-safe shared geometry", () => {
  const files = sourceFiles(path.join(root, "src"));
  const dateFiles = files.filter((file) => fs.readFileSync(file, "utf8").includes('type="date"'));
  const dateCount = dateFiles.reduce((count, file) => count + (fs.readFileSync(file, "utf8").match(/type="date"/g) ?? []).length, 0);
  assert.ok(dateFiles.length >= 20, `expected broad date coverage, found ${dateFiles.length} files`);
  assert.ok(dateCount >= 32, `expected broad date coverage, found ${dateCount} fields`);
  for (const file of dateFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /type="date"[^>]*className="[^"]*(?:min-w-\[|w-\[)/, path.relative(root, file));
  }
  assert.match(input, /w-full min-w-0 max-w-full/);
  assert.match(globals, /input\[type="date"\][\s\S]*?inline-size: 100%[\s\S]*?min-inline-size: 0/);
});

test("phone filters and status tabs retain 44px-class touch targets", () => {
  assert.match(globals, /@media \(max-width: 767px\)[\s\S]*?\.sb-list-filters input,[\s\S]*?height: var\(--sb-control-height\);[\s\S]*?min-height: var\(--sb-control-height\);/);
  assert.match(tabs, /min-h-\[var\(--sb-control-height\)\]/);
});

test("iOS date text and picker indicator remain readable", () => {
  assert.match(globals, /input\[type="date"\]::-[\w-]*date-and-time-value[\s\S]*?text-align: left/);
  assert.match(globals, /input\[type="date"\]::-[\w-]*calendar-picker-indicator[\s\S]*?padding: 0\.25rem/);
  assert.match(globals, /font-variant-numeric: tabular-nums/);
});
