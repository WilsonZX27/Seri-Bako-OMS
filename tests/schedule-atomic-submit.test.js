const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const branchId='e8bea49b-f9d7-4691-b40d-0b5e91993770';
const assignments=[{staff_id:'dddc2b38-e153-4eaf-bd26-37224e5fa020',work_date:'2026-10-10',assignment_kind:'shift',destination_branch_id:'e2000000-0000-4000-8000-000000000001'}];
function route({role='manager',permission=true,error=null,excludedStaffIds,permissionErrorAfterMutation=false}={}) {
  const calls=[],exports={};let permissionCalls=0;
  const mocks={
    'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
    '@/server/http/request-security':{rejectCrossSiteMutation:()=>null},
    '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({roleCode:role})},
    '@/server/auth/permissions':{hasPermission:async()=>{permissionCalls++;if(permissionErrorAfterMutation&&permissionCalls>1)throw new Error('Permission lookup unavailable');return permission;}},
    '@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {error,data:{week:{status:'submitted'}}}}})},
    '@/lib/supabase/loose':{looseSupabase:x=>x},
    '@/server/observability/logger':{logServerError:()=>{}}
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/attendance/schedule/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]??require(n),crypto:require('node:crypto').webcrypto});
  return {calls,post:()=>exports.POST({json:async()=>({action:'submit',excludedStaffIds,branchId,weekStart:'2026-10-05',assignments,expectedUpdatedAt:'2026-10-10T08:46:55.902419+00:00'})})};
}
test('schedule submit sends destinations and original version in one atomic RPC',async()=>{
 const r=route();assert.equal((await r.post()).status,200);assert.equal(r.calls.length,2);
 assert.equal(r.calls[1].name,"refresh_schedule_attendance");
 assert.equal(r.calls[0].name,'submit_schedule_week_atomic');
 assert.equal(r.calls[0].args.p_assignments[0].destination_branch_id,assignments[0].destination_branch_id);
 assert.equal(r.calls[0].args.p_expected_updated_at,'2026-10-10T08:46:55.902419+00:00');
});
test('stale schedule submission remains a conflict without a preceding save',async()=>{
 const r=route({error:{message:'Schedule changed since it was opened.'}});const result=await r.post();assert.equal(result.status,409);assert.match(result.body.message,/another session/);assert.equal(r.calls.length,1);
});
test('schedule submission preserves role and permission denial before writes',async()=>{
 for(const options of [{role:'kitchen'},{permission:false}]){const r=route(options);assert.equal((await r.post()).status,403);assert.equal(r.calls.length,0);}
});

test('explicit week removals use the atomic roster RPC without changing legacy clients',async()=>{
 const removed='e3000000-0000-4000-8000-000000000001';const r=route({excludedStaffIds:[removed]});assert.equal((await r.post()).status,200);assert.equal(r.calls[0].name,'submit_schedule_week_roster');assert.deepEqual(Array.from(r.calls[0].args.p_excluded_staff_ids),[removed]);assert.equal(r.calls[0].args.p_assignments.length,1);
});
test('empty exclusions explicitly restore roster membership',async()=>{
 const r=route({excludedStaffIds:[]});assert.equal((await r.post()).status,200);assert.equal(r.calls[0].name,'submit_schedule_week_roster');assert.equal(r.calls[0].args.p_excluded_staff_ids.length,0);
});

test('a post-commit permission lookup failure reports the saved schedule and never invites a blind retry',async()=>{
 const r=route({permissionErrorAfterMutation:true});const result=await r.post();
 assert.equal(result.status,200);
 assert.equal(result.body.ok,true);
 assert.equal(result.body.attendanceRefresh.status,'pending');
 assert.match(result.body.attendanceRefresh.message,/Schedule saved/);
 assert.doesNotMatch(result.body.attendanceRefresh.message,/retry/i);
 assert.equal(r.calls.length,1);
 assert.equal(r.calls[0].name,'submit_schedule_week_atomic');
});
