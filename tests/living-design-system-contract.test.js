import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const design = fs.readFileSync("DESIGN.md", "utf8");
const system = fs.readFileSync("docs/DESIGN_SYSTEM.md", "utf8");

test("living design contract keeps browser full-height independent from installation", () => {
  assert.match(design, /Browser-Native Mobile Canvas/);
  assert.match(design, /document-level scrolling/);
  assert.match(system, /Installed standalone mode is optional/);
});

test("performance contract covers interaction latency and bounded ledgers", () => {
  assert.match(system, /INP `<= 200ms`/);
  assert.match(system, /Ledger\/history filters default to a useful bounded period/);
  assert.match(design, /may not read an entire ledger view/);
});
