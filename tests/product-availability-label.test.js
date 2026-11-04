const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const moduleContext={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/availability.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,moduleContext);
const {productAvailabilityLabel:label,productAvailableOn:available}=moduleContext.exports;
test('MC07-shaped nonseasonal product exposes the saved end date and retains inclusive eligibility',()=>{
 const product={is_seasonal:false,available_from:null,available_until:'2026-10-01'};
 assert.equal(label(product),'Until 2026-10-01');assert.equal(available(product,'2026-10-01'),true);assert.equal(available(product,'2026-10-02'),false);
 assert.equal(product.is_seasonal,false);assert.equal(product.available_until,'2026-10-01');
});
test('both seasonal flags display start-only and bounded periods without hiding either boundary',()=>{
 for(const is_seasonal of [true,false]){
  assert.equal(label({is_seasonal,available_from:'2026-09-01'}),'From 2026-09-01');
  assert.equal(label({is_seasonal,available_from:'2026-09-01',available_until:'2026-10-01'}),'2026-09-01 – 2026-10-01');
 }
});
test('unbounded products distinguish descriptive seasonality from a configured supply period',()=>{
 assert.equal(label({is_seasonal:false}),'Year-round');assert.equal(label({is_seasonal:true}),'Seasonal · dates not set');
 assert.equal(available({is_seasonal:true},'2026-11-11'),true);
});
