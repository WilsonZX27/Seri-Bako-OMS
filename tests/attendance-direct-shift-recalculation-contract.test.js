const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/275_attendance_direct_shift_recalculation.sql","utf8");

test("attendance recalculation includes direct-time schedules",()=>{
  assert.match(migration,/left join public\.shift_templates t on t\.id=ar\.shift_template_id/);
  assert.match(migration,/coalesce\(ar\.custom_start,\(ar\.template_snapshot->>'planned_start'\)::time,t\.planned_start\)/);
  assert.match(migration,/coalesce\(ar\.custom_end,\(ar\.template_snapshot->>'planned_end'\)::time,t\.planned_end\)/);
  assert.match(migration,/schedule_source/);
});
