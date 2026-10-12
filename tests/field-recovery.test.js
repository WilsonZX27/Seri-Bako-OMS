const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function harness(reduce=false,date=false){
 const attrs=new Map([['aria-describedby','existing-help']]);const surface={dataset:{},after(el){this.instruction=el;}};const target={dataset:{},getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),closest:()=>date?surface:null,after:surface.after,focus(opts){this.focusOptions=opts;},scrollIntoView(opts){this.scrollOptions=opts;}};
 const context={exports:{},crypto:{randomUUID:()=> 'test-id'},window:{matchMedia:()=>({matches:reduce})},document:{createElement:()=>({dataset:{},setAttribute(){},remove(){this.removed=true;}})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/field-recovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {target,surface,attrs,recover:context.exports.recoverField};
}
test('recovery provides literal accessible instruction, focused field and restores previous help',()=>{
 const h=harness();const undo=h.recover(h.target,'Use <5 units & retry.');assert.equal(h.target.instruction.textContent,'Use <5 units & retry.');assert.equal(h.attrs.get('aria-invalid'),'true');assert.equal(h.attrs.get('aria-describedby'),'existing-help field-recovery-test-id');assert.equal(h.target.scrollOptions.block,'center');assert.equal(h.target.scrollOptions.behavior,'smooth');assert.equal(h.target.focusOptions.preventScroll,true);undo();assert.equal(h.attrs.get('aria-describedby'),'existing-help');assert.equal(h.attrs.has('aria-invalid'),false);assert.equal(h.target.instruction.removed,true);
});
test('date recovery styles its visible surface and reduced motion disables smooth scrolling',()=>{const h=harness(true,true);const undo=h.recover(h.target,'Choose a date.');assert.equal(h.surface.dataset.fieldRecovery,'true');assert.equal(h.surface.instruction.textContent,'Choose a date.');assert.equal(h.target.scrollOptions.behavior,'auto');undo();assert.equal(h.surface.dataset.fieldRecovery,undefined);});
