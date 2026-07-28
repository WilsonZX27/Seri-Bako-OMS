const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(process.cwd(), "src/server/actions/outlet-daily-records.ts"), "utf8");

test("outlet daily records validate header, status, line cardinality, and quantity bounds before RPC use", () => {
  assert.match(source, /const outletDailyPayloadSchema = z\.object/);
  assert.match(source, /z\.array\(outletDailyLineSchema\)\.min\(1\)\.max\(500\)/);
  assert.match(source, /z\.coerce\.number\(\)\.finite\(\)\.min\(0\)\.max\(1_000_000\)/);
  assert.match(source, /outletDailyStatusSchema = z\.enum\(\["draft", "morning_recorded", "evening_completed"\]\)/);
  assert.match(source, /payload = extractOutletDailyPayload\(formData\)/);
  assert.match(source, /p_lines: payload\.lines/);
});
