const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {NextRequest,NextResponse}=require('next/server'),load=require('./helpers/load-source.cjs')({URL,Request,Response,Headers});
const {sessionVerificationState}=load('src/lib/http/session-result.ts');
function harness({error=null,throws=false,sub=null,cookieUpdate=false,profileError=false,status='active',allowed=true}={}){
 let lookups=0,authCalls=0;const out={};
 const deps={'next/server':{NextResponse},'@supabase/ssr':{createServerClient:(_u,_k,options)=>({auth:{getClaims:async()=>{authCalls++;if(cookieUpdate)options.cookies.setAll([{name:'synthetic-session',value:sub?'synthetic-rotated':'',options:{path:'/',httpOnly:true,sameSite:'lax',maxAge:sub?3600:0}}]);if(throws)throw error;return {data:sub?{claims:{sub}}:null,error};}},from:()=>{lookups++;const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'synthetic-staff',status,staff_roles:[]},error:profileError?{message:'PRIVATE-PROFILE-ERROR'}:null})};return q;}})},'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/env':{requireSupabaseEnv:()=>({url:'https://synthetic.invalid',publishableKey:'synthetic-key'})},'@/lib/http/session-result':{sessionVerificationState},'@/lib/http/session-recovery':load('src/lib/http/session-recovery.ts'),'@/lib/business-date':{todayInKualaLumpur:()=> '2026-11-01'},'@/server/auth/route-resolver':load('src/server/auth/route-resolver.ts'),'@/server/auth/route-permissions':{getRouteAllowedRoles:()=>null,getRoutePermissionCodes:()=>['fixture.read']},'@/server/auth/permissions':{resolveEffectivePermission:async()=>allowed},'@/lib/roles':{isSystemRoleCode:()=>false},'@/lib/utils':{getToday:()=> '2026-11-01'}};
 // The response helper is new; baseline execution intentionally cannot resolve it yet.
 const helper='src/lib/http/session-response.ts';if(fs.existsSync(helper))deps['@/lib/http/session-response']=load(helper);
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/supabase/middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,URL,require:n=>deps[n]??{}});
 return{stats:()=>({lookups,authCalls}),run:(path='/dashboard',method='GET',headers={})=>out.updateSession(new NextRequest('https://oms.invalid'+path,{method,headers:{accept:'text/html',...headers}}))};
}
test('only definitive invalid session errors require reauthentication; unknown faults remain unavailable',()=>{
 for(const code of ['refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','invalid_jwt','bad_jwt'])assert.equal(sessionVerificationState(null,{status:400,code}),'expired',code);
 assert.equal(sessionVerificationState(null,{name:'AuthInvalidJwtError',status:400}),'expired');
 for(const error of [{status:400},{status:403},{status:429},{status:503},{code:'unexpected_failure'},{name:'AuthRetryableFetchError'},{name:'SyntaxError'}])assert.equal(sessionVerificationState(null,error),'unavailable');
 assert.equal(sessionVerificationState({id:'verified'}, {code:'invalid_jwt'}),'active');
});
test('old bookmark with invalid refresh redirects safely and propagates SDK cleanup; /login never loops',async()=>{
 const h=harness({error:{status:400,code:'refresh_token_not_found'},cookieUpdate:true}),r=await h.run('/asset-management?private=ignored');assert.equal(r.status,307);const url=new URL(r.headers.get('location'));assert.equal(url.pathname,'/login');assert.equal(url.searchParams.get('returnTo'),'/asset-management');assert.equal(r.cookies.get('synthetic-session').value,'');assert.equal(r.cookies.get('synthetic-session').httpOnly,true);assert.equal(r.cookies.get('synthetic-session').sameSite,'lax');assert.equal(r.cookies.get('synthetic-session').path,'/');assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(h.stats().lookups,0);
 assert.equal((await h.run('/login')).headers.get('x-middleware-next'),'1');assert.equal(h.stats().authCalls,1);
});
test('invalid session API and mutations return401 without redirects/replay and retain SDK cookie updates',async()=>{
 for(const [path,method]of [['/api/fixture','GET'],['/dashboard','POST'],['/api/fixture','POST']]){const h=harness({error:{status:400,code:'refresh_token_already_used'},cookieUpdate:true}),r=await h.run(path,method);assert.equal(r.status,401);assert.equal(r.headers.get('location'),null);assert.ok(r.cookies.get('synthetic-session'));assert.equal(h.stats().lookups,0);assert.match(r.headers.get('cache-control'),/no-store/);}
});
test('definitive thrown JWT/refresh errors retain classification instead of becoming generic outages',async()=>{
 const h=harness({error:Object.assign(new Error('PRIVATE-AUTH-ERROR'),{name:'AuthInvalidJwtError',status:400,code:'invalid_jwt'}),throws:true});assert.equal((await h.run()).status,307);assert.equal(h.stats().lookups,0);
});
test('document outages give recoverable503 HTML and optional safe sign-in, never protected content',async()=>{
 for(const error of [{status:503},{status:400,code:'unexpected_failure'},{name:'AuthRetryableFetchError'}]){const h=harness({error,cookieUpdate:true}),r=await h.run('/dashboard');assert.equal(r.status,503);assert.match(r.headers.get('content-type'),/text\/html/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('retry-after'),'5');assert.ok(r.cookies.get('synthetic-session'));const html=await r.text();assert.match(html,/Retry this page/);assert.match(html,/Sign in again/);assert.doesNotMatch(html,/<script|http-equiv="refresh"|PRIVATE-|synthetic-staff/);assert.equal(h.stats().lookups,0);}
});
test('API/RSC/non-HTML/HEAD/mutation outage responses remain503 JSON with cookie updates',async()=>{
 for(const [path,method,headers]of [['/api/fixture','GET',{}],['/dashboard','POST',{}],['/dashboard','GET',{rsc:'1'}],['/dashboard','GET',{accept:'application/json'}],['/dashboard','HEAD',{}]]){const h=harness({error:{status:503},cookieUpdate:true}),r=await h.run(path,method,headers);assert.equal(r.status,503);assert.match(r.headers.get('content-type'),/application\/json/);assert.equal(r.headers.get('location'),null);assert.ok(r.cookies.get('synthetic-session'));assert.equal((await r.json()).ok,false);}
});
test('network throws fail closed while a later successful refresh resumes existing authorization',async()=>{
 const failed=harness({error:new TypeError('synthetic network'),throws:true});assert.equal((await failed.run()).status,503);assert.equal(failed.stats().lookups,0);
 const good=harness({sub:'verified',cookieUpdate:true}),r=await good.run();assert.equal(r.headers.get('x-middleware-next'),'1');assert.equal(r.cookies.get('synthetic-session').value,'synthetic-rotated');assert.equal(good.stats().lookups,1);
});
test('valid refresh denied/profile-error paths also preserve rotated cookies and keep proper status',async()=>{
 for(const opts of [{allowed:false},{status:'disabled'},{status:'inactive'}]){const h=harness({sub:'verified',cookieUpdate:true,...opts}),r=await h.run('/api/fixture');assert.ok([401,403].includes(r.status));assert.equal(r.headers.get('location'),null);assert.equal(r.cookies.get('synthetic-session').value,'synthetic-rotated');}
 const h=harness({sub:'verified',cookieUpdate:true,profileError:true}),r=await h.run();assert.equal(r.status,503);assert.match(r.headers.get('content-type'),/text\/html/);assert.equal(r.cookies.get('synthetic-session').value,'synthetic-rotated');assert.doesNotMatch(await r.text(),/PRIVATE-PROFILE/);
});
test('public login/reset/callback stay reachable without Auth calls or unnecessary cookie deletion',async()=>{
 const h=harness({error:new Error('must not call'),throws:true,cookieUpdate:true});for(const path of ['/login','/forgot-password','/auth/callback']){const r=await h.run(path);assert.equal(r.headers.get('x-middleware-next'),'1');assert.equal(r.cookies.getAll().length,0);}assert.equal(h.stats().authCalls,0);
});
