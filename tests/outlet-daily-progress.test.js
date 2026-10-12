const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const compile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const model={exports:{}};vm.runInNewContext(compile(fs.readFileSync('src/lib/outlet-daily-progress.ts','utf8')),model);
const fixtures=[{id:'draft',status:'draft',qty_sent_state:'confirmed',received_pending_lines:0},{id:'morning',status:'morning_recorded'},{id:'ready',status:'evening_completed'},{id:'posted',status:'reviewed',sales_review_status:'confirmed'},{id:'legacy',status:'reviewed',sales_review_status:null},{id:'attention',status:'reviewed',sales_review_status:'needs_review'},{id:'void',status:'void'}];
test('workflow badges require completion before ready and retain posted exceptions',()=>{
 assert.deepEqual(fixtures.map(r=>model.exports.outletProgress(r).status),['in_progress','in_progress','ready_to_post','posted','posted','attention','void']);
});
const source=fs.readFileSync('src/server/queries/outlet-daily-records.ts','utf8');const ast=ts.createSourceFile('query.ts',source,ts.ScriptTarget.Latest,true);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='loadRows');
for(const status of ['in_progress','ready_to_post','posted','attention','void'])test(`database filter ${status} matches badge semantics before bounded pagination`,async()=>{
 let data=fixtures;const calls=[];const query={select(){return this;},eq(k,v){calls.push(['eq',k,v]);data=data.filter(r=>r[k]===v);return this;},in(k,v){calls.push(['in',k,v]);data=data.filter(r=>v.includes(r[k]));return this;},or(expr){assert.equal(expr,'sales_review_status.is.null,sales_review_status.neq.needs_review');calls.push(['or']);data=data.filter(r=>r.sales_review_status==null||r.sales_review_status!=='needs_review');return this;},order(){return this;},range(start,end){calls.push(['range',start,end]);return Promise.resolve({data:data.slice(start,end+1),count:data.length,error:null});}};
 const context={createClient:async()=>({from:()=>query}),hydrateRows:async(_db,rows)=>rows};vm.runInNewContext(compile(fn.getText(ast)),context);const result=await context.loadRows({status});
 assert.deepEqual(Array.from(result.rows,r=>r.id),fixtures.filter(r=>model.exports.outletProgress(r).status===status).map(r=>r.id));assert.equal(result.totalRows,result.rows.length);assert.deepEqual(calls.at(-1),['range',0,14]);
});
