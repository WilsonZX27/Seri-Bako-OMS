const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./helpers/load-source.cjs')();
const {verifiedPlanningUnit,PLANNING_UNIT_REVIEW}=load('src/lib/production-planning/unit-basis.ts');
const source=fs.readFileSync('src/server/actions/production-planning.ts','utf8');
async function estimate(lines){
 const chain=new Proxy({},{get:()=>()=>chain});let reads=0;const exports={};
 vm.runInNewContext(ts.transpileModule(source.slice(source.indexOf('export async function estimatePlanningMinimums')),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,verifiedPlanningUnit,PLANNING_UNIT_REVIEW,manager:async()=>({db:{from:()=>chain},companyId:'c'}),uuid:{parse(){}},date:{parse(){}},loadPlanningContext:async()=>({kitchens:[{id:'k'}],outlets:[{id:'o'}],products:[{id:'p',selling_unit:'PCS'}],events:[]}),complete:async()=>++reads===1?[{id:'r',branch_id:'o',record_date:'2026-11-01'}]:lines,addDays:()=>'',estimateNonzeroMinimum:load('src/lib/production-planning/minimum-estimate.ts').estimateNonzeroMinimum,formatActionError:e=>e.message});
 return exports.estimatePlanningMinimums('k','2026-11-05');
}
const row={record_id:'r',product_id:'p',morning_received_qty:0,morning_received_provided:true,wastage_qty:0,wastage_provided:true,evening_leftover_qty:0};
test('unknown, changed and missing unit history does not replace minimums with floor one',async()=>{for(const rows of [[row],[{...row,quantity_unit_verified:true,quantity_unit_snapshot:'KG'}],[]]){const result=await estimate(rows);assert.equal(result.ok,false);assert.equal(Object.keys(result.minimums).length,0);}});
test('verified matching unit keeps explicit zero distinct from missing history',async()=>{const result=await estimate([{...row,quantity_unit_verified:true,quantity_unit_snapshot:'PCS'}]);assert.equal(result.ok,true);assert.equal(result.minimums['o:p'],'1');});
test('verification requires explicit snapshot and current unit match',()=>{assert.equal(verifiedPlanningUnit({quantity_unit_verified:true,quantity_unit_snapshot:' pcs '},'PCS'),true);assert.equal(verifiedPlanningUnit({quantity_unit_snapshot:'PCS'},'PCS'),false);assert.equal(verifiedPlanningUnit({quantity_unit_verified:true,quantity_unit_snapshot:''},''),false);});
