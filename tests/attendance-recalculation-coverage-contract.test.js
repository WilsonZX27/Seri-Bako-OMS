const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/278_attendance_recalculation_coverage_suppression.sql","utf8");

test("manual attendance recalculation preserves incomplete punch coverage",()=>{
  assert.match(migration,/batch\.source_metadata->'coverage_by_date'/);
  assert.match(migration,/suppressed_missing_punch_result/);
  assert.match(migration,/r\.actual_first_in is null/);
  assert.match(migration,/set is_current=false/);
});
