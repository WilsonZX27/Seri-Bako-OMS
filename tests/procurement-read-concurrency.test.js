const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,dependencies,source=fs.readFileSync(file,'utf8')){
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>dependencies[n]??(n==='react/jsx-runtime'?require(n):new Proxy({},{get:()=>()=>null}))});return exports;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function requests({failure=null,delay=0,source}={}){
 const events=[],calls=[];const rows={purchase_requests:[{id:'pr',branch_id:'b',requested_by:'a',request_no:'PR1',status:'draft'}],purchase_request_lines:[{purchase_request_id:'pr',qty:2,estimated_unit_cost:3,item_id:'i',uom:'KG'}],branches:[{id:'b',branch_name:'Outlet'}],purchase_orders:[],items:[{id:'i',supplier_id:'s'}],branch_supplier_items:[{branch_id:'b',item_id:'i',supplier_item_id:'si',is_preferred:true}],supplier_items:[{id:'si',supplier_id:'s',item_id:'i',purchase_uom:'KG'}],suppliers:[{id:'s',name:'Supplier'}]};
 const db={from(table){const filters=[];const q=new Proxy({then(resolve,reject){calls.push({table,filters});events.push(table+':start');return (async()=>{if(['items','branch_supplier_items'].includes(table))await wait(delay);events.push(table+':end');return {data:failure===table?null:rows[table]??[],error:failure===table?{message:'failed '+table}:null,count:1};})().then(resolve,reject);}},{get:(target,key)=>key in target?target[key]:(...args)=>{filters.push([key,...args]);return q;}});return q;}};
 const query=load('src/server/queries/procurement.ts',{'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/server':{createClient:async()=>db},'@/server/actors/display':{resolveActorDisplayMap:async()=>new Map(),actorDisplayName:()=>null},'@/lib/uom':{normalizeUom:v=>String(v??'').trim().toUpperCase()}},source);
 return {run:()=>query.getPurchaseRequests(),events,calls};
}
function orders({granted=true,branchFailure=false,permissionFailure=false,source,delay=false}={}){
 const events=[];let branches=0;
 const page=load('src/app/(app)/purchase-orders/page.tsx',{
  '@/server/auth/permissions':{getPermissionMap:async()=>{if(delay)await wait(5);events.push('permission:end');if(permissionFailure)throw Error('permission unavailable');return {'po.create':granted};}},
  '@/server/queries/common':{getBranchesForSelect:async scope=>{assert.equal(scope.restrictToActorScope,true);branches++;events.push('branches:start');if(delay)await wait(25);if(branchFailure)throw Error('branches unavailable');events.push('branches:end');return []; }},
  '@/server/queries/procurement':{getPurchaseOrders:async()=>{events.push('orders:start');if(delay)await wait(40);events.push('orders:end');return {rows:[],page:1,totalRows:0,pageSize:12,totalPages:1};},getPurchaseOrderSummary:async()=>({})},
  '@/lib/utils':{formatNumber:String,formatCurrency:String},'@/lib/table-state':{hasActiveFilters:()=>false},'@/server/observability/logger':{logServerError(){}}
 },source).default;
 return {run:()=>page({searchParams:Promise.resolve({})}),events,get branches(){return branches;}};
}
test('PR sourcing reads overlap and preserve branch/item/status/deletion filters',async()=>{
 const p=requests({delay:5});const result=await p.run();assert.equal(result.rows[0].estimated_total,6);
 assert.ok(p.events.indexOf('branch_supplier_items:start')<p.events.indexOf('items:end'));
 const mapping=p.calls.find(x=>x.table==='branch_supplier_items');assert.ok(mapping.filters.some(x=>x[0]==='in'&&x[1]==='branch_id'&&x[2][0]==='b'));assert.ok(mapping.filters.some(x=>x[0]==='eq'&&x[1]==='status'&&x[2]==='active'));assert.ok(mapping.filters.some(x=>x[0]==='is'&&x[1]==='deleted_at'&&x[2]===null));
});
test('either sourcing read failure stays unavailable and never queries supplier details',async()=>{
 for(const failure of ['items','branch_supplier_items']){const p=requests({failure});await assert.rejects(p.run(),new RegExp('failed '+failure));assert.ok(!p.calls.some(x=>x.table==='supplier_items'||x.table==='suppliers'));}
});
test('PO branch options wait for grant but overlap unrelated list loading',async()=>{
 const p=orders({delay:true});await p.run();assert.ok(p.events.indexOf('permission:end')<p.events.indexOf('branches:start'));assert.ok(p.events.indexOf('branches:end')<p.events.indexOf('orders:end'));
});
test('PO denied grants skip branch reads and branch failure preserves existing unavailable handling',async()=>{
 const denied=orders({granted:false});await denied.run();assert.equal(denied.branches,0);
 const failed=orders({branchFailure:true});await failed.run();assert.equal(failed.branches,1);
});
module.exports={requests,orders};

test('PO permission error propagates without reading export branches',async()=>{const p=orders({permissionFailure:true});await assert.rejects(p.run(),/permission unavailable/);assert.equal(p.branches,0);});
