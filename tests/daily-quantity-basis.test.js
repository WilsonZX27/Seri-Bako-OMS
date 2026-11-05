import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/daily-quantity-basis.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>({normalizeUom:v=>String(v??'').trim().toUpperCase()})});
const basis=exports.dailyQuantityBasis;
const verified=unit=>({quantity_unit_snapshot:unit,quantity_unit_verified:true,daily_tracking:'food_daily'});
test('historical/current catalogue units cannot establish an immutable snapshot',()=>{
 for(const lines of [[],[{}],[{selling_unit:'PCS'}],[{quantity_unit_snapshot:'PCS'}],[{...verified('PCS'),quantity_unit_verified:false}]])assert.equal(basis(lines).available,false);
});
test('only verified matching units in the same food population can combine',()=>{
 assert.equal(basis([verified('KG'),verified(' kg ')]).available,true);
 assert.equal(basis([verified('KG'),verified('LITRE')]).available,false);
 assert.equal(basis([verified('PCS'),{...verified('PCS'),daily_tracking:'beverage'}]).available,false);
 assert.equal(basis([{...verified('PCS'),daily_tracking:'packaging'}]).available,false);
 assert.equal(basis([verified('KG'),{}]).available,false);
});
test('list/detail/insights hide unverified aggregates while preserving completion and money',()=>{
 const read=p=>fs.readFileSync(p,'utf8');
 const query=read('src/server/queries/outlet-daily-records.ts');
 assert.match(query,/quantity_totals_available: dailyQuantityBasis\(lines\).available/);
 assert.match(query,/quantity_totals_available: dailyQuantityBasis\(trendLines\).available/);
 assert.match(read('src/lib/operational-value-display.ts'),/row.quantity_totals_available === false/);
 const list=read('src/app/(app)/outlet-daily-records/page.tsx');
 assert.doesNotMatch(list,/formatNumber\(history.summary.today_(sent|received)\)/);
 assert.match(list,/row.quantity_totals_available === false \? "Unavailable"/);
 const detail=read('src/app/(app)/outlet-daily-records/[id]/page.tsx');
 assert.match(detail,/record.quantity_totals_available === false \? <Card>/);
 assert.match(detail,/sales=\{\{ pos_total_sales:/);
 const insights=read('src/app/(app)/outlet-daily-records/insights/page.tsx');
 assert.match(insights,/trend && trend.quantity_totals_available/);
 assert.match(insights,/trend\?\.quantity_totals_available === false \? <Notice/);
 assert.match(insights,/previous\?\.quantity_unit === trend.quantity_unit/);
 assert.match(insights,/report==="completion"\?<OutletDailyCompletionMatrix/);
 assert.match(insights,/wastageCost.amount.toFixed/);
});
