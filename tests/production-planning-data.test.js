const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const modules=new Map();
function load(path){if(modules.has(path))return modules.get(path);const context={exports:{},require:name=>load('src/'+name.slice(2)+'.ts')};modules.set(path,context.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;}
const {buildPlanPayload}=load('src/server/production-planning/data.ts');
function fixture(){
 const company='company',kitchen='kitchen',outlets=Array.from({length:10},(_,i)=>({id:'outlet-'+i,company_id:company,branch_type:'outlet',branch_name:'Outlet '+i,status:'active',deleted_at:null}));
 const products=Array.from({length:40},(_,i)=>({id:'p-'+i,company_id:company,product_code:'SC'+String(i).padStart(2,'0'),product_name:'Kuih '+i,category:'steamed cake',display_order:i,selling_unit:'PCS',status:'active',deleted_at:null}));
 const records=outlets.flatMap(o=>Array.from({length:8},(_,i)=>({id:o.id+'-r-'+i,company_id:company,branch_id:o.id,record_date:new Date(Date.UTC(2026,7,8+i*7)).toISOString().slice(0,10),status:'reviewed'})));
 const tables={branches:[{id:kitchen,company_id:company,branch_type:'central_kitchen',branch_name:'Kitchen',status:'active',deleted_at:null},...outlets],products,
 branch_supply_routes:outlets.map(o=>({id:'route-'+o.id,company_id:company,source_branch_id:kitchen,destination_branch_id:o.id,status:'active',is_primary:true,effective_from:'2020-01-01',effective_to:null})),
 production_planning_settings:[{kitchen_id:kitchen,company_id:company,enabled:false,draft_time:'20:00:00',buffer_percent:10,max_decrease_percent:10,recipients:[]}],
 production_batch_rules:products.map(p=>({kitchen_id:kitchen,company_id:company,product_id:p.id,yield_per_tray:16})),
 production_outlet_minimums:outlets.flatMap(o=>products.map(p=>({kitchen_id:kitchen,company_id:company,branch_id:o.id,product_id:p.id,minimum_qty:0}))),production_planning_events:[],public_holiday_branches:[],public_holidays:[],outlet_daily_records:records,
 outlet_daily_record_lines:records.flatMap(r=>products.map(p=>({id:r.id+':'+p.id,record_id:r.id,product_id:p.id,morning_received_qty:100,morning_received_provided:true,evening_leftover_qty:0,wastage_qty:60,wastage_provided:true,stockout:false}))) };
 let reads=0;
 const db={from(table){let filters=[],from=0,to=Infinity,sorts=[];const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},is(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},order(k){sorts.push(k);return q;},range(a,b){from=a;to=b;return q;},limit(n){to=n-1;return q;},then(resolve){reads++;let rows=(tables[table]??[]).filter(r=>filters.every(f=>f(r)));rows.sort((a,b)=>{for(const k of sorts){const diff=String(a[k]).localeCompare(String(b[k]));if(diff)return diff;}return 0;});return Promise.resolve({data:rows.slice(from,Math.min(to+1,from+200)),count:rows.length,error:null}).then(resolve);}};return q;}};
 return {db,tables,reads:()=>reads,company,kitchen};
}
test('plan loader reads 3,200 historical lines through capped pages and keeps 400 outlet/product series distinct',async()=>{
 const f=fixture();const p=await buildPlanPayload(f.db,f.company,f.kitchen,'2026-10-03');assert.equal(p.allocations.length,400);assert.equal(p.product_lines.length,40);assert.equal(p.allocations[0].evidence.evidence.length,8);assert.equal(p.allocations[0].suggested_qty,90);assert.equal(p.product_lines[0].trays,57);assert.ok(f.reads()>20);
});
test('a missing receipt excludes its whole food record, packaging does not contribute and events stay separate',async()=>{
 const f=fixture();const line=f.tables.outlet_daily_record_lines.find(l=>l.record_id==='outlet-0-r-7'&&l.product_id==='p-0');line.morning_received_provided=false;
 f.tables.production_planning_events.push({id:'event-1',company_id:f.company,kitchen_id:f.kitchen,branch_id:null,event_date:'2026-10-03',confirmed:true,name:'Corporate',lines:[{product_id:'p-0',qty:32}]});
 const p=await buildPlanPayload(f.db,f.company,f.kitchen,'2026-10-03');assert.equal(p.allocations.find(a=>a.branch_id==='outlet-0'&&a.product_id==='p-1').evidence.evidence.length,7);assert.equal(p.product_lines[0].event_qty,32);assert.equal(p.allocations[0].event_qty,0);assert.equal(p.product_lines[0].trays,59);
});
