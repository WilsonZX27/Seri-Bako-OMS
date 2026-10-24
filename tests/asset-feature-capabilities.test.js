const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,requireFn=()=>({})){const ctx={exports:{},require:requireFn,FormData,File,Buffer,console};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports;}
const caps=load('src/server/queries/asset-feature-capabilities.ts').assetFeatureCapabilities;
test('UI-only Preview disables all asset feature gates and never calls shared readiness',async()=>{
 let calls=0;
 for(const data of [null,{}, {version:3,automatic_id:true,transfer_batch:true,transfer_batch_revision:1}]) {
  const result=await caps({rpc:async()=>{calls++;return {data,error:null}}});
  assert.equal(result.automaticId,false);assert.equal(result.transferBatch,false);assert.equal(result.transferBatchRead,false);
 }
 await caps({rpc:async()=>{throw Error('Unexpected shared DB readiness call')}});assert.equal(calls,0);
});
function actionHarness(ready=true,error=null){const calls=[];const db={rpc:async(name,args)=>{calls.push({name,args});return {data:error?null:'11111111-1111-4111-8111-111111111111',error};}};const actions=load('src/server/actions/assets.ts',id=>{
 if(id==='next/cache')return {revalidatePath:()=>{}};
 if(id.endsWith('/tenant-actor'))return {requireActiveTenantActor:async()=>({companyId:'synthetic'})};
 if(id.endsWith('/permissions'))return {requirePermission:async()=>{},hasPermission:async()=>false};
 if(id.endsWith('/supabase/server'))return {createClient:async()=>db};
 if(id.endsWith('/supabase/loose'))return {looseSupabase:v=>v};
 if(id.endsWith('/asset-feature-capabilities'))return {assetFeatureCapabilities:async()=>({automaticId:ready,transferBatch:ready,transferBatchRead:ready})};
 if(id.endsWith('/asset-master'))return {assetMasterFields:[]};
 if(id.endsWith('/asset-transfer'))return load('src/lib/asset-transfer.ts');
 if(id.endsWith('/production-planning/forecast'))return load('src/lib/production-planning/forecast.ts');
 if(id==='node:crypto')return require(id);
 return {};
 });return {actions,calls};}
function registration(mode='sequence'){const f=new FormData();for(const [k,v] of Object.entries({item_name:'Synthetic scale',reason:'Synthetic registration',code_mode:mode,asset_code:mode==='manual'?'HIST-1':'',client_key:'11111111-1111-4111-8111-111111111111',location_id:'22222222-2222-4222-8222-222222222222',quantity:'0'}))f.set(k,v);return f;}
test('registration sends blank code only for confirmed sequence mode; retry preserves key; failure stays unconfirmed',async()=>{
 const h=actionHarness();const f=registration();assert.equal((await h.actions.saveAssetMaster({},f)).ok,true);assert.equal((await h.actions.saveAssetMaster({},f)).ok,true);assert.equal(h.calls[0].args.p_code,'');assert.equal(h.calls[0].args.p_quantity,0);assert.equal(h.calls[0].args.p_client_key,h.calls[1].args.p_client_key);
 const old=actionHarness(false);assert.equal((await old.actions.saveAssetMaster({},registration())).ok,false);assert.equal(old.calls.length,0);
 const manual=actionHarness(false);assert.equal((await manual.actions.saveAssetMaster({},registration('manual'))).ok,true);assert.equal(manual.calls[0].args.p_code,'HIST-1');
 const bad=registration();bad.set('asset_code','INJECTED');assert.equal((await h.actions.saveAssetMaster({},bad)).ok,false);
 const fail=actionHarness(true,{message:'Synthetic transaction failure'});assert.equal((await fail.actions.saveAssetMaster({},registration())).ok,false);
});

const id1='11111111-1111-4111-8111-111111111111',id2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function transferForm(){const f=new FormData();for(const [k,v] of Object.entries({from:id1,to:'22222222-2222-4222-8222-222222222222',reason:'Synthetic relocation',date:'2026-10-24',client_key:id1}))f.set(k,v);for(const id of [id1,id2]){f.append('asset_id',id);f.set(`quantity_${id}`,'2');}return f;}
test('batch parser rejects canonical duplicate UUIDs, blank/fractional/overflow quantities and out-of-contract line counts',()=>{
 const parse=load('src/lib/asset-transfer.ts').assetTransferBatchLines;
 const valid=transferForm();assert.equal(parse(valid).length,2);
 const duplicate=transferForm();duplicate.append('asset_id',id2.toUpperCase());duplicate.set(`quantity_${id2.toUpperCase()}`,'1');assert.throws(()=>parse(duplicate),/only once/);
 for(const quantity of ['', '0','-1','1.5','2147483648','NaN']){const f=transferForm();f.set(`quantity_${id1}`,quantity);assert.throws(()=>parse(f),/positive whole/);}
 const empty=new FormData();assert.throws(()=>parse(empty),/1 and 100/);for(let i=0;i<101;i++)empty.append('asset_id',id1);assert.throws(()=>parse(empty),/1 and 100/);
});
test('batch action sends exactly one atomic RPC with full lines, stable key and date, and returns its document',async()=>{
 const h=actionHarness();const f=transferForm();const first=await h.actions.requestAssetTransferBatch({},f);assert.equal(first.ok,true);assert.equal(first.requestId,id1);assert.equal((await h.actions.requestAssetTransferBatch({},f)).ok,true);
 assert.equal(h.calls.length,2);for(const call of h.calls){assert.equal(call.name,'request_asset_transfer_batch');assert.equal(call.args.p_client_key,id1);assert.equal(call.args.p_lines.length,2);assert.equal(call.args.p_date,'2026-10-24');assert.equal(call.args.p_lines[1].asset_id,id2);}
 for(const date of ['2026-02-30','2026-13-01','bad']){const invalid=transferForm();invalid.set('date',date);assert.equal((await h.actions.requestAssetTransferBatch({},invalid)).ok,false);}assert.equal(h.calls.length,2);
 const old=actionHarness(false);assert.equal((await old.actions.requestAssetTransferBatch({},f)).ok,false);assert.equal(old.calls.length,0);
 const fail=actionHarness(true,{message:'Synthetic availability changed'});const result=await fail.actions.requestAssetTransferBatch({},f);assert.equal(result.ok,false);assert.equal(result.requestId,undefined);assert.match(result.message,/availability/);
 const same=transferForm();same.set('to',id1);assert.equal((await h.actions.requestAssetTransferBatch({},same)).ok,false);
});
test('whole-batch lifecycle uses batch RPC; historical single lifecycle retains original RPC; unavailable batch does not downgrade to single',async()=>{
 for(const action of ['approve','reject','dispatch','receive']){const h=actionHarness();const f=new FormData();f.set('transfer_id',id1);f.set('action',action);f.set('transfer_kind','batch');f.set('note','Synthetic note');assert.equal((await h.actions.advanceAssetTransfer({},f)).ok,true);assert.equal(h.calls[0].name,'advance_asset_transfer_batch');assert.equal(h.calls[0].args.p_batch,id1);assert.equal(h.calls[0].args.p_action,action);}
 const h=actionHarness();const f=new FormData();f.set('transfer_id',id1);f.set('action','receive');assert.equal((await h.actions.advanceAssetTransfer({},f)).ok,true);assert.equal(h.calls[0].name,'advance_asset_transfer');
 const old=actionHarness(false);f.set('transfer_kind','batch');assert.equal((await old.actions.advanceAssetTransfer({},f)).ok,false);assert.equal(old.calls.length,0);
});

test('partial or old readiness contracts cannot enable batch UI and numbering remains disabled',async()=>{
 for(const data of [
  {version:1,automatic_id:true,transfer_batch:true},
  {version:2,automatic_id:true,transfer_batch:true},
  {version:2,automatic_id:true,transfer_batch:true,transfer_batch_revision:0},
  {version:2,automatic_id:true,transfer_batch:false,transfer_batch_revision:1},
 ]) {const result=await caps({rpc:async()=>({data,error:null})});assert.equal(result.transferBatch,false);assert.equal(result.automaticId,false);}
 const ready=await caps({rpc:async()=>({data:{version:2,automatic_id:true,transfer_batch:true,transfer_batch_revision:1},error:null})});
 assert.equal(ready.transferBatch,false);assert.equal(ready.automaticId,false);assert.equal(ready.transferBatchRead,false);
});
test('SQL readiness owns exact versioned request, transition, invoker view, types, RLS and trigger dependencies',()=>{
 const sql=fs.readFileSync('docs/v10/proposals/asset-feature-capabilities-v1-review-only.sql','utf8');
 for(const contract of ['request_asset_transfer_batch(uuid,uuid,text,jsonb,uuid,text,date)','advance_asset_transfer_batch(uuid,text,text)',"'uuid'::regtype",'oms.asset-batch.v1','security_invoker=true','relrowsecurity','guard_asset_transfer_batch_line',"('asset_transfer_register','quantity','bigint')",'has_function_privilege','has_table_privilege'])assert.ok(sql.includes(contract),contract);
 assert.match(sql,/not exists[\s\S]*not exists/);
 const batch=fs.readFileSync('docs/v10/proposals/asset-transfer-batch-review-only.sql','utf8');
 assert.ok(batch.indexOf('comment on function')>batch.indexOf('create view public.asset_transfer_register'));
});
