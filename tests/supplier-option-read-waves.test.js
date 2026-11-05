const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture({delay=0,failure=null,withoutMappings=false,source}={}){
 const active={status:'active',deleted_at:null};const tables={branch_supplier_items:withoutMappings?[]:[{...active,id:'mapping',branch_id:'a',item_id:'mapped',supplier_item_id:'si',is_preferred:true}],supplier_items:[{...active,id:'si',supplier_id:'s',item_id:'mapped',purchase_uom:'BAG',unit_cost:9,conversion_to_base_uom:5}],items:[{...active,id:'mapped',company_id:'A',supplier_id:'s',purchase_unit:'KG',base_unit:'KG',cost:2},{...active,id:'default',company_id:'A',supplier_id:'s',purchase_unit:'KG',base_unit:'KG',cost:3}],branches:[{...active,id:'a',company_id:'A'},{...active,id:'b',company_id:'B'}],suppliers:[{...active,id:'s',name:'Supplier',supplier_code:'S',supplier_group:null}]};
 const calls=[],events=[];const db={from(table){const filters=[];const q=new Proxy({then(resolve,reject){calls.push({table,filters});events.push(table+':start');return new Promise(r=>setTimeout(r,delay)).then(()=>{events.push(table+':end');let rows=tables[table];for(const [op,key,value] of filters){if(op==='eq'||op==='is')rows=rows.filter(row=>row[key]===value);if(op==='in')rows=rows.filter(row=>value.includes(row[key]));}return {data:failure===table?null:rows,error:failure===table?{message:'failed '+table}:null};}).then(resolve,reject);}},{get:(target,key)=>key in target?target[key]:(...args)=>{filters.push([key,...args]);return q;}});return q;}};
 const exports={};vm.runInNewContext(ts.transpileModule(source??fs.readFileSync('src/server/queries/common.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>n==='react'?{cache:fn=>fn}:n==='@/lib/mock-mode'?{isMockMode:()=>false}:n==='@/lib/supabase/server'?{createClient:async()=>db}:new Proxy({},{get:()=>()=>null})});return {run:exports.getBranchSupplierMappingsForSelect,calls,events};
}
test('independent supplier relationships, item defaults and branch scopes overlap after mappings',async()=>{
 const f=fixture({delay:5}),rows=await f.run();assert.equal(rows.length,2);assert.equal(rows[0].purchase_uom,'BAG');assert.equal(rows[0].conversion_to_base_uom,5);assert.equal(rows[1].item_id,'default');assert.equal(rows[1].branch_id,'a');assert.equal(rows[1].conversion_to_base_uom,1);assert.ok(rows.every(row=>row.branch_id!=='b'));
 for(const table of ['items','branches'])assert.ok(f.events.indexOf(table+':start')<f.events.indexOf('supplier_items:end'));
 assert.ok(f.events.indexOf('branch_supplier_items:end')<f.events.indexOf('supplier_items:start'));assert.ok(f.events.indexOf('branches:end')<f.events.indexOf('suppliers:start'));
 for(const call of f.calls)assert.ok(call.filters.some(([op,key,value])=>op==='is'&&key==='deleted_at'&&value===null));
});
test('every dependency failure remains unavailable rather than a partial supplier mapping',async()=>{
 for(const failure of ['branch_supplier_items','supplier_items','items','branches','suppliers'])await assert.rejects(fixture({failure}).run(),new RegExp('failed '+failure));
 const f=fixture({failure:'branch_supplier_items'});await assert.rejects(f.run());assert.equal(f.calls.length,1);
});
test('empty explicit mappings skip relationship query but retain company-matched master defaults',async()=>{
 const f=fixture({withoutMappings:true}),rows=await f.run();assert.equal(f.calls.some(x=>x.table==='supplier_items'),false);assert.equal(rows.length,2);assert.ok(rows.every(row=>row.branch_id==='a'&&row.id.startsWith('master-default:')));
});
module.exports={fixture};
test('helper concurrency is bounded at three and suppliers never follow a failed prerequisite',async()=>{
 const f=fixture({delay:3});await f.run();let active=0,peak=0;
 for(const event of f.events){active+=event.endsWith(':start')?1:-1;peak=Math.max(peak,active);}
 assert.equal(peak,3);assert.equal(active,0);assert.equal(f.calls.length,5);
 for(const failure of ['supplier_items','items','branches']){const failed=fixture({failure});await assert.rejects(failed.run());assert.ok(!failed.calls.some(c=>c.table==='suppliers'));}
});
