const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function harness() {
 const effects=[],listeners=new Map(),states=[];let insidePendingForm=false;
 class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
 const document={addEventListener(type,fn){const list=listeners.get(type)??[];list.push(fn);listeners.set(type,list);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)??[]).filter(x=>x!==fn));},dispatchEvent(event){for(const fn of listeners.get(event.type)??[])fn(event);}};
 const mocks={'@/lib/form-pending-recovery':require('./helpers/load-source.cjs')()('src/lib/form-pending-recovery.ts'),'react':{useEffect:fn=>effects.push(fn),useState:initial=>[initial,value=>states.push(value)],useRef:value=>({current:value})},'react-dom':{useFormStatus:()=>({pending:insidePendingForm})},'react/jsx-runtime':require('react/jsx-runtime'),'next/navigation':{usePathname:()=>'/fixture',useSearchParams:()=>new URLSearchParams()},'lucide-react':{LoaderCircle:()=>null},'@/components/ui/button':{Button:()=>null}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/submit-button.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,document,window:new EventTarget(),CustomEvent,require:name=>{assert.ok(name in mocks,`unexpected import ${name}`);return mocks[name];}});
 exports.SubmitButton({form:'target-form',children:'Save'});const buttonCleanups=effects.splice(0).map(fn=>fn());states.length=0;
 return {states,bridge(formId,pending){insidePendingForm=pending;exports.FormPendingBridge({formId});return effects.pop()();},dispose(){buttonCleanups.forEach(fn=>fn?.());}};
}
test('external pending button releases when its active form bridge unmounts',()=>{
 const h=harness();const unmount=h.bridge('target-form',true);
 assert.deepEqual(h.states,[true]);assert.equal(typeof unmount,'function');unmount();
 assert.deepEqual(h.states,[true,false]);h.dispose();
});
test('one form unmount cannot release another form, and completed bridge never claims a save succeeded',()=>{
 const h=harness();const other=h.bridge('other-form',true);assert.deepEqual(h.states,[]);other?.();assert.deepEqual(h.states,[]);
 const target=h.bridge('target-form',true);assert.deepEqual(h.states,[true]);target?.();assert.deepEqual(h.states,[true,false]);
 const idle=h.bridge('target-form',false);idle?.();assert.deepEqual(h.states,[true,false]);h.dispose();
});
