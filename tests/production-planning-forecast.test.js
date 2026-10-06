const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/forecast.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {recommendQuantity:forecast,trayRequirement,addDays}=context.exports;
const point=(date,received,wastage,extra={})=>({recordId:date,date,received,leftover:0,wastage,receivedProvided:true,completed:true,specialEvent:false,stockout:false,...extra});
const three=[point('2026-09-12',100,70),point('2026-09-19',100,60),point('2026-09-26',100,50)];
test('per outlet/product same-weekday recency weights, buffer and gradual reduction are independent',()=>{
 const r=forecast(three,'2026-10-03',5);assert.equal(r.method,'same-weekday');assert.equal(r.weightedMovement,(30+40*2+50*3)/6);assert.equal(r.suggested,90);assert.equal(r.reductionFloor,90);
 assert.equal(forecast(three.map(p=>({...p,received:10,wastage:5})),'2026-10-03',2).suggested,9);
});
test('minimums are confirmed explicitly; no history or missing minimum means manual quantity',()=>{
 assert.equal(forecast([],'2026-10-03',0).suggested,null);assert.equal(forecast(three,'2026-10-03',null).suggested,null);assert.equal(forecast(three,'2026-10-03',120).suggested,120);
});
test('valid true zeros participate while drafts, missing receipts, special events and anomalies do not',()=>{
 const zeros=three.map(p=>({...p,received:0,wastage:0}));assert.equal(forecast(zeros,'2026-10-03',0).suggested,0);
 for(const extra of [{completed:false},{receivedProvided:false},{specialEvent:true},{wastage:101},{received:NaN}]){const r=forecast([...zeros,point('2026-09-05',100,50,extra)],'2026-10-03',0);assert.equal(r.excluded,1);assert.equal(r.evidence.length,3);assert.equal(r.suggested,0);}
});
test('fallback requires at least five recent records of matching weekday/weekend type',()=>{
 const weekday=['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'].map(d=>point(d,20,10));
 const r=forecast(weekday,'2026-10-02',0);assert.equal(r.method,'recent-day-type');assert.equal(r.suggested,18);
 assert.equal(forecast(weekday.slice(0,4),'2026-10-02',0).method,'manual');assert.equal(forecast(weekday,'2026-10-03',0).method,'manual');
});
test('sell-out or suspected shortage stops an automatic decrease',()=>{
 assert.equal(forecast(three.map((p,i)=>({...p,stockout:i===2})),'2026-10-03',0).suggested,100);
 const r=forecast([...three,point('2026-09-28',20,0)],'2026-10-03',0);assert.equal(r.stockoutRisk,true);assert.equal(r.suggested,100);
});
test('eight-week window excludes future, same-date and older receipts',()=>{
 const r=forecast([...three,point('2026-08-01',500,0),point('2026-10-03',500,0),point('2026-10-04',500,0)],'2026-10-03',0);assert.equal(r.evidence.length,3);assert.equal(r.suggested,90);
});
test('actual batch yields and integer trays leave explicit surplus; no automatic allocation',()=>{
 assert.equal(trayRequirement(33,16).trays,3);assert.equal(trayRequirement(33,16).unallocated,15);
 assert.equal(trayRequirement(33,32).unallocated,31);assert.equal(trayRequirement(33,16,3,15).unallocated,0);
 assert.equal(trayRequirement(33,16,2).unallocated,-1);assert.throws(()=>trayRequirement(10,16,1.5),/whole/);assert.throws(()=>trayRequirement(10,0),/Invalid/);
});
test('business dates and parameters reject malformed, rolled-over and non-finite input',()=>{
 assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.throws(()=>addDays('2026-02-30',0),/Invalid/);assert.throws(()=>forecast(three,'2026-10-03',-1),/Invalid/);assert.throws(()=>forecast(three,'2026-10-03',0,NaN),/Invalid/);
});

test('recent-day-type suggestions retain the decrease cap with no matching weekday observation',()=>{
 const dates=['2026-09-22','2026-09-23','2026-09-24','2026-09-28','2026-09-29'];
 const history=dates.map(d=>point(d,100,80));
 const result=forecast(history,'2026-10-02',0,10,10);
 assert.equal(result.method,'recent-day-type');assert.equal(result.reductionFloor,90);assert.equal(result.suggested,90);assert.equal(result.version,'quantity-proxy-v2');
 const shortage=forecast(history.map((p,i)=>({...p,stockout:i===4})),'2026-10-02',0,10,10);
 assert.equal(shortage.stockoutRisk,true);assert.equal(shortage.reductionFloor,100);assert.equal(shortage.suggested,100);
});
