import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "globals.css"),
  "utf8",
);

test("dropdown-first filter controls stay compact on wider surfaces", () => {
  const selector = /\.sb-list-filters > :is\(select, \[data-select-control\]\):first-child/g;
  assert.equal((css.match(selector) ?? []).length, 2);
  assert.match(
    css,
    /\.sb-list-filters > :is\(select, \[data-select-control\]\):first-child[\s\S]*?max-width:\s*14rem/,
  );
});
