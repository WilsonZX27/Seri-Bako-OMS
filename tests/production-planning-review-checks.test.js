const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/review-checks.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {planReviewChecks}=context.exports;
const allocation=(patch={})=>({product_id:'p',branch_id:'a',suggested_qty:16,approved_qty:16,minimum_qty:0,event_qty:0,reason:'',evidence:{reductionFloor:0},...patch});
const production=(patch={})=>({product_id:'p',yield_per_tray:16,trays:1,retained_qty:0,actual_qty:null,reason:'',event_qty:0,...patch});
const messages=(a,p)=>Array.from(planReviewChecks(a,p),check=>check.message);
test('a balanced explicit zero plan is ready; missing manual quantities remain distinct from zero',()=>{
 assert.equal(planReviewChecks([allocation({suggested_qty:0,approved_qty:0})],[production({trays:0})]).length,0);
 const checks=planReviewChecks([allocation({suggested_qty:null,approved_qty:null})],[production({trays:null})]);
 assert.equal(checks.length,2);assert.equal(checks[0].branchId,'a');assert.match(checks[0].message,/quantity/);assert.match(checks[1].message,/trays/);
});
test('manual quantities need a reason and incomplete outlet minimums identify their Settings dependency',()=>{
 let a=allocation({suggested_qty:null,minimum_qty:null});let checks=planReviewChecks([a],[production()]);
 assert.equal(checks.length,2);assert.ok(checks.some(c=>/Settings/.test(c.message)));assert.ok(checks.some(c=>/reason/.test(c.message)));
 assert.equal(planReviewChecks([allocation({suggested_qty:null,reason:'Confirmed manual demand'})],[production()]).length,0);
});
test('confirmed event quantities cannot be reduced even with an adjustment reason',()=>{
 assert.ok(messages([allocation({event_qty:20,reason:'Reduction'})],[production()]).some(m=>/full confirmed event/.test(m)));
});
test('minimum and reduction floor require a Manager reason even when suggestion and allocation match',()=>{
 for(const patch of [{minimum_qty:20},{evidence:{reductionFloor:20}}]){
  assert.ok(messages([allocation(patch)],[production()]).some(m=>/Manager reason/.test(m)));
  assert.equal(planReviewChecks([allocation({...patch,reason:'Manager reviewed'})],[production()]).length,0);
 }
});
test('unallocated output and allocation exceeding production have different actionable guidance',()=>{
 assert.ok(messages([allocation()],[production({trays:2})]).some(m=>/remaining output/.test(m)));
 assert.ok(messages([allocation({approved_qty:32,reason:'Event increase'})],[production()]).some(m=>/exceeds production/.test(m)));
});
test('corporate quantities stay separate and kitchen retention requires a reason',()=>{
 let checks=messages([allocation()],[production({trays:3,event_qty:16,retained_qty:16})]);assert.deepEqual(checks,['Add the reason for keeping stock in the kitchen.']);
 assert.equal(planReviewChecks([allocation()],[production({trays:3,event_qty:16,retained_qty:16,reason:'Kitchen collection'})]).length,0);
});
test('missing yield and fractional trays identify different configuration and input problems',()=>{
 const checks=messages([allocation()],[production({yield_per_tray:null,trays:1.5})]);assert.equal(checks.length,2);assert.match(checks[0],/Settings/);assert.match(checks[1],/whole number/);
});
test('nonfinite, negative and excessive quantities cannot be ready for review',()=>{
 for(const qty of [-1,Infinity,NaN,1000001])assert.ok(planReviewChecks([allocation({approved_qty:qty})],[production()]).length>0);
});
test('checks retain the correct product and outlet identity without company-wide averaging',()=>{
 const checks=planReviewChecks([allocation({branch_id:'b',approved_qty:null}),allocation()],[production()]);
 assert.equal(checks.length,1);assert.equal(checks[0].branchId,'b');assert.equal(checks[0].productId,'p');
});
