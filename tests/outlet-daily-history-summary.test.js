import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const load = file => { const c={exports:{}}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c); return c.exports; };
const {omitEmptyDailyHistory}=load('src/lib/outlet-daily-history.ts');
const {productAvailableOn}=load('src/lib/production-planning/availability.ts');
const source=fs.readFileSync('src/server/queries/outlet-daily-records.ts','utf8');
const body=source.slice(source.indexOf('const totals ='),source.indexOf('const shiftDate ='));
const c={omitEmptyDailyHistory,productAvailableOn};
vm.runInNewContext(ts.transpileModule(body+'; globalThis.calculate=totals;',{}).outputText,c);
const empty={product_id:'moon',daily_tracking:'food_daily',qty_sent:0,qty_sent_source:'unavailable',morning_received_qty:0,morning_received_provided:false,qty_sent_estimated:null,wastage_qty:0,evening_leftover_qty:0};
const real={...empty,product_id:'real',qty_sent:4,qty_sent_confirmed:true,morning_received_qty:4,morning_received_provided:true,wastage_qty:1};
const availability={date:'2026-11-02',products:new Map([['moon',{status:'active',available_until:'2026-10-01'}]])};
test('empty expired history does not add receipt pending before/after save or on posted read',()=>{
 for(const status of ['draft','morning_recorded','evening_completed','reviewed']){
  const rows=[real,{...empty,status}]; const before=JSON.stringify(rows); const result=c.calculate(rows,undefined,availability);
  assert.equal(result.received_pending_lines,0);assert.equal(result.total_received,4);assert.equal(result.total_wastage,1);
  assert.equal(result.qty_sent_state,'missing');assert.equal(JSON.stringify(rows),before);
 }
});
test('actual history, explicit zeros, notes and missing catalogue remain authoritative',()=>{
 for(const patch of [{morning_received_qty:2},{morning_received_provided:true},{qty_sent_confirmed:true},{notes:'keep'},{wastage_qty:1},{do_managed:true}]){
  const row={...empty,...patch};assert.equal(omitEmptyDailyHistory(row,false),false);
  const result=c.calculate([real,row],undefined,availability);
  assert.equal(result.received_pending_lines,patch.morning_received_provided?0:1);
 }
 assert.equal(c.calculate([real,empty]).received_pending_lines,1);
 assert.equal(c.calculate([real,empty],undefined,{...availability,date:'2026-10-01'}).received_pending_lines,1);
});

test('confirmed seasonal zeros collapse without dropping evidence or mounted inputs',()=>{
 const {collapseZeroDailyHistory}=load('src/lib/outlet-daily-history.ts');
 const zero={...empty,qty_sent_confirmed:true,morning_received_provided:true,wastage_provided:true};
 assert.equal(collapseZeroDailyHistory(zero,false),true);
 assert.equal(omitEmptyDailyHistory(zero,false),false);
 for(const change of [{qty_sent:1},{notes:'checked'},{stockout:true},{wastage_reason:'other'}]) assert.equal(collapseZeroDailyHistory({...zero,...change},false),false);
 assert.equal(collapseZeroDailyHistory(zero,true),false);
 const form=fs.readFileSync('src/components/outlet-daily-record-form.tsx','utf8');
 assert.match(form,/aria-expanded=\{showZeroHistory\}/);
 assert.match(form,/showZeroHistory \|\| normalizedSearch.length > 0 \|\| !zeroHistoryIds.has/);
 assert.match(form,/hiddenClass=\{matches \? "" : "hidden"\}/);
});

test('every historical quantity and confirmation protects seasonal evidence without mutation',()=>{
 const quantities=['qty_sent','morning_received_qty','evening_leftover_qty','wastage_qty','qty_sent_estimated','usage_qty','sold_qty','saleable_next_day_qty'];
 for(const key of quantities){
  for(const value of [null,0,0.25,2]){
   const line={...empty,[key]:value};const before=JSON.stringify(line);
   assert.equal(omitEmptyDailyHistory(line,false),value===null||value===0,`${key}=${value}`);
   assert.equal(JSON.stringify(line),before);
  }
 }
 for(const key of ['qty_sent_confirmed','morning_received_provided','wastage_provided','do_managed','stockout']){
  assert.equal(omitEmptyDailyHistory({...empty,[key]:true},false),false,key);
 }
});

test('record-date boundaries preserve eligible zeros and exclude only unavailable empty history',()=>{
 for(const date of ['2026-09-30','2026-10-01','2026-10-02']){
  for(const is_seasonal of [false,true]){
   const product={status:'active',is_seasonal,available_from:'2026-10-01',available_until:'2026-10-01'};
   const result=c.calculate([real,empty],undefined,{date,products:new Map([['moon',product]])});
   assert.equal(result.received_pending_lines,date==='2026-10-01'?1:0,`${date}/${is_seasonal}`);
  }
 }
});
