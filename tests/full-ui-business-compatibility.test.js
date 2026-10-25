const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function compile(file,mocks){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:out,FormData,URL,URLSearchParams,Date,JSON,crypto:require('node:crypto').webcrypto,require:n=>{if(n in mocks)return mocks[n];if(n==='react/jsx-runtime')return require(n);return {};}});return out;}
const id='11111111-1111-4111-8111-111111111111',batch='22222222-2222-4222-8222-222222222222';
test('read/process capabilities and batch creation are exact-version gated while numbering stays off',async()=>{
 const api=compile('src/server/queries/asset-feature-capabilities.ts',{});
 for(const value of [null,{}, {version:2,transfer_batch:true,transfer_batch_revision:1},{version:3,transfer_batch:'true',transfer_batch_revision:1},{version:3,transfer_batch:true,transfer_batch_revision:0}]){
  const c=await api.assetFeatureCapabilities({rpc:async()=>({data:value,error:null})});assert.equal(c.transferBatchRead,false);assert.equal(c.transferBatch,false);assert.equal(c.automaticId,false);
 }
 for(const code of ['PGRST202','42883','42501'])assert.equal((await api.assetFeatureCapabilities({rpc:async()=>({error:{code}})})).transferBatchRead,false);
 const c=await api.assetFeatureCapabilities({rpc:async()=>({data:{version:3,transfer_batch:true,transfer_batch_revision:1},error:null})});assert.equal(c.transferBatchRead,true);assert.equal(c.transferBatch,true);assert.equal(c.automaticId,false);
 await assert.rejects(api.assetFeatureCapabilities({rpc:async()=>({error:{code:'network'}})}),/verified/);
});
function actionHarness({ready=true,lineBatch=null,denied=false,error=null}={}){
 const calls=[];const db={from:table=>{calls.push({table});const q={};for(const n of ['select','eq'])q[n]=(...args)=>{calls.push({op:n,args});return q};q.maybeSingle=async()=>({data:{id,batch_id:lineBatch},error:null});return q},rpc:async(name,args)=>{calls.push({name,args});return {data:id,error}}};
 const api=compile('src/server/actions/assets.ts',{'@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({transferBatchRead:ready})},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'company'})},'@/server/auth/permissions':{requirePermission:async p=>{calls.push({permission:p});if(denied)throw Error('permission denied')}},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:x=>x},'next/cache':{revalidatePath:()=>{}}});
 const run=async(kind='batch',action='approve')=>{const f=new FormData();for(const [k,v] of Object.entries({transfer_id:id,transfer_kind:kind,action,note:'Synthetic only'}))f.set(k,v);return api.advanceAssetTransfer({ok:false,message:''},f)};return {calls,run};
}
test('whole-batch operations preserve permissions and use only the atomic batch RPC',async()=>{
 for(const action of ['approve','reject','dispatch','receive']){const h=actionHarness();assert.equal((await h.run('batch',action)).ok,true);assert.equal(h.calls.filter(c=>c.name).length,1);assert.equal(h.calls.find(c=>c.name).name,'advance_asset_transfer_batch');assert.equal(h.calls.find(c=>c.permission).permission,['approve','reject'].includes(action)?'assets.approve':'assets.transfer');}
});
test('absent or partial migrations, revoked permissions and invalid kinds never replay another RPC',async()=>{
 for(const [options,kind] of [[{ready:false},'batch'],[{denied:true},'batch'],[{},'invalid']]){const h=actionHarness(options);assert.equal((await h.run(kind)).ok,false);assert.equal(h.calls.some(c=>c.name),false);}
 const failed=actionHarness({error:{message:'Synthetic transaction rejected'}});assert.equal((await failed.run()).ok,false);assert.equal(failed.calls.filter(c=>c.name).length,1);
});
test('legacy single transfer stays tenant scoped, but an old link cannot process a batch line alone',async()=>{
 const single=actionHarness({ready:false});assert.equal((await single.run('single')).ok,true);assert.equal(single.calls.find(c=>c.name).name,'advance_asset_transfer');assert.ok(single.calls.some(c=>c.op==='eq'&&c.args[0]==='company_id'&&c.args[1]==='company'));
 const line=actionHarness({lineBatch:batch});assert.equal((await line.run('single')).ok,false);assert.equal(line.calls.some(c=>c.name),false);
});
test('legacy batch line routes redirect only when complete visible document exists',async()=>{
 for(const complete of [false,true]){
 const Route=compile('src/app/(app)/asset-management/transfers/[id]/page.tsx',{'@/server/queries/assets':{getAssetTransferBatchDetail:async x=>x===batch&&complete?{}:null,getAssetTransferDetail:async()=>({transfer:{batch_id:batch}})},'@/server/auth/permissions':{getPermissionMap:async()=>({})},'next/navigation':{redirect:path=>{throw Error('REDIRECT:'+path)},notFound:()=>{throw Error('NOTFOUND')}}}).default;
 const run=()=>Route({params:Promise.resolve({id}),searchParams:Promise.resolve({})});if(complete)await assert.rejects(run(),new RegExp('REDIRECT:/asset-management/transfers/'+batch));else assert.ok(await run());
 }
});
test('repair reader accepts scoped current repairs, tolerates missing helper and rejects malformed or foreign results',async()=>{
 const q=compile('src/server/queries/assets.ts',{'react':{cache:v=>v}}).readAssetOpenRepairs;
 for(const code of ['PGRST202','42883'])assert.equal((await q({rpc:async()=>({error:{code}})},id,[id])).available,false);
 for(const data of [{},[{id,asset_id:batch,status:'Open',open_count:1}],[{id,asset_id:id,status:'Closed',open_count:1}]])await assert.rejects(q({rpc:async()=>({data,error:null})},id,[id]));
 const result=await q({rpc:async()=>({data:[{id,asset_id:id,status:'Open',open_count:1}],error:null})},id,[id]);assert.equal(result.repairs.length,1);
});

function scheduleHarness({ready=false,permission=true,error=null}={}){
 const calls=[];const api=compile('src/app/api/attendance/schedule/route.ts',{'node:crypto':require('node:crypto'),'zod':require('zod'),'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},'@/server/queries/schedule-leave-capabilities':{readPaidEmergencyLeaveCapability:async()=>ready},'@/server/http/request-security':{rejectCrossSiteMutation:()=>null},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'company',roleCode:'super_admin'})},'@/server/auth/permissions':{hasPermission:async code=>permission&&code==='schedule.draft'},'@/server/observability/logger':{logServerError:()=>{}},'@/lib/supabase/server':{createClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{week_start:'2026-10-19'},error}}})},'@/lib/supabase/loose':{looseSupabase:x=>x}});
 return {calls,run:kind=>api.POST({json:async()=>({action:'save',branchId:id,weekStart:'2026-10-19',assignments:[{staff_id:batch,work_date:'2026-10-19',assignment_kind:kind,shift_template_id:null}]})})};
}
test('EL save preserves kind, rejects missing readiness, keeps legacy PH and never retries failed writes',async()=>{
 const absent=scheduleHarness();assert.equal((await absent.run('el')).status,409);assert.equal(absent.calls.length,0);
 const ready=scheduleHarness({ready:true});assert.equal((await ready.run('el')).status,200);assert.equal(ready.calls[0].args.p_assignments[0].assignment_kind,'el');
 const legacy=scheduleHarness();assert.equal((await legacy.run('ph')).status,200);assert.equal(legacy.calls[0].args.p_assignments[0].assignment_kind,'ph');
 const denied=scheduleHarness({ready:true,permission:false});assert.equal((await denied.run('el')).status,403);assert.equal(denied.calls.length,0);
 const failed=scheduleHarness({ready:true,error:{code:'42883',message:'Synthetic partial migration'}});assert.equal((await failed.run('el')).status,500);assert.equal(failed.calls.length,1);
});
test('actual batch detail renders the entire document with existing house components',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const wrap=({children})=>React.createElement('div',null,children);
 const Detail=compile('src/components/asset-transfer-batch-detail.tsx',{'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},'@/components/asset-transfer-form':{AssetTransferAction:({batch,transferId})=>React.createElement('span',{'data-batch':batch,'data-transfer':transferId},'Whole document action')},'@/components/layout/right-console':{ConsoleSection:wrap},'@/components/layout/workspace-layout':{WorkspaceGrid:({children,rightRail})=>React.createElement('main',null,children,rightRail)},'@/components/ui/page-header':{PageHeader:({title})=>React.createElement('h1',null,title)},'@/components/ui/status-badge':{StatusBadge:()=>null},'@/lib/asset-transfer':{assetTransferActions:()=>['approve']},'@/lib/utils':{formatDateTime:x=>x,formatDateOnly:x=>x,formatNumber:x=>String(x)}}).AssetTransferBatchDetail;
 const data={transfer:{id:batch,status:'requested',from_location_id:'source',to_location_id:'destination',reason:'Synthetic move',request_date:'2026-10-19'},lines:[{id:'line1',asset_id:'asset1',quantity:2},{id:'line2',asset_id:'asset2',quantity:3}],assets:[{id:'asset1',item_name:'Synthetic scale',asset_code:'SYN1'},{id:'asset2',item_name:'Synthetic oven',asset_code:'SYN2'}],locations:[{id:'source',source_name:'Source'},{id:'destination',source_name:'Destination'}],history:[],total:0};
 const html=renderToStaticMarkup(React.createElement(Detail,{data,permissions:{'assets.approve':true},page:1}));for(const text of ['Synthetic scale','Synthetic oven','Assets list','data-batch="true"',batch])assert.ok(html.includes(text),text);
});
test('the retained compatibility client returns to legacy reads after an unused database rollback',async()=>{
 const api=compile('src/server/queries/asset-feature-capabilities.ts',{});const responses=[{data:{version:3,transfer_batch:true,transfer_batch_revision:1},error:null},{data:null,error:{code:'PGRST202'}}];
 const db={rpc:async()=>responses.shift()};assert.equal((await api.assetFeatureCapabilities(db)).transferBatchRead,true);assert.equal((await api.assetFeatureCapabilities(db)).transferBatchRead,false);
 const actions=fs.readFileSync('src/server/actions/assets.ts','utf8');assert.match(actions,/export async function requestAssetTransferBatch/);
 const planner=fs.readFileSync('src/components/attendance/schedule-planner.tsx','utf8');assert.match(planner,/paidEmergencyLeaveEnabled \? \[\.\.\.leavePalette/);assert.match(planner,/assignment_kind === "oil"\) return "OIL"/);
});
