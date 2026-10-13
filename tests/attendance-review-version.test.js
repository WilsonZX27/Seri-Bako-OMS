const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')({crypto:require('node:crypto').webcrypto,TextEncoder});
const {attendanceReviewContentVersion:version}=load('src/lib/attendance/review-version.ts');
const source={result:{company_id:'tenant',staff_id:'staff',work_date:'2026-10-12',id:'result',calculation_revision:1,is_current:true,review_status:'pending',payable_seconds:3600,calculation:{schedule_source_revision:2,schedule_source_hash:'source',punches:['in','out']}},schedule:{source_revision:2,source_hash:'source',calculated_revision:2,status:'ready'}};
test('content binding is stable across workflow-only review advancement and object key order',async()=>{
 const first=await version(source),next=await version({...source,result:{...Object.fromEntries(Object.entries(source.result).reverse()),review_status:'reviewed'}});
 assert.equal(first.version,next.version);assert.equal(first.calculationReady,true);
});
test('pay, evidence, result revision and schedule source changes invalidate the old binding',async()=>{
 const baseline=(await version(source)).version;
 for(const result of [{...source.result,payable_seconds:7200},{...source.result,calculation_revision:2},{...source.result,calculation:{...source.result.calculation,punches:['corrected in','out']}}])assert.notEqual((await version({...source,result})).version,baseline);
 const changed=await version({...source,schedule:{...source.schedule,source_revision:3,source_hash:'new'}});assert.notEqual(changed.version,baseline);assert.equal(changed.calculationReady,false);
});
test('missing, pending, stale and protected calculations are never ready for confirmation',async()=>{
 for(const schedule of [null,{...source.schedule,status:'pending'},{...source.schedule,status:'needs_review'},{...source.schedule,calculated_revision:1}])assert.equal((await version({...source,schedule})).calculationReady,false);
 assert.equal((await version({...source,result:{...source.result,is_current:false}})).calculationReady,false);
});
