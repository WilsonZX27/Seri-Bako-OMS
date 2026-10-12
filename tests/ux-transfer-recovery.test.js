const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file, requireFn, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText, {exports,require:requireFn,URLSearchParams,Array,Set,...globals});
  return exports;
}
test('transfer validation returns feedback without redirecting away from entered draft', async () => {
  let redirected = false, databaseOpened = false;
  const {createStockTransfer} = compile('src/server/actions/stock-operations.ts', name => {
    if(name === 'zod') return require('zod');
    if(name === 'next/navigation') return {redirect(){redirected=true;throw Error('unexpected redirect')}};
    if(name.includes('validations/stock-operations')) return {stockTransferSchema:{parse:()=>({from_branch_id:'same',to_branch_id:'same'})}};
    if(name.includes('error-handling')) return {requirePermissionOrRedirect:async()=>{},rethrowRedirect:()=>{},formatActionError:e=>e.message};
    if(name.includes('supabase/server')) return {createClient(){databaseOpened=true;throw Error('unexpected database')}};
    return {};
  });
  const result=await createStockTransfer(new FormData());
  assert.match(result.error,/must be different/);assert.equal(redirected,false);assert.equal(databaseOpened,false);
});
test('transfer retry state keeps repeated line fields and original idempotency key', async () => {
  let reduce;
  const {StockTransferForm}=compile('src/components/stock-operation-forms.tsx',name=>{
    if(name==='react') return {useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},useActionState:fn=>{reduce=fn;return [null,()=>{}]}};
    if(name==='next/navigation') return {useRouter:()=>({push(){}})};
    if(name==='react/jsx-runtime') return require(name);
    if(name.includes('lib/utils')) return {getToday:()=> '2026-10-10'};
    return {};
  },{crypto:require('node:crypto').webcrypto});
  const data=new FormData();
  for(const [key,value] of [['idempotency_key','same-key'],['remarks','retain'],['line_item_id','a'],['line_quantity','0.3'],['line_item_id','b'],['line_quantity','2'],['line_enabled','a'],['line_remarks','row note']]) data.append(key,value);
  StockTransferForm({branches:[],seedLines:[],action:async()=>({error:'Denied'})});
  const first=await reduce(null,data);const retry=await reduce(first,data);
  assert.equal(retry.attempt,2);assert.deepEqual(Array.from(new URLSearchParams(retry.values).getAll('line_quantity')),['0.3','2']);
  assert.equal(new URLSearchParams(retry.values).get('idempotency_key'),'same-key');assert.equal(new URLSearchParams(retry.values).get('line_remarks'),'row note');
});
