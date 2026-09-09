const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/277_attendance_recalculation_revision_sequence.sql","utf8");

test("attendance recalculation revisions continue from immutable history",()=>{
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/coalesce\(max\(calculation_revision\),0\)\+1/);
  assert.doesNotMatch(migration,/revision_no:=coalesce\(revision_no,0\)\+1/);
});
