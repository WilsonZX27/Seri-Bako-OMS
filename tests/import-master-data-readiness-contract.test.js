const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("master-data import guidance keeps blank supplier and stock-take quantities fail-closed", () => {
  const config = read("src", "lib", "imports", "config.ts");
  const playbook = read("docs", "MASTER_DATA_IMPORT_READINESS.md");

  assert.match(config, /Blank supplier cells remain item-master data only/);
  assert.match(config, /Do not convert blank supplier cells into a made-up supplier code/);
  assert.match(playbook, /all 127 quantity cells are blank/);
  assert.match(playbook, /Never translate blank quantities into zero/);
});
