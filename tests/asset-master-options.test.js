const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function harness(fail = false) {
  const calls = [], module = {exports: {}};
  const db = {
    rpc: async (name, args) => {calls.push({name,args});return {data: [{details: {Category: 'Imported', 'Department / Area': 'Kitchen'}}],error:null};},
    from: table => {
      let offset = 0;
      const q = {};
      for (const method of ['select','eq','is','not','order','range']) q[method] = (...args) => {calls.push({table,method,args});if(method==='range')offset=args[0];return q;};
      q.then = (resolve,reject) => {
        const data = table === 'assets' ? [{id:'a', current_details:{Category:'Current'}}] : table === 'staffs' ? [{id:'u',full_name:'Fictional User',staff_code:'AUDIT'}] : offset===0 ? Array.from({length:500},()=>({source_data:{'Details Before':{Category:'Historical'},'Details After':{Category:'Current'}}})) : [{source_data:{Details:{'Department / Area':'Earlier department', Category:'Older page'}}}];
        return Promise.resolve({data:fail && table==='staffs'?null:data,error:fail && table==='staffs'?{message:'User list unavailable'}:null}).then(resolve,reject);
      };
      return q;
    }
  };
  const bindings = {'@/server/queries/asset-maintenance-page': require('./helpers/load-source.cjs')()('src/server/queries/asset-maintenance-page.ts'),'@/lib/asset-location-display': require('./helpers/load-source.cjs')()('src/lib/asset-location-display.ts'), 'react':{cache:fn=>fn},'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/asset-access':{},'@/lib/business-date':{},'@/lib/production-planning/forecast':{},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'tenant'})},'@/server/auth/permissions':{requirePermission:async permission=>calls.push({permission})},'@/lib/supabase/server':{createClient:async()=>db},'@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({automaticId:false,transferBatch:false})},'@/lib/asset-transfer':require('./helpers/load-source.cjs')()('src/lib/asset-transfer.ts'),'@/lib/supabase/loose':{looseSupabase:v=>v}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/assets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>bindings[n]??require(n)});
  return {run:module.exports.getAssetMasterOptions,calls};
}
test('asset dropdowns retain imported, current and prior values beyond the first history page',async()=>{
  const h=harness(),result=JSON.parse(JSON.stringify(await h.run()));
  assert.deepEqual(result.fields.Category,['Current','Historical','Imported','Older page']);
  assert.deepEqual(result.fields['Department / Area'],['Earlier department','Kitchen']);
  assert.equal(result.people[0].full_name,'Fictional User');
  assert.ok(h.calls.some(c=>c.permission==='assets.manage'));
  for(const table of ['assets','asset_master_updates','staffs'])assert.ok(h.calls.some(c=>c.table===table&&c.method==='eq'&&c.args[0]==='company_id'&&c.args[1]==='tenant'));
  assert.ok(h.calls.some(c=>c.table==='staffs'&&c.method==='not'&&c.args[0]==='auth_user_id'));
  assert.ok(h.calls.some(c=>c.name==='get_asset_register_source_fields'));
});
test('unavailable OMS users fail visibly instead of silently supplying an empty selector',async()=>{
  await assert.rejects(harness(true).run,/User list unavailable/);
});
