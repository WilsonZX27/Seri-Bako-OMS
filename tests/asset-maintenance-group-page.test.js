const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')();
const {getMaintenanceGroupPage}=load('src/server/queries/asset-maintenance-page.ts');
function database(rows,failAt=0){let reads=0;return{from(table){assert.equal(table,'asset_maintenance');let selected='*',filters=[],start=0,end=Infinity;const q={select(s){selected=s;return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,vs){filters.push(r=>vs.includes(r[k]));return q},not(k,_op,v){filters.push(r=>!v.slice(1,-1).split(',').includes(r[k]));return q},gte(k,v){filters.push(r=>r.date>=v);return q},lt(k,v){filters.push(r=>r.date<v);return q},order(){return q},range(a,b){start=a;end=b;return q},then(resolve){reads++;return Promise.resolve(reads===failAt?{error:{message:'read failed'},data:null}:{error:null,data:rows.filter(r=>filters.every(f=>f(r))).slice(start,end+1).map(r=>selected==='*'?r:{id:r.id,asset_id:r.asset_id})}).then(resolve)}};return q}}}
const row=(id,asset_id,extra={})=>({id,asset_id,company_id:'company',location_id:'a',status:'Open',date:'2026-10-31',source_data:{},...extra});
test('groups before pagination across500 identity boundary; only requested groups hydrated',async()=>{
const rows=Array.from({length:511},(_,i)=>row(String(i),i%11===0?'shared':'asset'+i));
const first=await getMaintenanceGroupPage(database(rows),'company',1,10);
assert.equal(first.total,465);assert.equal(first.records.filter(r=>r.asset_id==='shared').length,47);
const second=await getMaintenanceGroupPage(database(rows),'company',2,10);
assert.ok(!second.records.some(r=>r.asset_id==='shared'));assert.equal(second.records.length,10);
});
test('same asset across statuses and locations stays one group; filters applied before grouping and detail fetch',async()=>{
const rows=[row('1','same'),row('2','same',{status:'Closed',location_id:'b'}),row('3','other'),row('4',null),row('5',null),row('foreign','same',{company_id:'other'})];
const all=await getMaintenanceGroupPage(database(rows),'company',1,10);assert.equal(all.total,4);assert.equal(all.records.length,5);
const filtered=await getMaintenanceGroupPage(database(rows),'company',1,10,{locationId:'b',status:'Processed',date:'2026-10-31'});assert.equal(filtered.records.map(r=>r.id).join(','),'2');
const overview=await getMaintenanceGroupPage(database(rows),'company',1,10,{overview:true});assert.ok(!overview.records.some(r=>r.id==='2'));
});
test('empty and out of range remain empty; metadata/detail failures never return fabricated zero',async()=>{
assert.equal(JSON.stringify(await getMaintenanceGroupPage(database([]),'company',1,10)),JSON.stringify({records:[],total:0}));
assert.equal(JSON.stringify(await getMaintenanceGroupPage(database([row('1','a')]),'company',2,10)),JSON.stringify({records:[],total:1}));
for(const n of [1,2])await assert.rejects(getMaintenanceGroupPage(database([row('1','a')],n),'company',1,10),/read failed/);
});
