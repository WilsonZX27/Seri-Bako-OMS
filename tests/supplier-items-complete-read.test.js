const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports, require: name => {if (name in mocks) return mocks[name]; throw Error(name);}});
  return exports;
}
function fixture({failTable, denied = false} = {}) {
  const supplier = '00000000-0000-4000-8000-000000000001';
  const mappings = Array.from({length:1207},(_,i)=>({id:`si${i}`,company_id:'tenant',supplier_id:supplier,item_id:`i${i}`,supplier_item_code:`S${i}`,supplier_item_name:`Term ${i}`,purchase_uom:'KG',unit_cost:i%7,status:i%2?'active':'inactive',deleted_at:i===1206?'archived':null}));
  const tables = {supplier_items:mappings, suppliers:[{id:supplier,company_id:'tenant',name:'Supplier',supplier_code:'AC',supplier_group:'Group'}],items:mappings.map((r,i)=>({id:r.item_id,company_id:'tenant',item_code:`I${i}`,item_name:i===1205?'Late Needle':`Item ${i}`,base_unit:'KG'}))};
  for(const name of Object.keys(tables)) tables[name].push({...tables[name][0],id:'foreign',company_id:'foreign'});
  const calls=[];
  const db={from(table){const predicates=[],orders=[];let start=0,end=999;const q={select(){return q},eq(k,v){predicates.push(r=>r[k]===v);return q},is(k,v){return q.eq(k,v)},in(k,v){predicates.push(r=>v.includes(r[k]));return q},order(k){orders.push(k);return q},range(a,b){start=a;end=b;return q},then(resolve,reject){calls.push({table,start,end});const rows=denied?[]:tables[table].filter(r=>predicates.every(p=>p(r))).sort((a,b)=>{for(const k of orders){const n=String(a[k]).localeCompare(String(b[k]));if(n)return n;}return 0;}).slice(start,end+1);return Promise.resolve({data:failTable===table?null:rows,error:failTable===table?{message:'read failed'}:null}).then(resolve,reject)}};return q}};
  const tableState = load('src/lib/table-state.ts',{});
  const queries = load('src/server/queries/master-data.ts',{'@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/server':{createClient:async()=>db},'@/server/queries/detail':{},'@/lib/table-state':tableState,'@/lib/supabase/loose':{},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'tenant'})}});
  return {queries,calls,supplier,tableState};
}
test('complete joined search, counts and stable pagination exceed the REST cap',async()=>{
  const {queries,tableState}=fixture();const all=await queries.getSupplierItems();assert.equal(all.length,1206);assert(all.every(r=>r.company_id==='tenant'&&r.item_name!=='-'));
  const late=await queries.getSupplierItems({search:'Late Needle'});assert.equal(late.length,1);assert.equal(late[0].id,'si1205');
  const sorted=await queries.getSupplierItems({sort:'unit_cost',dir:'desc'});const repeated=await queries.getSupplierItems({sort:'unit_cost',dir:'desc'});assert.equal(JSON.stringify(sorted.map(r=>r.id)),JSON.stringify(repeated.map(r=>r.id)));
  const pages=Array.from({length:81},(_,i)=>tableState.paginateRows(sorted,String(i+1)).rows).flat();assert.equal(new Set(pages.map(r=>r.id)).size,1206);assert.equal(tableState.paginateRows(sorted,'999').page,81);
});
test('scope filters preserve full results, invalid inputs are empty, and empty/denied reads stay empty',async()=>{
  const {queries,supplier,calls}=fixture();assert.equal((await queries.getSupplierItems({status:'active',supplier})).length,603);assert(calls.every(c=>c.end-c.start<500));
  for(const filters of [{status:'invalid'},{supplier:'invalid'},{search:'absent'}, {supplier:'00000000-0000-4000-8000-000000000002'}])assert.equal((await queries.getSupplierItems(filters)).length,0);
  assert.equal((await fixture({denied:true}).queries.getSupplierItems()).length,0);
});
for(const failTable of ['supplier_items','suppliers','items'])test(`${failTable} errors fail closed`,async()=>{await assert.rejects(fixture({failTable}).queries.getSupplierItems(),/read failed/)});
