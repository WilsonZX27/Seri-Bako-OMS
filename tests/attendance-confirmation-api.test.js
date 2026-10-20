const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(kind,{active=true,people=false,error=null}={}) {
 const calls=[],module={exports:{}};
 const query={select(){return query;},order(){return query;},limit(){return Promise.resolve({data:[],error});}};
 const db={from(table){calls.push({table});return query;},async rpc(name,args){calls.push({name,args});return {data:name==='attestation_people'?people:name==='get_attendance_confirmations'?[]:false,error};}};
 class NextResponse extends Response {static json(data,init){return new NextResponse(JSON.stringify(data),init);}}
 const req=name=>name==='next/server'?{NextResponse}:name==='zod'?require('zod'):name.includes('supabase/server')?{createClient:async()=>db}:name.includes('supabase/loose')?{looseSupabase:x=>x}:name.includes('tenant-actor')?{requireActiveTenantActor:async()=>{if(!active)throw Error('inactive');return {};}}:(()=>{throw Error(name)})();
 const path=kind==='attendance'?'src/app/api/attendance/confirmations/route.ts':'src/app/api/people/payslips/route.ts';
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:req,URL});
 return {...module.exports,calls};
}
const id='00000000-0000-4000-8000-000000000001';
const request=(value,origin='https://oms.example')=>new Request('https://oms.example/api/test',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(value)});
for(const kind of ['attendance','payroll']) {
 test(`${kind}: inactive sessions and cross-origin commands cannot reach mutations`,async()=>{
  const inactive=load(kind,{active:false});assert.equal((await inactive.GET()).status,403);assert.equal(inactive.calls.length,0);
  const h=load(kind);assert.equal((await h.POST(request({},'https://evil.example'))).status,403);assert.equal(h.calls.length,0);
 });
 test(`${kind}: reads are uncached, malformed commands rejected, missing migration fails closed`,async()=>{
  const h=load(kind);assert.equal((await h.GET()).headers.get('cache-control'),'private, no-store');assert.equal((await h.POST(request({action:'release'}))).status,400);
  assert.equal((await load(kind,{error:{code:'42883'}}).GET()).status,503);
 });
}
test('attendance dispatch strips foreign fields and binds confirmation to submitted version',async()=>{
 const h=load('attendance');const r=await h.POST(request({action:'check',id,hash:'a'.repeat(64),salary:9999,staff:id}));assert.equal(r.status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])),{name:'review_attendance_confirmation',args:{p_id:id,p_hash:'a'.repeat(64),p_action:'check',p_branch:null,p_reason:null}});
});
test('payroll mutations require positive People authorization before the database workflow RPC',async()=>{
 const body={action:'release',id,version:1},h=load('payroll');assert.equal((await h.POST(request(body))).status,403);assert.equal(h.calls.length,1);
 const allowed=load('payroll',{people:true});assert.equal((await allowed.POST(request(body))).status,200);assert.equal(allowed.calls[1].name,'advance_employee_payslip');
});
