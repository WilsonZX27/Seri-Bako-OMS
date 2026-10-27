const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const classify=require('./helpers/load-source.cjs')()('src/lib/http/session-result.ts');
function compile(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require:id=>mocks[id]??{}});return exports;}
function middlewareHarness(results,options={}){let lookups=0,signouts=0;const writes=[];const cookieJar={getAll:()=>[],set:(...x)=>writes.push(x)};const reply=(kind,status=200,body)=>({kind,status,body,cookies:cookieJar});const response={next:()=>reply('next'),json:(body,o)=>reply('json',o.status,body),redirect:()=>reply('redirect',307)};
 const query={select(){lookups++;return query},eq(){return query},maybeSingle:async()=>({data:options.missingProfile?null:{id:'fixture',status:options.status??'active',staff_roles:[]},error:null})};
 const middleware=compile('src/lib/supabase/middleware.ts',{
 'next/server':{NextResponse:response},'@supabase/ssr':{createServerClient:(_u,_k,options)=>({auth:{getClaims:async()=>{const result=results.shift();if(result instanceof Error)throw result;if(result.refresh)options.cookies.setAll([{name:'synthetic-refresh',value:'fixture-only',options:{}}]);return result},signOut:()=>signouts++},from:()=>query})},
 '@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/env':{requireSupabaseEnv:()=>({url:'https://fixture.invalid',publishableKey:'fixture-only'})},'@/server/auth/route-permissions':{getRouteAllowedRoles:()=>null,getRoutePermissionCodes:()=>options.protected?['fixture.view']:null},'@/server/auth/permissions':{resolveEffectivePermission:async()=>options.allowed!==false},'@/server/auth/route-resolver':compile('src/server/auth/route-resolver.ts',{'@/lib/information-architecture':{getLandingIaItems:()=>[]}}),'@/lib/roles':{isSystemRoleCode:()=>false},'@/lib/utils':{getToday:()=> '2026-10-27'},'@/lib/http/session-result':classify,
 });return {run:path=>middleware.updateSession({url:'https://fixture.invalid'+path,nextUrl:{pathname:path},cookies:cookieJar}),stats:()=>({lookups,signouts,writes})};}
test('middleware temporary Auth and refresh failures deny processing without claiming expiry; next successful refresh resumes',async()=>{
 for(const failure of [{data:null,error:{status:503}},{data:null,error:{name:'AuthRetryableFetchError'}},new Error('synthetic network')]){
 const h=middlewareHarness([failure,{data:{claims:{sub:'fixture'}},error:null,refresh:true}]);
 const failed=await h.run('/api/fixture');assert.equal(failed.status,503);assert.doesNotMatch(failed.body.message,/expired/i);assert.equal(h.stats().lookups,0);assert.equal(h.stats().signouts,0);
 const recovered=await h.run('/dashboard');assert.equal(recovered.kind,'next');assert.equal(h.stats().lookups,1);assert.ok(h.stats().writes.some(x=>x[0]==='synthetic-refresh'));assert.equal(h.stats().signouts,0);
 }});
test('middleware actual absence or rejected session retains login and401 protections',async()=>{
 for(const error of [null,{name:'AuthSessionMissingError'},{status:401}]){const h=middlewareHarness([{data:null,error},{data:null,error}]);assert.equal((await h.run('/api/fixture')).status,401);assert.equal((await h.run('/dashboard')).kind,'redirect');assert.equal(h.stats().lookups,0);}
});
function profileHarness(result,staffError=null){return compile('src/server/queries/common.ts',{'react':{cache:f=>f},'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/http/session-result':classify,'@/server/queries/auth-user':{getCurrentAuthUser:async()=>result},'@/lib/supabase/server':{createClient:async()=>({from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:staffError})})})}}).getCurrentProfile;}
test('SSR profile transient user or profile read failure throws unavailable rather than returning unauthenticated',async()=>{
 await assert.rejects(profileHarness({data:{user:null},error:{status:503}})(),/verification.*unavailable/i);
 await assert.rejects(profileHarness({data:{user:{id:'fixture'}},error:null},{message:'fixture offline'})(),/profile.*unavailable/i);
 for(const error of [null,{status:401},{name:'AuthSessionMissingError'}])assert.equal(await profileHarness({data:{user:null},error})(),null);
});

test('verified claims do not bypass disabled, missing profile, or denied tenant permission boundaries',async()=>{
 for(const options of [{status:'disabled'},{status:'inactive'},{status:'archived'},{missingProfile:true},{protected:true,allowed:false}]){
 const h=middlewareHarness([{data:{claims:{sub:'fixture'}},error:null}],options);const result=await h.run('/api/fixture');assert.ok([401,403].includes(result.status));assert.equal(result.kind,'json');assert.doesNotMatch(JSON.stringify(result.body),/staff_roles|fixture-user|company_id/);assert.equal(h.stats().signouts,0);
 }
});
