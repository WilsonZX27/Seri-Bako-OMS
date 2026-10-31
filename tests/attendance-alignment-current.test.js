const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const load=require('./helpers/load-source.cjs')();
test('attendance review columns share fixed widths and sticky header/body edges',()=>{const s=fs.readFileSync('src/app/(app)/attendance/review/page.tsx','utf8');assert.match(s,/id="attendance-review-results"[^>]*table-fixed/);assert.match(s,/<colgroup>/);assert.match(s,/last:sticky last:right-0/);assert.match(s,/\[&_th\]:align-top/);});
test('attendance second-level durations retain exact positive/negative and OT-free values',()=>{const {durationLabel}=load('src/lib/attendance/calculation.ts');assert.equal(durationLabel(29),'00:00:29');assert.equal(durationLabel(3631),'01:00:31');assert.equal(durationLabel(-59),'-00:00:59');assert.equal(durationLabel(0),'00:00:00');});

test('break displays one normal-weight range with duration subtitle',()=>{const s=fs.readFileSync('src/app/(app)/attendance/review/page.tsx','utf8');assert.match(s,/Break Duration/);assert.match(s,/block whitespace-nowrap font-normal[^\n]+actual_break_out[^\n]+ - [^\n]+actual_break_in/);assert.doesNotMatch(s,/actual_break_out\)\)}<br\//);});
