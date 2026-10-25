const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const realLoad=require('./helpers/load-source.cjs')({setTimeout,clearTimeout,AbortController,Error,TypeError});
const {requestDeadline}=realLoad('src/lib/http/request-deadline.ts');
function harness(fetch){
 const values=[],cleanups=[],removed=[],exports={};const rows=[{index:1,values:{supplier_code:'SYNTHETIC',supplier_name:'Synthetic supplier'},errors:[]}];
 let source=fs.readFileSync('src/components/imports/import-workflow.tsx','utf8').replace('function ScopedImportWorkflow','export function ScopedImportWorkflow').replace('  const summary = result ??','  return {confirmImport};\n  const summary = result ??');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Error,TypeError,fetch,window:{localStorage:{getItem:()=>null,removeItem:key=>removed.push(key)}},require(name){
  if(name==='react')return {useMemo:fn=>fn(),useRef:value=>({current:value}),useEffect:fn=>cleanups.push(fn()),useState:initial=>{const index=values.length;values.push(index===0?rows:typeof initial==='function'?initial():initial);return [values[index],next=>{values[index]=typeof next==='function'?next(values[index]):next;}];}};
  if(name.endsWith('request-deadline'))return {requestDeadline:(op,_ms,msg)=>requestDeadline(op,5,msg)};
  if(name.endsWith('read-json-response'))return realLoad('src/lib/http/read-json-response.ts');
  if(name.endsWith('imports/config'))return realLoad('src/lib/imports/config.ts');
  return new Proxy({}, {get:(_,key)=>key});
 }});
 const handlers=exports.ScopedImportWorkflow({entity:'suppliers',draftScope:'synthetic-company:synthetic-user'});return {handlers,values,rows,removed,cleanup:()=>cleanups.forEach(fn=>fn?.())};
}
const response = (payload,ok=true)=>({ok,status:ok?200:500,redirected:false,url:'/api/imports/confirm',headers:{get:()=> 'application/json'},json:async()=>payload});
test('ordinary import stall releases busy as uncertain, keeps rows and makes one POST',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});await Promise.all([h.handlers.confirmImport(),h.handlers.confirmImport()]);assert.equal(calls,1);assert.equal(h.values[3],false);assert.equal(h.values[0],h.rows);assert.match(h.values[2],/server may have imported some rows/);assert.equal(h.removed.length,0);
});
test('ordinary import late success after identity unmount cannot clear another active draft or update state',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));const work=h.handlers.confirmImport();h.cleanup();resolve(response({ok:true,message:'Synthetic success'}));await work;assert.equal(h.removed.length,0);assert.equal(h.values[7],null);
});
test('ordinary import server errors retain draft and cannot claim success from an inconsistent response',async()=>{
 const h=harness(async()=>response({ok:true,message:'Synthetic invalid success'},false));await h.handlers.confirmImport();assert.equal(h.removed.length,0);assert.equal(h.values[7],null);assert.match(h.values[2],/unconfirmed/);
});
