const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/minimum-estimate.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {estimateNonzeroMinimum:estimate,isRiceBowl}=context.exports;
test('nonzero floor follows lower-quartile movement, not historical receipts or orders',()=>{assert.equal(estimate([4,6,8,10,100]),6);assert.equal(estimate([0,0,0,0]),1);assert.equal(estimate([]),1);assert.equal(estimate([NaN,Infinity,-1,5]),5);});
test('rice bowls are identified separately from tray products',()=>{assert.equal(isRiceBowl('Mini White Sugar Rice Bowl Kuih'),true);assert.equal(isRiceBowl('Steamed White Sugar Sponge Kuih'),false);});
