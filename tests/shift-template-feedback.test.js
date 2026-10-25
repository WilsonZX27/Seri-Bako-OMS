const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = require('./helpers/load-source.cjs')({setTimeout,clearTimeout,AbortController,Error,TypeError});
function harness(fetch) {
  const values = [], exports = {}; let reloads = 0;
  const jsx = (type, props) => ({type, props});
  const source = fs.readFileSync('src/components/attendance/template-admin.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, {
    exports, Error, TypeError, fetch: (...args) => Promise.resolve(fetch(...args)).then(response => ({headers:{get:()=>'application/json'},status:200,redirected:false,url:'/api/attendance/schedule',...response})), window: {location: {reload() {reloads++;}}},
    FormData: class {get(key) {return ({start:'09:00',end:'18:00',checkInStart:'scheduled',checkOutEnd:'scheduled'})[key] ?? ''; }},
    require(name) {
      if (name === '@/lib/http/request-deadline') return {requestDeadline:(operation,_ms,message)=>load('src/lib/http/request-deadline.ts').requestDeadline(operation,20,message)};
      if (name === '@/lib/http/read-json-response') return load('src/lib/http/read-json-response.ts');
      if (name === 'react') return {useRef: value => ({current:value}), useState: initial => {const index=values.push(initial)-1;return [initial,value=>{values[index]=value;}];}};
      if (name === 'react/jsx-runtime') return {jsx,jsxs:jsx};
      return new Proxy({}, {get: (_, key) => key === 'attendanceTimeOptions' ? () => [] : key});
    },
  });
  const form = exports.TemplateAdmin({branchId:'synthetic-branch'}).props.children;
  return {values, get reloads() {return reloads;}, submit() {form.props.onSubmit({preventDefault(){},currentTarget:{}});}};
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
