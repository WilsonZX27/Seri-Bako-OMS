const test=require('node:test'),assert=require('node:assert/strict');
const {safeAttendanceError}=require('./helpers/load-source.cjs')()('src/lib/attendance/safe-error.ts');
test('safe business errors exclude database details',()=>{assert.equal(safeAttendanceError({message:'A rejection comment is required.',details:'private'},'Failed'),'A rejection comment is required.');assert.equal(safeAttendanceError({message:'SQL schema secret',details:'private'},'Failed'),'Failed');});
test('self-review denial explains reject as well as approve without changing rule',()=>{assert.match(safeAttendanceError({message:'A submitter cannot approve their own entry.'},'Failed'),/cannot review your own request/);});
