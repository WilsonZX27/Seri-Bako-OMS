const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const branchId='e8bea49b-f9d7-4691-b40d-0b5e91993770';
const assignments=[{staff_id:'dddc2b38-e153-4eaf-bd26-37224e5fa020',work_date:'2026-10-10',assignment_kind:'shift',destination_branch_id:'e2000000-0000-4000-8000-000000000001'}];
function route({role='manager',permission=true,error=null}={}) {
  const calls=[],exports={};
  const mocks={
    'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
    '@/server/http/request-security':{rejectCrossSiteMutation:()=>null},
    '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({roleCode:role})},
    '@/server/auth/permissions':{hasPermission:async()=>permission},
    '@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {error,data:{week:{status:'submitted'}}}}})},
    '@/lib/supabase/loose':{looseSupabase:x=>x},
    '@/server/observability/logger':{logServerError:()=>{}}
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/attendance/schedule/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n]??require(n),crypto:require('node:crypto').webcrypto});
  return {calls,post:()=>exports.POST({json:async()=>({action:'submit',branchId,weekStart:'2026-10-05',assignments,expectedUpdatedAt:'2026-10-10T08:46:55.902419+00:00'})})};
}
test('schedule submit sends destinations and original version in one atomic RPC',async()=>{
 const r=route();assert.equal((await r.post()).status,200);assert.equal(r.calls.length,1);
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
