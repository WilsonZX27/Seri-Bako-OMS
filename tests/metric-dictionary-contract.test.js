import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dictionary = fs.readFileSync("docs/analytics/METRIC_DICTIONARY.md", "utf8");

const metricIds = [
  "action_resolution_time",
  "pr_to_po_conversion",
  "receiving_fulfilment",
  "daily_record_coverage",
  "wastage_rate",
  "count_recurrence",
  "supplier_mapping_coverage",
  "ux_escape_rate",
];

test("phase 1 decision metrics have an explicit contract", () => {
  for (const metricId of metricIds) assert.ok(dictionary.includes(`| \`${metricId}\` |`), `missing ${metricId}`);
  assert.match(dictionary, /definition-only release/);
  assert.ok(dictionary.includes("Unavailable") && /rather\r?\nthan zero/.test(dictionary));
  assert.match(dictionary, /UOM/);
  assert.match(dictionary, /unavailable_reason/);
  assert.match(dictionary, /denominator/);
  assert.match(dictionary, /Drill-through/);
});

test("metric dictionary refuses production/freshness overclaims", () => {
  assert.match(dictionary, /production promotion is not/);
  assert.match(dictionary, /Request-time/);
  assert.match(dictionary, /browser render time/);
});
