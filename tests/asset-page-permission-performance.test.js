const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const file='src/app/(app)/asset-management/page.tsx';
const permissions=['assets.report','assets.manage','assets.maintenance','assets.transfer'];
function page(source,{role='manager',grants={},failure=false,delay=0,view='assets'}={}){
 const calls=[],exports={};let reads=0;
 const wait=()=>new Promise(resolve=>setTimeout(resolve,delay));
 const check=async codes=>{calls.push(codes);await wait();if(failure)throw Error('permissions unavailable');return Object.fromEntries(codes.map(code=>[code,grants[code]===true]));};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,require(n){
  if(n==='@/server/auth/permissions')return {hasPermission:async code=>(await check([code]))[code],getPermissionMap:check};
  if(n==='@/server/auth/tenant-actor')return {requireActiveTenantActor:async()=>({roleCode:role})};
  if(n==='@/lib/asset-access')return {canAccessAssetManagement:r=>r==='manager'};
  if(n==='@/server/queries/assets')return {getAssetWorkspace:async()=>{reads++;return {active:true,records:[],locations:[],assets:[],holdings:[],total:0,overview:null,filterOptions:{categories:[],statuses:[]}};}};
  if(n==='next/navigation')return {redirect:href=>{throw Error('redirect '+href);}};
  if(n==='react/jsx-runtime')return require(n);
  return new Proxy({default:{}},{get:(target,key)=>key in target?target[key]:()=>null});
 }});return {run:()=>exports.default({searchParams:Promise.resolve({view})}),calls,get reads(){return reads;}};
}
test('asset page requests one complete permission map before loading protected records',async()=>{
 const p=page(fs.readFileSync(file,'utf8'));await p.run();assert.equal(p.calls.length,1);assert.deepEqual(Array.from(p.calls[0]),permissions);assert.equal(p.reads,1);
});
test('permission source failure remains closed before workspace loading',async()=>{
 const p=page(fs.readFileSync(file,'utf8'),{failure:true});await assert.rejects(p.run(),/permissions unavailable/);assert.equal(p.reads,0);
});
test('restricted management route still redirects after batched report permission',async()=>{
 const p=page(fs.readFileSync(file,'utf8'),{role:'outlet_staff',view:'overview'});
 await assert.rejects(p.run(),/redirect \/asset-management\?view=checklist/);assert.equal(p.reads,0);
});
module.exports={page};
