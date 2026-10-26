const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const load = require('./helpers/load-source.cjs');

test('presentation distinguishes verified user, definite absence, and verification failure', () => {
  const {sessionVerificationState} = load()('src/lib/http/session-result.ts');
  assert.equal(sessionVerificationState({id:'synthetic'}, null), 'active');
  assert.equal(sessionVerificationState(null, null), 'expired');
  assert.equal(sessionVerificationState(null, {name:'AuthSessionMissingError'}), 'expired');
  assert.equal(sessionVerificationState(null, {status:401}), 'expired');
  for (const error of [{status:503}, {status:403}, {name:'AuthRetryableFetchError'}, {name:'TypeError'}]) assert.equal(sessionVerificationState(null,error), 'unavailable');
});

test('only explicit sign-in redirects or401 dispatch expiry; other redirects remain uncertain', async () => {
  const events=[];
  const {readJsonResponse}=load({URL,window:{location:{origin:'https://oms.invalid',pathname:'/fixture'},dispatchEvent:e=>events.push(e)},CustomEvent:class {constructor(type,init){this.type=type;this.detail=init.detail}}})('src/lib/http/read-json-response.ts');
  const response=(status,url,redirected=true)=>({status,url,redirected,headers:{get:()=> 'application/json'},json:async()=>({ok:true})});
  for(const url of ['https://oms.invalid/other','https://oms.invalid/access-status?reason=forbidden','https://oms.invalid/reports/login-history','https://oms.invalid/data?next=/login']){
    await assert.rejects(readJsonResponse(response(200,url)),/result is unconfirmed/i);
  }
  assert.equal(events.length,0);
  for(const url of ['https://oms.invalid/login?returnTo=%2Ffixture','https://oms.invalid/access-status?reason=idle-timeout']) await assert.rejects(readJsonResponse(response(200,url)),/session expired/i);
  await assert.rejects(readJsonResponse(response(401,'https://oms.invalid/api',false)),/session expired/i);
  assert.equal(events.length,3);
  await readJsonResponse(response(403,'https://oms.invalid/api',false));
  await readJsonResponse(response(503,'https://oms.invalid/api',false));
  assert.equal(events.length,3);
});

test('WorkspaceError verification failure preserves uncertain write result and lifecycle guard',()=>{
  const source=fs.readFileSync('src/app/(app)/error.tsx','utf8');
  assert.match(source,/if \(!cancelled\) setVerification\(sessionVerificationState/);
  assert.match(source,/catch\(\(\) => \{ if \(!cancelled\) setVerification\("unavailable"\)/);
  assert.match(source,/Session verification unavailable/);
  assert.match(source,/changes may already be saved/);
  assert.match(source,/has not been retried automatically/);
  assert.doesNotMatch(source,/signOut|refreshSession|setSession/);
});

test('actual error component renders temporary verification failure without sign-in demand or replay', async()=>{
  const vm=require('node:vm'),ts=require('typescript');
  async function render(result,reject=false,unmount=false){
    let state='checking',cleanup;const events=[];
    const jsx=(type,props)=>({type,props});
    const out={};
    const code=ts.transpileModule(fs.readFileSync('src/app/(app)/error.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(code,{exports:out,require:id=>id==='react'?{useState:()=>[state,v=>{events.push(v);state=v}],useEffect:fn=>{if(!cleanup)cleanup=fn()}}:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id==='@/lib/supabase/client'?{createClient:()=>({auth:{getUser:()=>reject?Promise.reject(new Error('synthetic network')):Promise.resolve(result)}})}:id==='@/lib/http/session-result'?load()('src/lib/http/session-result.ts'):id==='@/lib/http/session-recovery'?{buildLoginHref:()=>'/login'}:id.includes('ui/button')?{Button:'button'}:id.includes('ui/card')?{Card:'card',CardContent:'content'}:{default:'link'}});
    out.default({error:new Error('synthetic page failure')});
    if(unmount)cleanup();
    await new Promise(resolve=>setImmediate(resolve));
    const tree=out.default({error:new Error('synthetic page failure')});
    return {text:JSON.stringify(tree),events};
  }
  for(const [result,reject] of [[{data:{user:null},error:{status:503}},false],[null,true]]){
    const v=await render(result,reject);assert.match(v.text,/Session verification unavailable/);assert.match(v.text,/changes may already be saved/);assert.doesNotMatch(v.text,/Sign in again/);
  }
  assert.match((await render({data:{user:null},error:{status:401}})).text,/Your session has expired/);
  assert.doesNotMatch((await render({data:{user:{id:'synthetic'}},error:null})).text,/Your session has expired|Session verification unavailable/);
  assert.equal((await render({data:{user:null},error:{status:401}},false,true)).events.length,0);
});
