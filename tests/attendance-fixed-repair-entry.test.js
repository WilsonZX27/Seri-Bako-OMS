const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm'),path=require('path'),{createRequire}=require('module');
const repo=path.resolve(__dirname,'..'),rq=createRequire(repo+'/package.json'),ts=rq('typescript'),{createClient}=rq('@supabase/supabase-js');
const root=repo,source=fs.readFileSync(root+'/src/app/api/attendance/recalculate/route.ts','utf8'),rows=[];
const transformed=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true},reportDiagnostics:true});
if(transformed.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('TS syntax failed');
const state={active:true,allowed:true,company:'3b104582-f8cb-4a4d-867f-b99e5ffc6486',cross:false,network:false,probe:-3050319},calls=[];
const client=createClient('http://127.0.0.1:9','synthetic-not-a-credential',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(url,init)=>{const h=new Headers(init.headers),marker=h.get('x-oms-attendance-repair');calls.push({path:new URL(url).pathname,body:JSON.parse(init.body),marker});if(state.network)throw Error('Synthetic transport failure');return new Response(JSON.stringify(marker?.endsWith('/probe')?state.probe:305),{status:200,headers:{'Content-Type':'application/json'}})}}});
const processMock={env:{OMS_FIXED_ATTENDANCE_REPAIR_V3:'verified-installed-v3'}},routeExports={};
const mocks={'next/server':{NextResponse:{json:(v,o={})=>new Response(JSON.stringify(v),{status:o.status??200,headers:{'Content-Type':'application/json'}})}},'zod':rq('zod'),'@/lib/supabase/server':{createClient:async()=>client},'@/server/http/request-security':{rejectCrossSiteMutation:()=>state.cross?new Response('Denied',{status:403}):null},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>{if(!state.active)throw Error('No active staff');return {companyId:state.company,staffId:'synthetic',roleCode:'people_operations'}}},'@/server/auth/permissions':{hasPermission:async()=>state.allowed},'@/server/observability/logger':{logServerError:()=>{}}};
vm.runInNewContext(transformed.outputText,{exports:routeExports,require:n=>{if(!(n in mocks))throw Error('Unexpected import '+n);return mocks[n]},process:processMock,Response,Request,Boolean,Number},{filename:'scoped-repair-route.js'});
const B='34ffbb89-be58-4d74-b6ed-a8ab3a25cda5',post=v=>routeExports.POST(new Request('http://localhost/api/attendance/recalculate',{method:'POST',body:JSON.stringify(v),headers:{'Content-Type':'application/json'}}));
test('fixed attendance repair uses the existing authenticated SDK without normal-path changes',async t=>{
 const ok=async(n,v)=>t.test(n,()=>assert.ok(v));
 let r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('real SDK per-call marker + null safety sentinel',r.status===200&&calls.at(-1).marker==='oms305-20261019-v3/run'&&calls.at(-1).body.p_batch_id===null);
 await post({batchId:B});await ok('ordinary request has no leaked header and unchanged batch',calls.at(-1).marker===null&&calls.at(-1).body.p_batch_id===B);
 let n=calls.length;r=await post({batchId:B,repair:'wrong'});await ok('unknown repair choice rejected before RPC',r.status===400&&calls.length===n);
 r=await post({batchId:'aaaaaaaa-0000-4000-8000-000000000001',repair:'oms305-20261019-v3/run'});await ok('wrong batch rejected before RPC',r.status===403&&calls.length===n);
 state.company='foreign';r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('foreign tenant rejected before RPC',r.status===403&&calls.length===n);state.company='3b104582-f8cb-4a4d-867f-b99e5ffc6486';
 state.allowed=false;r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('existing permission denial rejects before RPC',r.status===403&&calls.length===n);state.allowed=true;
 state.cross=true;r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('existing same-origin protection kept',r.status===403&&calls.length===n);state.cross=false;
 delete processMock.env.OMS_FIXED_ATTENDANCE_REPAIR_V3;r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('default off gate never calls DB',r.status===503&&calls.length===n);
 r=await routeExports.GET();await ok('read-only capability reports disabled without mutation',(await r.json()).enabled===false&&calls.length===n);processMock.env.OMS_FIXED_ATTENDANCE_REPAIR_V3='verified-installed-v3';
 r=await routeExports.GET();await ok('read-only backend probe uses null batch marker',(await r.json()).enabled===true&&calls.at(-1).marker.endsWith('/probe')&&calls.at(-1).body.p_batch_id===null);
 state.probe=0;r=await routeExports.GET();await ok('backend unavailable probe is not reported enabled',(await r.json()).enabled===false);state.probe=-3050319;
 state.network=true;n=calls.length;r=await post({batchId:B,repair:'oms305-20261019-v3/run'});await ok('unknown transport outcome reported, POST not retried',r.status===500&&(await r.json()).outcome==='unknown'&&calls.length===n+1);state.network=false;
 await post({batchId:B,repair:'oms305-20261019-v3/restore'});await ok('restore is explicit same authenticated SDK path',calls.at(-1).marker.endsWith('/restore')&&calls.at(-1).body.p_batch_id===null);

});
