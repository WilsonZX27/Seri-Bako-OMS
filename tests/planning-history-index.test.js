const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const verifiedPlanningUnit=require('./helpers/load-source.cjs')()('src/lib/production-planning/unit-basis.ts').verifiedPlanningUnit;
function history(source=fs.readFileSync('src/server/production-planning/data.ts','utf8')){
 const start=source.includes('  const historyProductsById =')?source.indexOf('  const historyProductsById ='):source.indexOf('  const foodIds =');
 const block=source.slice(start,source.indexOf('  // Carry stock is read independently',start));const exports={};
 vm.runInNewContext(ts.transpileModule('export function build(context:any,historyLines:any,recordMap:any){'+block+'return series;}',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,verifiedPlanningUnit});return exports.build;
}
const line=(product_id,unit='PCS')=>({record_id:'r',product_id,morning_received_qty:5,morning_received_provided:true,evening_leftover_qty:1,wastage_qty:0,wastage_provided:true,quantity_unit_verified:true,quantity_unit_snapshot:unit});
const records=new Map([['r',{id:'r',branch_id:'b',record_date:'2026-11-04'}]]);
test('history index preserves first product definition and strict product identity',()=>{
 const series=history()({products:[{id:'p',selling_unit:'KG'},{id:'p',selling_unit:'PCS'},{id:'1',selling_unit:'PCS'}],events:[]},[line('p'),line(1),line('1')],records);
 assert.equal(series.size,1);assert.equal(series.get('b:1').length,1);
});
test('history unit verification, complete-record provenance and event evidence stay intact',()=>{
 const lines=[line('p'),{...line('q'),morning_received_provided:false}, {...line('unknown'),quantity_unit_verified:false}];
 const series=history()({products:[{id:'p',selling_unit:'PCS'},{id:'q',selling_unit:'PCS'}],events:[{confirmed:true,event_date:'2026-11-04',branch_id:'b',lines:[{product_id:'p'}]}]},lines,records);
 assert.equal(series.get('b:p')[0].specialEvent,true);assert.equal(series.get('b:p')[0].completed,false);assert.equal(series.get('b:p')[0].received,5);assert.equal(series.has('b:unknown'),false);
 assert.throws(()=>history()({products:[],events:[]},[{record_id:'gone'}],records),/History changed/);
});
test('catalogue identity accesses stay bounded when historical line count grows',()=>{
 let reads=0;const count=400;const products=Array.from({length:count},(_,i)=>({get id(){reads++;return 'p'+i;},selling_unit:'PCS'}));const lines=Array.from({length:4000},(_,i)=>line('p'+i%count));
 const series=history()({products,events:[]},lines,records);assert.equal(series.size,count);assert.ok(reads<count*5,`catalogue ID reads ${reads}`);
});
module.exports={history,line};
