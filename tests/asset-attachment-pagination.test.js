const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function harness(options={}){
 const calls=[],module={exports:{}};
 const db={from:table=>{calls.push({table,method:'from'});const query={};for(const method of ['select','eq','order','range'])query[method]=(...args)=>{calls.push({table,method,args});return query;};query.maybeSingle=async()=>({data:options.missing?null:{id:'parent',asset_code:'SB-SYNTHETIC',source_id:'MR-SYNTHETIC'},error:null});query.then=(resolve,reject)=>Promise.resolve({data:[],count:options.countMissing?null:1025,error:null}).then(resolve,reject);return query;}};
 const bindings={'@/server/queries/asset-maintenance-page': require('./helpers/load-source.cjs')()('src/server/queries/asset-maintenance-page.ts'),'@/lib/asset-location-display': require('./helpers/load-source.cjs')()('src/lib/asset-location-display.ts'), '@/lib/mock-mode':{isMockMode:()=>false},'@/lib/asset-access':{canAccessAssetManagement:role=>['super_admin','manager','outlet_supervisor'].includes(role)},'react':{cache:fn=>fn},'@/lib/business-date':{},'@/lib/production-planning/forecast':{},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'synthetic-company',roleCode:'super_admin'})},'@/server/auth/permissions':{requirePermission:async p=>calls.push({permission:p})},'@/lib/supabase/server':{createClient:async()=>db},'@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({automaticId:false,transferBatch:false})},'@/lib/asset-transfer':require('./helpers/load-source.cjs')()('src/lib/asset-transfer.ts'),'@/lib/supabase/loose':{looseSupabase:value=>value}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/assets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>bindings[n]??require(n)});
 return {query:module.exports.getAssetAttachmentRegister,calls};
}
test('attachment register can reach beyond default 1000 rows with stable scoped pages',async()=>{
 for(const kind of ['asset','maintenance']){const h=harness(),data=await h.query(kind,'synthetic-parent',21);assert.equal(data.total,1025);
 const calls=h.calls.filter(c=>c.table==='asset_attachments');assert.deepEqual(calls.find(c=>c.method==='range').args,[1000,1049]);assert.ok(calls.some(c=>c.method==='select'&&c.args[1].count==='exact'));assert.ok(calls.some(c=>c.method==='eq'&&c.args[0]==='company_id'&&c.args[1]==='synthetic-company'));assert.ok(calls.some(c=>c.method==='eq'&&c.args[0]===(kind==='asset'?'asset_id':'maintenance_id')));assert.deepEqual(calls.filter(c=>c.method==='order').map(c=>c.args[0]),['created_at','id']);}
});
test('inaccessible parent stops attachment lookup and unavailable counts are not zero',async()=>{
 const absent=harness({missing:true});assert.equal(await absent.query('maintenance','parent',1),null);assert.equal(absent.calls.some(c=>c.table==='asset_attachments'),false);
 const missingCount=harness({countMissing:true});await assert.rejects(()=>missingCount.query('asset','parent',1),/unavailable/);
});
test('invalid pagination is rejected before authentication or querying',async()=>{
 for(const page of [0,-1,1.5,Infinity,1000001,NaN]){const h=harness();await assert.rejects(()=>h.query('asset','parent',page),/valid attachment page/);assert.equal(h.calls.length,0);}
});
