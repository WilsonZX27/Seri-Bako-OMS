/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness uses CommonJS. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/components/attendance/schedule-workbook-import.tsx','utf8');
test('result is in nonshrinking footer, outside long review scroll region',()=>{
 const scroll=source.indexOf('<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">'),footer=source.indexOf('<footer className="shrink-0'),message=source.indexOf('{message && !(preview?.issues.length');
 assert.ok(scroll>0&&footer>scroll&&message>footer);assert.equal((source.match(/\{message\}<\/p>/g)||[]).length,1);
 assert.match(source.slice(footer,message),/bg-white/);assert.match(source.slice(message,message+850),/aria-live="polite" aria-atomic="true"/);
 assert.match(source.slice(message,message+850),/basis-full max-h-24 overflow-y-auto break-words/);
});
test('source warnings and exact successful result survive movement',()=>{
 assert.match(source,/aria-label="Source issues"/);assert.match(source,/preview\.issues\.reduce/);
 assert.match(source,/Unresolved days stay empty\. Published and locked schedules are protected\./);
 assert.match(source,/pending\.length \+ " outlets and " \+ savedAssignments/);
 assert.match(source,/Employees can see the shifts after the schedule is published\./);
});
