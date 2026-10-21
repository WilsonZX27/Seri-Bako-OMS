const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require});
 return exports;
}
const {productSchema}=load('src/lib/validations/product.ts');
const {normalizeUom}=load('src/lib/uom.ts');
const source=fs.readFileSync('src/server/actions/products.ts','utf8');
const body=source.slice(source.indexOf('function payload('),source.indexOf('function packagingPayload('));
const payload=vm.runInNewContext(ts.transpileModule(body+'; payload',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{productSchema,normalizeUom});
function form(overrides={}) {
 const f=new FormData();
 for(const [k,v] of Object.entries({product_code:'SC01',product_name:'Sponge Kuih',category:'Steamed Cake',daily_tracking:'food_daily',is_seasonal:'false',available_from:'',available_until:'',display_order:'1',selling_unit:'pcs',status:'active',...overrides})) f.set(k,v);
 return f;
}
test('actual product action accepts year-round form fields and empty dates',()=>{
 const p=payload(form());
 assert.equal(p.is_seasonal,false);
 assert.equal(p.available_from,null);
 assert.equal(p.available_until,null);
 assert.equal(p.selling_unit,'PCS');
});
test('actual product action accepts seasonal dates and preserves classification',()=>{
 const p=payload(form({is_seasonal:'true',available_from:'2026-10-01',available_until:'2026-10-31',daily_tracking:'food_carryover'}));
 assert.equal(p.is_seasonal,true);
 assert.equal(p.available_from,'2026-10-01');
 assert.equal(p.available_until,'2026-10-31');
 assert.equal(p.daily_tracking,'food_carryover');
});
test('invalid season dates and availability values remain rejected',()=>{
 assert.throws(()=>payload(form({available_from:'2026-11-01',available_until:'2026-10-01'})),/Available until/);
 assert.throws(()=>payload(form({is_seasonal:'invalid'})));
});
