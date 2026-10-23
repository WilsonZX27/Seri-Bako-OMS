const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{},require:()=>({isRiceBowl:name=>/^Mini .+ Rice Bowl Kuih$/i.test(name)})};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/production-planning/tray-yields.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {suppliedTrayYield:yieldFor}=context.exports;
test('regional Hawthorn yields remain distinct',()=>{assert.equal(yieldFor('Steamed Hawthorn Kuih','penang'),32);assert.equal(yieldFor('Hawthorn','kl'),28);});
test('known yields use supplied units while missing values and baked items stay unset',()=>{assert.equal(yieldFor('Yam Kuih','penang'),16);assert.equal(yieldFor('Chrysanthemum Kuih','kl'),32);assert.equal(yieldFor('Chrysanthemum Kuih','penang'),32);assert.equal(yieldFor('Mini White Sugar Rice Bowl Kuih','kl'),1);assert.equal(yieldFor('Baked Pandan Cake','penang'),null);});

test('production catalogue guard rejects similar non-steamed product codes',()=>{assert.equal(context.exports.suppliedPlanningYield({product_code:'MC01',product_name:'Yam Kuih'},'penang'),null);assert.equal(context.exports.suppliedPlanningYield({product_code:'SC01',product_name:'Yam Kuih'},'penang'),16);});
