const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/stock-count-form.tsx'), 'utf8');
const ast = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = [];
function visit(node) {
  if (ts.isCallExpression(node) && ['useEffect', 'useCallback'].includes(node.expression.getText(ast))) callbacks.push(node.arguments[0].getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = code => ts.transpileModule(code, { compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS} }).outputText;
function harness({storage = {}, action = async () => ({ok:true,id:'synthetic-draft'}), values = ['7']} = {}) {
  const state = {}, timers = [], routes = [], payloads = [];
  const context = {exports:{}, window:{localStorage:storage,setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){}},
    STOCK_COUNT_SORT_KEY:'sort', localStorageKey:'draft', sortPreferenceReady:{current:false},
    resolvedBranchId:'branch', countDate:'2026-10-13',countRemarks:'note',
    seedLines:[{item_id:'item',physical_qty:1}],resolvedBranchId:'branch',draftId:undefined,lines:[{item_id:'item',physicalQty:'7',initialPhysicalQty:'1',remarks:''}],
    makeEditableLine:line=>({...line,physicalQty:String(line.physical_qty),initialPhysicalQty:String(line.physical_qty)}),
    hasUserEdited:{current:true},dirtyRevision:1,dirtyRevisionRef:{current:1},createdDraftId:{current:null},lastSavedRevision:{current:0},retryRevision:{current:0},retryAttempts:{current:0},retryTimer:{current:null},saveSequence:{current:0},
    formRef:{current:{elements:[],querySelectorAll:()=>[]}},draftId:undefined,manualSavePending:{current:false},saveInFlight:{current:null},saveDraftRef:{current:null},activeBranchId:{current:'branch'},MAX_AUTOSAVE_RETRIES:3,AUTOSAVE_DEBOUNCE_MS:12000,
    FormData:class {constructor(){this.entries=[];} getAll(name){return name==='line_physical_qty'?values:[];} append(...args){this.entries.push(args);}},autosaveAction:async data=>{payloads.push(data);return action(data);},router:{replace:url=>routes.push(url)},
  };
  for(const key of ['SortBy','LocalBackupAvailable','Lines','CountDate','CountRemarks','AutosaveState','AutosaveError','AutosaveRetryable','DirtyRevision']) context[`set${key}`]=value=>{state[key]=typeof value==='function'?value(state[key]??0):value;};
  vm.createContext(context);
  vm.runInContext(compile(fs.readFileSync(path.join(root,'src/lib/stock-count-storage.ts'),'utf8')), context);
  context.tryStockCountStorage=context.exports.tryStockCountStorage;
  const callback = marker => {
  const code=callbacks.find(code=>code.includes(marker));
    assert.ok(code,marker);
    return vm.runInContext(compile(`(${code})`),context);
  };
  context.saveDraft=callback('if (manualSavePending.current) return false');
  context.saveDraftRef.current=context.saveDraft;
  return {context,state,timers,routes,payloads,callback};
}
const fail = name => () => {throw new DOMException('synthetic failure',name);};
for (const error of ['SecurityError','QuotaExceededError']) {
 test(`${error}: failed backup preserves quantities and still schedules server save`, async()=>{
  const h=harness({storage:{setItem:fail(error),removeItem:fail(error)}});
  h.callback('const timer = window.setTimeout(() => void saveDraft')();
  h.context.formRef.current={elements:[],querySelectorAll:()=>[]};
  assert.equal(h.state.LocalBackupAvailable,false);
  assert.equal(h.context.lines[0].physicalQty,'7');
  assert.equal(h.timers.length,1);
  h.timers.shift()(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.payloads.length,1);
  assert.equal(h.state.AutosaveState,'saved');
  assert.equal(h.routes.length,1);
  assert.equal(h.timers.length,0,'cleanup failure must not retry a successful write');
 });
 test(`${error}: failed read and sort storage cannot crash or replace memory`,()=>{
  const h=harness({storage:{getItem:fail(error),setItem:fail(error),removeItem:fail(error)}});
  h.callback('const storedSort')();
  h.callback('if (!sortPreferenceReady.current)')();
  h.callback('const stored =')();
  assert.equal(h.state.LocalBackupAvailable,false);
  assert.equal(h.state.Lines,undefined);
  assert.equal(h.context.lines[0].physicalQty,'7');
 });
}
test('blocked localStorage getter is protected',()=>{
 const h=harness(); Object.defineProperty(h.context.window,'localStorage',{get:fail('SecurityError')});
 h.callback('const storedSort')();h.callback('const stored =')();h.callback('const snapshot: LocalDraftSnapshot')();
 assert.equal(h.state.LocalBackupAvailable,false);assert.equal(h.timers.length,1);
});
test('server retry survives unavailable device storage and preserves retry bounds',async()=>{
 let attempts=0;const h=harness({storage:{setItem:fail('QuotaExceededError'),removeItem:fail('SecurityError')},action:async()=>{attempts++;return attempts===1?{ok:false,retryable:true,error:'offline'}:{ok:true,id:'synthetic-draft'};}});
 assert.equal(await h.context.saveDraft(1),false);assert.equal(h.timers.length,1);
 h.timers.shift()();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(attempts,2);assert.equal(h.state.AutosaveState,'saved');assert.equal(h.routes.length,1);assert.equal(h.timers.length,0);
});
test('permanent action failure is not retried; missing quantities never save',async()=>{
 const h=harness({action:async()=>({ok:false,retryable:false,error:'validation'})});
 assert.equal(await h.context.saveDraft(1),false);assert.equal(h.timers.length,0);
 const incomplete=harness({values:['']});await incomplete.context.saveDraft(1);assert.equal(incomplete.payloads.length,0);
});
test('malformed recovery and failed removal do not crash or overwrite memory',()=>{
 const h=harness({storage:{getItem:()=>'{bad json',removeItem:fail('SecurityError')}});
 h.callback('const stored =')();assert.equal(h.state.Lines,undefined);assert.equal(h.context.lines[0].physicalQty,'7');
});
test('valid recovery retains explicit edits and uses new baseline for unchanged prefill',()=>{
  for(const [saved,expected] of [['7','7'],['1','4']]){
 const snapshot={version:2,branchId:'branch',countDate:'2026-10-12',remarks:'recovered',lines:[{itemId:'item',physicalQty:saved,initialPhysicalQty:'1',remarks:'counted'}]};
 const h=harness({storage:{getItem:()=>JSON.stringify(snapshot)}});h.context.seedLines[0].physical_qty=4;
 h.callback('const stored =')();assert.equal(h.state.Lines[0].physicalQty,expected);assert.equal(h.state.AutosaveState,'recovered');assert.equal(h.state.DirtyRevision,2);
 }
});
test('failed backup notice clears when storage becomes writable again',()=>{
 const h=harness({storage:{setItem:fail('QuotaExceededError')}});const persist=h.callback('const snapshot: LocalDraftSnapshot');persist();assert.equal(h.state.LocalBackupAvailable,false);
 h.context.window.localStorage.setItem=()=>{};persist();assert.equal(h.state.LocalBackupAvailable,true);
});
test('rejected server promises stop after the configured retry budget',async()=>{
 const h=harness({action:async()=>{throw new Error('offline');}});
 await h.context.saveDraft(1);
 while(h.timers.length){h.timers.shift()();await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(h.payloads.length,4);assert.equal(h.state.AutosaveRetryable,false);assert.match(h.state.AutosaveError,/Keep this page open/);
});
test('online and hidden-page events still flush through the same safe server save',async()=>{
 const h=harness({storage:{removeItem:fail('SecurityError')}}),events={};
 h.context.document={visibilityState:'hidden',addEventListener:(name,fn)=>events[name]=fn,removeEventListener(){}};
 h.context.window.addEventListener=(name,fn)=>events[name]=fn;h.context.window.removeEventListener=()=>{};
 h.callback('const flushWhenHidden')();events.online();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.payloads.length,1);events.visibilitychange();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.payloads.length,1,'already-saved revision must not be written again');
});
