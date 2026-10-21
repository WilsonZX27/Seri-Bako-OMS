const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]??{},Map,Set,Date,Intl});return exports;}
const {summarizeScheduleWeeks}=load('src/lib/attendance/schedule-summary.ts');
const row=(status,branch_id='a',revision=1)=>({status,branch_id,revision});
test('published and locked schedules never fall back to draft',()=>{
 assert.equal(summarizeScheduleWeeks([row('published')]),'published');
 assert.equal(summarizeScheduleWeeks([row('locked')]),'locked');
 assert.equal(summarizeScheduleWeeks([row('published'),row('locked','b')]),'published');
});
test('latest roster states preserve actionable and mixed states',()=>{
 assert.equal(summarizeScheduleWeeks([]),'not_started');
 for(const status of ['draft','submitted','returned','rejected','amendment_pending'])assert.equal(summarizeScheduleWeeks([row(status)]),status);
 assert.equal(summarizeScheduleWeeks([row('published'),row('draft','b')]),'mixed');
 assert.equal(summarizeScheduleWeeks([row('draft'),row('published','a',2)]),'published');
 assert.equal(summarizeScheduleWeeks([row('published','a',2),row('draft')]),'published');
});
test('workspace uses RLS-visible canonical states for the requested week and fails on read errors',async()=>{
 const calls=[];let error=null,count=1;
 const query={select:fields=>{calls.push(['select',fields]);return query},eq:(field,value)=>{calls.push(['eq',field,value]);return query},limit:()=>Promise.resolve({data:[row('published')],error,count})};
 const db={rpc:async()=>({data:{scheduleStatus:'draft',pendingApprovals:0},error:null}),from:name=>{calls.push(['from',name]);return query}};
 const {getAttendanceWorkspace}=load('src/server/queries/attendance.ts',{'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:x=>x},'@/lib/attendance/schedule-summary':{summarizeScheduleWeeks},'@/server/auth/permissions':{hasPermission:async(code)=>code==='attendance.read'}});
 const result=await getAttendanceWorkspace('2026-10-05');assert.equal(result.scheduleStatus,'published');assert.equal(result.pendingApprovals,0);
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='week_start'&&c[2]==='2026-10-05'));
 count=1001;await assert.rejects(()=>getAttendanceWorkspace('2026-10-05'),/too large/);count=1;
 error=Error('read failed');await assert.rejects(()=>getAttendanceWorkspace('2026-10-05'),/read failed/);
});
