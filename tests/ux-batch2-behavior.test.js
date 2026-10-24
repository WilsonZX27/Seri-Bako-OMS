const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const load=require('./helpers/load-source.cjs')({Error,TypeError,process:{env:{}},crypto:require('node:crypto').webcrypto});
function harness(fetchImpl,promptImpl=()=> 'retained reason'){
 const slots=[];let index=0;
 const react={useRef:v=>{const n=index++;return slots[n]??(slots[n]={current:v})},useState:v=>{const n=index++;if(!(n in slots))slots[n]=v;return [slots[n],v=>{slots[n]=v}]}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/attendance/shift-request-button.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,TypeError,fetch:fetchImpl,window:{prompt:promptImpl},require:n=>n==='react'?react:n.includes('ui/button')?{Button:'button'}:n.includes('read-json-response')?load('src/lib/http/read-json-response.ts'):require(n)});
 return {render(){index=0;return exports.ShiftRequestButton({assignmentId:'synthetic'}).props.children},flush:()=>new Promise(r=>setImmediate(r))};
}
test('shift request retains reason after invalid response and restores retry',async()=>{
 let defaults=[];let count=0;
 const h=harness(async()=>++count===1?new Response('bad',{status:503,headers:{'content-type':'text/html'}}):Response.json({ok:true}),(_,value)=>{defaults.push(value);return 'retained reason'});
 h.render()[0].props.onClick();await h.flush();
 let [button,feedback]=h.render();assert.equal(button.props.disabled,false);assert.equal(feedback.props.role,'alert');assert.match(feedback.props.children,/could not be confirmed/);
 button.props.onClick();await h.flush();assert.equal(h.render()[1].props.role,'status');assert.deepEqual(defaults,['','retained reason']);
});
test('shift request locks synchronously, shows pending and sends only one request',async()=>{
 let resolve,count=0;const h=harness(()=>{count++;return new Promise(r=>resolve=r)});
 const click=h.render()[0].props.onClick;click();click();assert.equal(count,1);assert.equal(h.render()[0].props.disabled,true);assert.equal(h.render()[0].props.children,'Sending…');
 resolve(Response.json({ok:true}));await h.flush();assert.equal(h.render()[0].props.disabled,false);
});
test('shift request cancellation does not send or clear existing feedback',()=>{
 let count=0;const h=harness(()=>count++,()=>null);h.render()[0].props.onClick();assert.equal(count,0);assert.equal(h.render()[1],null);
});
test('shift request handles network rejection, HTTP errors and malformed JSON',async()=>{
 for(const fetchImpl of [async()=>{throw new TypeError('fetch failed')},async()=>Response.json({ok:true},{status:503}),async()=>new Response('{',{headers:{'content-type':'application/json'}})]){
 const h=harness(fetchImpl);h.render()[0].props.onClick();await h.flush();assert.equal(h.render()[0].props.disabled,false);assert.equal(h.render()[1].props.role,'alert');assert.match(h.render()[1].props.children,/retrying/);
 }
});
test('transfer receive labels agree with received/sent values and preserve remaining limit',()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {StockTransferReceiveForm}=load('src/components/stock-operation-forms.tsx');
 const markup=renderToStaticMarkup(React.createElement(require('next/dist/shared/lib/hooks-client-context.shared-runtime').SearchParamsContext.Provider,{value:new URLSearchParams()},React.createElement(StockTransferReceiveForm,{transferId:'synthetic',lines:[{id:'l',item_id:'i',item_name:'Flour',quantity:10,received_quantity:2,uom:'KG'}],action:async()=>{}})));
 assert.match(markup,/Received \/ sent/);assert.match(markup,/2 \/ 10 KG/);assert.match(markup,/max="8"/);
});
