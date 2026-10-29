const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')();
const {applySharedPlanningReason}=load('src/lib/production-planning/shared-reason.ts');
const production={product_id:'p',yield_per_tray:16,trays:2,retained_qty:0,event_qty:0,tray_mode:'manual',reason:''};
const allocation={product_id:'p',branch_id:'a',approved_qty:15,suggested_qty:16,minimum_qty:0,event_qty:0,reason:'',evidence:{}};
test('one reason fills only required missing reasons across products/outlets; never changes quantities or existing explanations',()=>{
 const allocations=[allocation,{...allocation,branch_id:'b',reason:'Existing explanation'},{...allocation,branch_id:'c',approved_qty:16}];
 const rows=[production,{...production,product_id:'other',reason:'Separate fault'}];
 const before=JSON.stringify({allocations,rows});const edited=applySharedPlanningReason(allocations,rows,'  Event capacity  ');
 assert.equal(edited.count,2);assert.equal(edited.allocations[0].reason,'Event capacity');assert.equal(edited.production[0].reason,'Event capacity');
 assert.equal(edited.allocations[1].reason,'Existing explanation');assert.equal(edited.allocations[2].reason,'');assert.equal(edited.production[1].reason,'Separate fault');
 assert.equal(edited.allocations[0].approved_qty,15);assert.equal(edited.production[0].trays,2);assert.equal(JSON.stringify({allocations,rows}),before);
});
test('blank shared explanation is rejected; one production reason satisfies both manual and retention gates only once',()=>{
 assert.throws(()=>applySharedPlanningReason([allocation],[production],'  '),/Enter a reason/);
 const edited=applySharedPlanningReason([],[{...production,retained_qty:1}],'Kept for event');assert.equal(edited.count,1);
});
