const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = require('./helpers/load-source.cjs')({setTimeout,clearTimeout,AbortController,Error,TypeError});
function harness(fetch) {
  const values = [], refs = [], effects = [], changes = [], exports = {}; let reloads = 0;
  let stateIndex = 0, refIndex = 0, effectIndex = 0, queuedEffects = [], form;
  const jsx = (type, props) => ({type, props});
  const location = {pathname:'/attendance/settings',reload() {reloads++;}};
  const source = fs.readFileSync('src/components/attendance/template-admin.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, {
    exports, Error, TypeError, fetch: (...args) => Promise.resolve(fetch(...args)).then(response => ({headers:{get:()=>'application/json'},status:200,redirected:false,url:'/api/attendance/schedule',...response})), window: {location},
    FormData: class {get(key) {return ({start:'09:00',end:'18:00',checkInStart:'scheduled',checkOutEnd:'scheduled'})[key] ?? ''; }},
    require(name) {
      if (name === '@/lib/http/request-deadline') return {requestDeadline:(operation,_ms,message)=>load('src/lib/http/request-deadline.ts').requestDeadline(operation,20,message)};
      if (name === '@/lib/http/read-json-response') return load('src/lib/http/read-json-response.ts');
      if (name === 'react') return {
        useRef(initial) {const index=refIndex++;return refs[index] ??= {current:initial};},
        useState(initial) {const index=stateIndex++;if (!(index in values)) values[index]=initial;return [values[index],value=>{changes.push({index,value});values[index]=value;}];},
        useLayoutEffect(fn,deps) {const index=effectIndex++;if (!effects[index] || deps.some((value,i)=>!Object.is(value,effects[index].deps[i]))) queuedEffects.push(()=>{effects[index]?.cleanup?.();effects[index]={deps:[...deps],cleanup:fn()};});},
      };
      if (name === 'react/jsx-runtime') return {jsx,jsxs:jsx};
      return new Proxy({}, {get: (_, key) => key === 'attendanceTimeOptions' ? () => [] : key});
    },
  });
  function render(branchId) {
    stateIndex=0;refIndex=0;effectIndex=0;queuedEffects=[];
    form=exports.TemplateAdmin({branchId}).props.children;
    queuedEffects.forEach(run=>run());
  }
  function unmount() {effects.forEach(effect=>effect.cleanup?.());}
  render('synthetic-branch');
  return {values,changes,get reloads() {return reloads;},switchBranch:render,unmount,navigate(path) {location.pathname=path;unmount();},submit() {form.props.onSubmit({preventDefault(){},currentTarget:{}});}};
}
const settle = () => new Promise(resolve=>setImmediate(resolve));
test('shift save blocks repeated submit while pending and releases after response', async()=>{
  let resolve, calls=0;
  const h=harness(()=>{calls++;return new Promise(r=>{resolve=r;});});
  h.submit();h.submit();assert.equal(calls,1);assert.equal(h.values[1],true);
  resolve({ok:true,json:async()=>({ok:true})});await settle();
  assert.equal(h.reloads,1);assert.equal(h.values[1],false);
});
test('shift network error explains uncertainty, retains inputs and never retries automatically',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw new TypeError('synthetic disconnected');});
  h.submit();await settle();assert.equal(calls,1);assert.match(h.values[0],/could not be confirmed.*inputs are retained.*Check the shift list/);assert.equal(h.values[1],false);assert.equal(h.reloads,0);
});
test('non-JSON response remains recoverable and HTTP errors cannot claim success',async()=>{
  const malformed=harness(async()=>({ok:false,json:async()=>{throw Error('synthetic html');}}));malformed.submit();await settle();assert.match(malformed.values[0],/could not be confirmed/);assert.equal(malformed.values[1],false);
  const denied=harness(async()=>({ok:false,json:async()=>({ok:true})}));denied.submit();await settle();assert.equal(denied.reloads,0);assert.equal(denied.values[0],'Shift could not be saved.');
});
test('shift server validation stays visible without reload',async()=>{
  const h=harness(async()=>({ok:false,json:async()=>({ok:false,message:'Synthetic validation message'})}));h.submit();await settle();assert.equal(h.values[0],'Synthetic validation message');assert.equal(h.reloads,0);
});

test('stalled shift save releases pending as unconfirmed without another request',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});h.submit();await new Promise(r=>setTimeout(r,30));assert.equal(calls,1);assert.equal(h.values[1],false);assert.equal(h.reloads,0);assert.match(h.values[0],/server may have saved the shift/);
});

test('late successful shift response after navigation cannot refresh the new route or update state',async()=>{
 let resolve,calls=0;const h=harness(()=>{calls++;return new Promise(r=>{resolve=r;});});h.submit();h.navigate('/purchase-requests/new');const count=h.changes.length;resolve({ok:true,json:async()=>({ok:true})});await settle();assert.equal(h.reloads,0);assert.equal(h.changes.length,count);assert.equal(calls,1);
});
test('late failure after unmount leaves the current UI untouched',async()=>{
 let reject;const h=harness(()=>new Promise((_r,j)=>{reject=j;}));h.submit();h.unmount();const count=h.changes.length;reject(new TypeError('synthetic late network failure'));await settle();assert.equal(h.changes.length,count);assert.equal(h.reloads,0);
});
test('timeout after unmount is not replayed and does not set feedback or pending state',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});h.submit();h.unmount();const count=h.changes.length;await new Promise(r=>setTimeout(r,30));assert.equal(h.changes.length,count);assert.equal(h.reloads,0);assert.equal(calls,1);
});
test('branch switch invalidates old success and old finally cannot release a newer pending request',async()=>{
 const responses=[],branches=[];const h=harness((_url,init)=>{branches.push(JSON.parse(init.body).branchIds);return new Promise(r=>responses.push(r));});h.submit();h.switchBranch('synthetic-branchB');assert.equal(h.values[1],false);h.submit();const count=h.changes.length;responses[0]({ok:true,json:async()=>({ok:true})});await settle();assert.equal(h.reloads,0);assert.equal(h.changes.length,count);assert.equal(h.values[1],true);responses[1]({ok:true,json:async()=>({ok:true})});await settle();assert.equal(h.reloads,1);assert.equal(h.values[1],false);assert.deepEqual(branches,[['synthetic-branch'],['synthetic-branchB']]);
});
test('branch switch ignores late server validation and preserves the new branch feedback',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));h.submit();h.switchBranch('synthetic-branchB');const count=h.changes.length;resolve({ok:false,json:async()=>({ok:false,message:'Synthetic old branch validation'})});await settle();assert.equal(h.changes.length,count);assert.equal(h.values[0],'');assert.equal(h.reloads,0);
});
test('branch switch ignores old timeout without issuing another mutation',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});h.submit();h.switchBranch('synthetic-branchB');const count=h.changes.length;await new Promise(r=>setTimeout(r,30));assert.equal(h.changes.length,count);assert.equal(h.values[1],false);assert.equal(h.reloads,0);assert.equal(calls,1);
});
