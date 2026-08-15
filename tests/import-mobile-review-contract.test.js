const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(process.cwd(), "src/components/imports/import-workflow.tsx"), "utf8");

test("import review keeps the spreadsheet grid for wider workspaces and a labeled phone editor", () => {
  assert.match(source, /className="hidden overflow-x-auto md:block"[\s\S]*?<Table>/);
  assert.match(source, /data-import-row-list/);
  assert.match(source, /spec\.headers\.map\(\(header\) => \([\s\S]*?<label key=\{header\}/);
  assert.match(source, /updateCell\(rowIndex, header, event\.target\.value\)/);
  assert.match(source, /Upload a CSV or XLSX file to start reviewing data\./);
});

test("desktop and phone row reviews share one validation authority", () => {
  assert.match(source, /const rowValidationMessage = \(row: RowState\)/);
  assert.equal((source.match(/rowValidationMessage\(row\)/g) ?? []).length, 2);
  assert.match(source, /Supplier code will be verified on import/);
});

test("server-rejected import rows retain complete values in a phone issue list", () => {
  assert.match(source, /data-import-error-list/);
  assert.match(source, /result\.errorRows\.map/);
  assert.match(source, /Object\.entries\(row\.values\)\.map/);
  assert.match(source, /<dt className="font-medium text-muted-foreground">\{key\}<\/dt>/);
  assert.match(source, /<dd className="min-w-0 break-words text-foreground">\{value \|\| "-"\}<\/dd>/);
});
