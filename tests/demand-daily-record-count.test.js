const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('src/server/queries/outlet-daily-records.ts','utf8')+'\nexport { buildDemandTrend };';
const m={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>n==='react'?require('react'):{},console});
test('daily completed count deduplicates products, excludes incomplete records and respects product selection',()=>{
 const records=[{id:'a',record_date:'2026-10-14',branch_id:'b',status:'evening_completed'},{id:'b',record_date:'2026-10-14',branch_id:'c',status:'reviewed'},{id:'c',record_date:'2026-10-14',branch_id:'c',status:'draft'}];
 const line=(record_id,product_id)=>({record_id,product_id,morning_received_qty:100,morning_received_provided:true,evening_leftover_qty:20,wastage_qty:5});
 const input={records,lines:[line('a','p'),line('a','q'),line('b','q'),line('c','p')],branches:[{id:'b'},{id:'c'}],products:[{id:'p',category:'Kuih'},{id:'q',category:'Kuih'}],start:'2026-10-14',end:'2026-10-14',period:'7',status:'all'};
 const all=m.exports.buildDemandTrend(input);assert.equal(all.daily[0].completed_records,2);assert.equal(all.daily[0].movement,225);assert.equal(all.daily[0].wastage_percent,5);
 const selected=m.exports.buildDemandTrend({...input,productId:'p'});assert.equal(selected.daily[0].completed_records,1);assert.equal(selected.daily[0].movement,75);
 const empty=m.exports.buildDemandTrend({...input,records:[],lines:[]});assert.equal(empty.daily.length,0);
});
