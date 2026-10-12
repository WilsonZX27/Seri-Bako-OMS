const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load({allowed=true,count=4}={}) {
 const calls=[],module={exports:{}}; const rows=[{id:'missing',statuses:['missing_punches']},{id:'conflict',statuses:['unpaid_leave','unpaid_leave_punch_conflict']},{id:'resolved',statuses:['normal'],attendance_exceptions:[{severity:'blocker',resolved_at:'2026-10-02'}]},{id:'other',statuses:['normal'],attendance_exceptions:[{severity:'blocker',resolved_at:null}]}];
 const query={then:(resolve,reject)=>Promise.resolve({data:rows,error:null,count}).then(resolve,reject)};
 for(const method of ['select','eq','gte','lte','order','limit'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
 const db={from:()=>query};
 const requireModule=name=>name.includes('supabase/server')?{createClient:async()=>db}:name.includes('supabase/loose')?{looseSupabase:value=>value}:name.includes('auth/permissions')?{hasPermission:async()=>allowed}:{};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/attendance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:requireModule,Date,Intl,Set});return {get:module.exports.getAttendanceWeekBlockers,calls};
}
test('close-week includes all current outlet-week blockers without employee filters or paging',async()=>{const h=load(),rows=await h.get('2026-09-28','outlet');assert.deepEqual(Array.from(rows,row=>row.id),['missing','conflict','other']);assert.ok(h.calls.some(call=>call[0]==='lte'&&call[2]==='2026-10-04'));assert.ok(h.calls.some(call=>call[0]==='eq'&&call[1]==='branch_id'&&call[2]==='outlet'));assert.ok(!h.calls.some(call=>call[1]==='staff_id'));});
test('close-week requires permission and fails safely on oversized result sets',async()=>{await assert.rejects(()=>load({allowed:false}).get('2026-09-28','outlet'),/Missing permission/);await assert.rejects(()=>load({count:10001}).get('2026-09-28','outlet'),/too large/);});
