const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/attendance/person-matching.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {matchPunchPerson:match}=context.exports;
const staff={id:'a',staff_code:'068',full_name:'HASILAH'};
test('same numeric ID and significant name accept shortened name and terminal H spelling',()=>{assert.equal(match('68','NOR HASILA',[staff])?.id,'a');});
test('duplicate IDs, conflicting names, and partial-name-only evidence require review',()=>{assert.equal(match('68','NOR HASILA',[staff,{...staff,id:'b'}]),null);assert.equal(match('68','NOR AMINA',[staff]),null);assert.equal(match('69','NOR HASILA',[staff]),null);});
test('exact unique names remain compatible with existing importer; duplicates are unresolved',()=>{assert.equal(match('99','HASILAH',[staff])?.id,'a');assert.equal(match('99','HASILAH',[staff,{...staff,id:'b'}]),null);});
test('generic short tokens cannot match unrelated names',()=>{assert.equal(match('68','NOR AMINA',[{...staff,full_name:'NOR HASILAH'}]),null);});
