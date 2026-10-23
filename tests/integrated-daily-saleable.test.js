const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('src/server/actions/outlet-daily-records.ts','utf8');
const exportsObject={};
const channels=require('./helpers/load-source.cjs')()('src/lib/outlet-sales-channels.ts');
vm.runInNewContext(ts.transpileModule(source+'\nexport { outletDailyLineSchema, changedDailyFields };',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,require:n=>n==='zod'?require(n):n==='@/lib/outlet-sales-channels'?channels:{}});
test('actual Daily schema retains zero, unknown and nonzero saleable counts and rejects invalid counts',()=>{
 const schema=exportsObject.outletDailyLineSchema.shape.saleable_next_day_qty;
 for(const v of [null,0,12.5])assert.equal(schema.parse(v),v);
 for(const v of [-1,1000001,Infinity])assert.throws(()=>schema.parse(v));
});
test('actual Daily audit detects saleable-only edits, including unknown to explicit zero',()=>{
 const changed=exportsObject.changedDailyFields;
 assert.deepEqual(Array.from(changed({saleable:null},{saleable:0})),['saleable']);
 assert.deepEqual(Array.from(changed({saleable:0},{saleable:0})),[]);
 assert.deepEqual(Array.from(changed({saleable:12},{saleable:4})),['saleable']);
 assert.ok(changed(null,{saleable:0}).includes('saleable'));
});
