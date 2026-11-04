const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/availability.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);const available=context.exports.productAvailableOn;
test('availability respects inclusive start and end dates independently of seasonal label',()=>{for(const is_seasonal of [true,false]){const p={is_seasonal,available_from:'2026-09-01',available_until:'2026-10-01'};for(const [date,expected] of [['2026-08-31',false],['2026-09-01',true],['2026-09-15',true],['2026-10-01',true],['2026-10-02',false],['2027-01-01',false]])assert.equal(available(p,date),expected);}});
test('unbounded year-round products remain available',()=>assert.equal(available({is_seasonal:false,available_from:null,available_until:null},'2026-11-02'),true));

const historyContext={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/outlet-daily-history.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,historyContext);
const omit=historyContext.exports.omitEmptyDailyHistory;
const emptyHistory={daily_tracking:'food_daily',qty_sent_source:'unavailable',qty_sent:0,morning_received_qty:0,wastage_qty:0,notes:null};
test('expired unconfirmed draft history can be omitted while actual and confirmed values remain',()=>{
  assert.equal(omit(emptyHistory,false),true);
  for(const change of [{qty_sent:2},{notes:'Recorded reason'},{morning_received_provided:true},{qty_sent_confirmed:true},{wastage_provided:true},{do_managed:true},{stockout:true},{qty_sent_source:'authorized_draft'},{usage_qty:3}])
    assert.equal(omit({...emptyHistory,...change},false),false);
});
test('availability and evidence, not record status or lock, control empty-history presentation',()=>{
  assert.equal(omit(emptyHistory,true),false);
  assert.equal(omit(emptyHistory,false),true);
  assert.equal(omit(undefined,false),false);
  assert.equal(omit({...emptyHistory,daily_tracking:'food_carryover'},false),false);
  assert.equal(omit({...emptyHistory,qty_sent_confirmed:true,qty_sent:0},false),false);
  assert.equal(omit({...emptyHistory,wastage_provided:true,wastage_qty:0},false),false);
  const form=fs.readFileSync('src/components/outlet-daily-record-form.tsx','utf8');
  const call=form.slice(form.indexOf('omitEmptyDailyHistory(lines'),form.indexOf(').map(product => product.id)'));
  assert.doesNotMatch(call,/recordStatus|locked/);
  assert.match(form,/locked=\{locked \|\| !includedProductIds.has\(product.id\)\}/);
});
