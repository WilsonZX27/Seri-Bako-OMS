const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file, custom = {}) {
 const m = new Module(file, module); m.paths = module.paths;
 m.require = (name) => custom[name] ?? require(name);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return m.exports;
}
const kg = load('src/lib/stock-count-kg.ts');
const schema = load('src/lib/validations/stock-count.ts',{'@/lib/stock-count-kg':kg});
const blank = {units_per_purchase:'',kg_per_unit:'',package_description:'',evidence:''};
test('unknown packaging saves as null, never becomes a 1:1 conversion',()=>{
 assert.equal(kg.stockCountWeightSetupSchema.parse(blank).kg_per_unit,null);
 assert.equal(kg.packagingKg('',''),null);
});
test('explicit sealed package quantity and net weight calculate package KG independently of stock',()=>{
 assert.equal(kg.packagingKg(4,2.5),10);
 assert.equal(kg.packagingKg(24,0.25),6);
});
test('ratio requires both positive values, whole packs and an evidence source',()=>{
 for(const patch of [{kg_per_unit:1},{units_per_purchase:2},{units_per_purchase:0,kg_per_unit:1},{units_per_purchase:1.5,kg_per_unit:2},{units_per_purchase:1,kg_per_unit:2},{units_per_purchase:1,kg_per_unit:Infinity}]) assert.equal(kg.stockCountWeightSetupSchema.safeParse({...blank,...patch}).success,false);
 assert.equal(kg.stockCountWeightSetupSchema.safeParse({...blank,units_per_purchase:4,kg_per_unit:2.5,package_description:'Sealed pack',evidence:'Printed net weight'}).success,true);
});
test('KG draft keeps fractional weights while ordinary cartons still require integers',()=>{
 const base={count_date:'2026-10-16',branch_id:'92000000-0000-4000-8000-000000000001',lines:[{item_id:'97000000-0000-4000-8000-000000000001',theoretical_qty:5,physical_qty:5.125,uom:'KG',weight_setup:blank}]};
 assert.equal(schema.stockCountSchema.parse(base).lines[0].physical_qty,5.125);
 assert.equal(schema.stockCountSchema.safeParse({...base,lines:[{...base.lines[0],uom:'CTN',weight_setup:null}]}).success,false);
 assert.equal(schema.stockCountSchema.safeParse({...base,lines:[{...base.lines[0],physical_qty:5.12345}]}).success,false);
});

test('verified posting confirmation identifies excluded items and never claims complete posting',()=>{
 const prompt=kg.weightPostingConfirmation(12,['BWYHOLDI00026','BWYHOLDI00022']);
 assert.equal(prompt.label,'Post 12 verified items');
 assert.match(prompt.description,/BWYHOLDI00026, BWYHOLDI00022/);
 assert.match(prompt.description,/2 pending weight reviews/);
 assert.match(prompt.description,/inventory will not change/);
 assert.match(prompt.description,/not a complete posting/);
});

test('KG creation retains current-count added items and extra-line previews load KG configuration',()=>{
 const sql=fs.readFileSync('sql-candidates/stock-count-kg-measurement-drafts.sql','utf8');
 assert.match(sql,/result:=public.create_stock_count_with_added_items_atomic/);
 const preview=fs.readFileSync('src/server/actions/stock-count-item-preview.ts','utf8');
 assert.match(preview,/kg_setup:\(await getStockCountKgSetups\(\)\)\.get\(item.id\)/);
});
