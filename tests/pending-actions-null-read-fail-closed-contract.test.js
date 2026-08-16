import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/server/queries/pending-actions.ts", "utf8");

test("pending workflow actions do not turn null rows or counts into an empty queue", () => {
  assert.match(source, /if \(!data \|\| count === null\)/);
  assert.match(source, /count: null, unavailable: true/);
  assert.match(source, /total: unavailable \? null/);
});
