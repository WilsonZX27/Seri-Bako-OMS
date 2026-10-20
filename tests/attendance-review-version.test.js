const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')({crypto:require('node:crypto').webcrypto,TextEncoder});
const {attendanceReviewContentVersion:version}=load('src/lib/attendance/review-version.ts');
const source={result:{company_id:'tenant',staff_id:'staff',work_date:'2026-10-12',id:'result',calculation_revision:1,is_current:true,review_status:'pending',payable_seconds:3600,calculation:{schedule_source_revision:2,schedule_source_hash:'source',punches:['in','out']}},schedule:{source_revision:2,source_hash:'source',calculated_revision:2,status:'ready'}};
test('content binding is stable across workflow-only review advancement and object key order',async()=>{
 const first=await version(source),next=await version({...source,result:{...Object.fromEntries(Object.entries(source.result).reverse()),review_status:'reviewed'}});
 assert.equal(first.version,next.version);assert.equal(first.calculationReady,true);
});
test('changed displayed attendance hours or punch evidence invalidate the binding',async()=>{
 const baseline=(await version(source)).version;
 for(const result of [{...source.result,payable_seconds:7200},{...source.result,calculation:{...source.result.calculation,punches:['corrected in','out']}}])assert.notEqual((await version({...source,result})).version,baseline);
});
test('private payroll changes and fresh result identities do not invalidate unchanged employee attendance',async()=>{
 const baseline=await version(source);
 const changed=await version({...source,result:{...source.result,id:'new-result',calculation_revision:2,basic_salary:9000,hourly_rate:99,meal_allowance_amount:500,payroll_total:30000,calculation:{...source.result.calculation,payroll_rate:123,private_salary:99999}}});
 assert.equal(changed.version,baseline.version);
 assert.ok(!JSON.stringify(changed.attendanceContent).includes('salary'));
 assert.ok(!Object.hasOwn(changed.attendanceContent,'meal_allowance_amount'));
});
test('source changes block readiness until recalculated without changing an identical attendance digest',async()=>{
 const changed=await version({...source,schedule:{...source.schedule,source_revision:3,source_hash:'new'}});
 assert.equal(changed.version,(await version(source)).version);assert.equal(changed.calculationReady,false);
 const ready=await version({...source,result:{...source.result,calculation:{...source.result.calculation,schedule_source_revision:3,schedule_source_hash:'new'}},schedule:{...source.schedule,source_revision:3,calculated_revision:3,source_hash:'new'}});
 assert.equal(ready.version,changed.version);assert.equal(ready.calculationReady,true);
});
test('missing, pending, stale and protected calculations are never ready for confirmation',async()=>{
 for(const schedule of [null,{...source.schedule,status:'pending'},{...source.schedule,status:'needs_review'},{...source.schedule,calculated_revision:1}])assert.equal((await version({...source,schedule})).calculationReady,false);
 assert.equal((await version({...source,result:{...source.result,is_current:false}})).calculationReady,false);
});
test('unexpected nested fields cannot enter the employee punch projection',async()=>{
 const result=await version({...source,result:{...source.result,calculation:{...source.result.calculation,punches:[{private_salary:99999}]}}});
 assert.deepEqual(Array.from(result.attendanceContent.punches),[]);assert.equal(result.calculationReady,false);
 assert.ok(!JSON.stringify(result.attendanceContent).includes('private_salary'));
});
