const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name in mocks ? mocks[name] : name === 'zod' || name === 'react/jsx-runtime' ? require(name) : {},FormData,Error,URLSearchParams,...mocks.__globals});
  return exports;
}
test('outlet schema rejection returns feedback without navigation or writes', async () => {
  let redirects=0, writes=0;
  const {saveOutletDailyRecord}=load('src/server/actions/outlet-daily-records.ts',{
    '@/server/actions/error-handling':{safeRedirectWithMessage(){redirects++; throw Error('redirect')},formatActionError:e=>e.message},
    '@/lib/supabase/server':{createClient(){writes++;throw Error('database')}}
  });
  const result=await saveOutletDailyRecord(new FormData());
  assert.match(result.error,/Branch/); assert.equal(redirects,0);assert.equal(writes,0);
});
test('outlet RPC business rejection retains an in-place retry result', async () => {
  let redirects=0, calls=0;
  const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:{status:'draft',notes:'old'},error:null}),then(resolve){resolve({data:[],error:null})}};
  const {saveOutletDailyRecord}=load('src/server/actions/outlet-daily-records.ts',{
    '@/server/auth/permissions':{hasPermission:async()=>true},
    '@/server/actions/error-handling':{safeRedirectWithMessage(){redirects++;throw Error('redirect')},rethrowRedirect(){},formatActionError:e=>e.message},
    '@/lib/supabase/server':{createClient:async()=>({from:()=>query,rpc:async()=>{calls++;return {error:{message:'Received must be independently confirmed, including zero.'}}}})}
  });
  const data=new FormData();
  for (const [k,v] of Object.entries({record_id:'e2000000-0000-4000-8000-000000000005',branch_id:'e2000000-0000-4000-8000-000000000001',record_date:'2026-10-10',notes:'unsaved header',line_product_id:'e2000000-0000-4000-8000-000000000002',morning_received_qty:'',wastage_qty:'0',line_notes:'unsaved line'}))data.append(k,v);
  const result=await saveOutletDailyRecord(data);
  assert.match(result.error,/independently confirmed/);assert.equal(calls,1);assert.equal(redirects,0);assert.equal(data.get('notes'),'unsaved header');
});
test('outlet action reducer returns each failed attempt without redirect or remount', async () => {
  let reducer; const {OutletDailyRecordForm}=load('src/components/outlet-daily-record-form.tsx',{
    react:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useMemo:fn=>fn(),useEffect(){},useActionState:fn=>{reducer=fn;return [null,()=>{}]}}
  });
  const data=new FormData();data.append('notes','header');data.append('line_notes','a');data.append('line_notes','b');
  let received; OutletDailyRecordForm({formId:'test',branches:[],products:[],recordDate:'2026-10-10',action:async d=>{received=d;return {error:'business rejection'}}});
  const result=await reducer(null,data);assert.equal(result.error,'business rejection');assert.deepEqual(Array.from(result.values, pair=>Array.from(pair)),Array.from(data.entries()));assert.equal(received,data);assert.deepEqual(data.getAll('line_notes'),['a','b']);
});

test('failed action restores branch and repeated select values after the native reset', () => {
  const effects=[],frames=[];
  const selects=[{name:'branch_id',value:''},{name:'wastage_reason',value:'unsold'},{name:'wastage_reason',value:'unsold'}];
  const result={error:'business rejection',values:[['branch_id','selected-branch'],['wastage_reason','damaged'],['wastage_reason','other']]};
  const {OutletDailyRecordForm}=load('src/components/outlet-daily-record-form.tsx',{
    react:{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),useActionState:()=>[result,()=>{}]},
    __globals:{document:{dispatchEvent(){},getElementById:()=>({querySelectorAll:()=>selects})},CustomEvent:class{},requestAnimationFrame:fn=>{frames.push(fn);return 1},cancelAnimationFrame(){}}
  });
  OutletDailyRecordForm({formId:'test',branches:[],products:[],recordDate:'2026-10-11',action:async()=>result});
  effects[0]();assert.equal(selects[0].value,'');frames[0]();
  assert.deepEqual(selects.map(x=>x.value),['selected-branch','damaged','other']);
});
