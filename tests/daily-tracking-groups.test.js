const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='@/lib/product-order'?load('src/lib/product-order.ts'):require(name)});return exports;}
const {dailyTracking}=load('src/lib/daily-product-tracking.ts');
const {salesChannels,cardChannels,otherChannels}=load('src/lib/outlet-sales-channels.ts');
test('daily record snapshots survive later product reclassification',()=>{
 assert.equal(dailyTracking({category:'Bakery',daily_tracking:'food_carryover'},'food_daily'),'food_daily');
 assert.equal(dailyTracking({category:'Bakery',daily_tracking:'food_carryover'}),'food_carryover');
 assert.equal(dailyTracking({category:' Packaging '}),'packaging');
 assert.equal(dailyTracking({category:'unclassified'}),'food_daily');
});
test('new tender groups are disjoint and retain Voucher and a separate historical aggregate',()=>{
 assert.equal(new Set(salesChannels).size,15);
 assert.equal(cardChannels.length,7);
 assert.ok(otherChannels.includes('voucher'));
 assert.ok(!cardChannels.includes('credit_card'));
 assert.ok(!otherChannels.includes('credit_card'));
 assert.equal(cardChannels.filter(x=>otherChannels.includes(x)).length,0);
});
test('server extraction preserves independent usage, sold and blank physical balance',()=>{
 const source=fs.readFileSync('src/server/actions/outlet-daily-records.ts','utf8').split('export async function saveOutletDailyRecord')[0].replace(/^import .*;\r?\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const extract=new Function('z','salesChannels',`${js};return extractOutletDailyPayload;`)(require('zod').z,salesChannels);
 const data=new FormData();data.set('branch_id','11111111-1111-4111-8111-111111111111');data.set('record_date','2026-10-17');
 for(const [key,value] of Object.entries({line_product_id:'22222222-2222-4222-8222-222222222222',daily_tracking:'food_carryover',usage_qty:'4',sold_qty:'',wastage_qty:'0',morning_received_qty:'6',evening_leftover_qty:''}))data.set(key,value);
 const result=extract(data);assert.equal(result.lines[0].usage_qty,4);assert.equal(result.lines[0].sold_qty,null);assert.equal(result.lines[0].wastage_qty,0);assert.equal(result.lines[0].closing_balance_provided,false);
 data.set('usage_qty','-1');assert.throws(()=>extract(data));
});
