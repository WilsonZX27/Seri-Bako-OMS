const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function setup({enabled=true,loggerThrows=false}={}){
 const logs=[];let sequence=0;const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/observability/inventory-read.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,performance,require:n=>n==='node:crypto'?{randomUUID:()=>`attempt-${++sequence}`}:n==='@/lib/reliability/flags'?{reliabilityFlags:{observation:enabled}}:{logServerInfo:(message,context)=>{if(loggerThrows)throw Error('logger failed');logs.push({message,...context});},logServerWarning:(message,context)=>{if(loggerThrows)throw Error('logger failed');logs.push({message,...context});}}});return {create:exports.createInventoryReadDiagnostics,logs};
}
const deadline=require('./helpers/load-source.cjs')({setTimeout,clearTimeout})('src/lib/inventory-read-deadline.ts').inventoryReadDeadline;
const settled=d=>Promise.all([d.track('summary',async()=>({unavailable:true})),d.track('movement',async()=>[]),d.track('permissions',async()=>({}))]);
test('one completed-attempt snapshot preserves values and does not equate fulfilled to available data',async()=>{
 const f=setup(),d=f.create(),value=await d.run(()=>settled(d));assert.equal(value[0].unavailable,true);assert.equal(f.logs.length,1);assert.equal(f.logs[0].event,'inventory_read_settled');assert.ok(Object.values(f.logs[0].readStates).every(x=>x.status==='fulfilled'&&Number.isFinite(x.durationMs)));assert.doesNotMatch(JSON.stringify(f.logs),/unavailable/);
});
test('rejection preserves original error and excludes sensitive message, body, URL and identities',async()=>{
 const f=setup(),d=f.create(),error=Object.assign(new Error('https://secret.example?token=PRIVATE actor@email'),{code:'PRIVATE',details:'PRIVATE',actorId:'PRIVATE',headers:{authorization:'PRIVATE'}});
 await assert.rejects(d.run(()=>Promise.all([d.track('summary',async()=>{throw error;}),d.track('movement',async()=>[]),d.track('permissions',async()=>({}))])),e=>e===error);
 assert.equal(f.logs.length,1);assert.equal(f.logs[0].readStates.summary.status,'rejected');assert.equal(f.logs[0].errorCode,'read_failed');assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE|secret\.example|actor@email|authorization|details/);
});
test('deadline snapshot identifies pending dependency; late completion does not mutate emitted snapshot',async()=>{
 const f=setup(),d=f.create();let resolve;const pending=new Promise(r=>{resolve=r;});
 await assert.rejects(d.run(()=>deadline(Promise.all([d.track('summary',()=>pending),d.track('movement',async()=>[]),d.track('permissions',async()=>({}))]),5)),/Inventory summary read timed out/);
 assert.equal(f.logs[0].errorCode,'workspace_deadline');assert.equal(f.logs[0].readStates.summary.status,'pending');resolve({});await new Promise(r=>setImmediate(r));assert.equal(f.logs[0].readStates.summary.status,'pending');assert.equal(f.logs.length,1);
});
test('retry attempts use independent IDs and only allowlisted error classifications are emitted',async()=>{
 const f=setup(),first=f.create(),error={code:'57014',message:'PRIVATE'};await assert.rejects(first.run(()=>first.track('summary',async()=>{throw error;})),e=>e===error);const second=f.create();await second.run(()=>settled(second));assert.notEqual(f.logs[0].operationId,f.logs[1].operationId);assert.equal(f.logs[0].errorCode,'57014');assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE/);
});
test('disabled observation and logging failure never change read results or errors',async()=>{
 const off=setup({enabled:false}),a=off.create();await a.run(()=>settled(a));assert.equal(off.logs.length,0);
 const f=setup({loggerThrows:true}),b=f.create(),value={ok:true};assert.equal(await b.run(async()=>value),value);const err={code:'503'};await assert.rejects(b.run(async()=>{throw err;}),e=>e===err);
});
test('malformed diagnostic metadata cannot replace the original rejection',async()=>{
 const f=setup(),d=f.create(),error=Object.defineProperty(new Error('PRIVATE'),'code',{get(){throw Error('metadata failed');}});
 await assert.rejects(d.run(async()=>{throw error;}),e=>e===error);assert.equal(f.logs.length,0);
});
