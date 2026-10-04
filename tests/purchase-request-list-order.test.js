const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load() {
  const records=Array.from({length:20},(_,i)=>({id:`sep-${i}`,request_no:`PR/SEP26/${i+1}`,request_sort_key:`sep-${String(i+1).padStart(3,'0')}`,created_at:`2026-09-${String(i+1).padStart(2,'0')}T00:00:00Z`,status:'manager_review'}));
  records.push({id:'oct-6',request_no:'PR/OCT26/006',request_sort_key:'oct-006',created_at:'2026-10-04T09:59:15Z',status:'manager_review'});
  const calls=[];
  const client={from(table){
    let rows=table==='purchase_requests'?[...records]:[];const sorts=[];
    const chain={select(){return chain;},is(){return chain;},in(){return chain;},eq(column,value){rows=rows.filter(r=>r[column]===value);return chain;},order(column,options){sorts.push({column,...options});calls.push(column);return chain;},range(start,end){
      rows.sort((a,b)=>{for(const s of sorts){const d=String(a[s.column]).localeCompare(String(b[s.column]));if(d)return s.ascending?d:-d;}return 0;});
      return Promise.resolve({data:rows.slice(start,end+1),count:rows.length,error:null});
    },then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}};return chain;
  }};
  const module={exports:{}};
  const dependencies={
    '@/lib/mock-mode':{isMockMode:()=>false},
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/server/actors/display':{resolveActorDisplayMap:async()=>new Map(),actorDisplayName:()=>null},
  };
  const code=ts.transpileModule(fs.readFileSync('src/server/queries/procurement.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','module','exports',code)(name=>dependencies[name]??{},module,module.exports);
  return {get:module.exports.getPurchaseRequests,calls};
}
test('new October PR appears on first page ahead of September records',async()=>{
  const {get,calls}=load();const result=await get();
  assert.equal(result.rows[0].request_no,'PR/OCT26/006');
  assert.equal(result.rows.length,12);assert.equal(result.totalRows,21);
  assert.deepEqual(calls,['created_at','id']);
});
test('explicit natural number sorting and pagination remain available',async()=>{
  const {get,calls}=load();const first=await get({sort:'request_no'});
  assert.equal(first.rows[0].request_no,'PR/SEP26/20');
  const second=await get({sort:'request_no',page:'2'});
  assert.equal(second.rows.length,9);assert.equal(second.rows[8].request_no,'PR/OCT26/006');
  assert.deepEqual(calls,['request_sort_key','id','request_sort_key','id']);
});
test('invalid sort parameters fall back to newest creation first',async()=>{
  const {get}=load();assert.equal((await get({sort:'invalid'})).rows[0].request_no,'PR/OCT26/006');
});
