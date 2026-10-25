const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const realLoad=require('./helpers/load-source.cjs')({setTimeout,clearTimeout,AbortController,Error,TypeError});
const {requestDeadline}=realLoad('src/lib/http/request-deadline.ts');
function harness(fetch){
 const preview={weekStart:'2026-10-19',fileName:'synthetic.xlsx',fileHash:'synthetic',files:[],outlets:[{branchId:'branchA',status:'draft',assignments:[{staff_id:'staffA',work_date:'2026-10-19'}]}],untimedDuties:[],reusableRules:[],employeeMatches:[],assignmentSources:[],issues:[],notices:[],notes:[]};
 const catalog={staff:[],branches:[],current_assignments:[]};const seed={2:preview,5:[{name:'synthetic.xlsx'}],6:catalog,16:"staffA",27:['branchA']};
 const values=[],changes=[];let cleanup,parseCalls=0;const exports={};
 const source=fs.readFileSync('src/components/attendance/schedule-workbook-import.tsx','utf8').replace('  return <>','  return {load,recheck,confirm,saveFingerprintException};\n  return <>');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Error,TypeError,fetch,Set,Map,window:{location:{reload(){throw Error('No reload in synthetic harness');}}},require(name){
  if(name==='react')return {useEffect:fn=>{cleanup=fn();},useRef:value=>({current:value}),useState:initial=>{const index=values.length;values.push(index in seed?seed[index]:initial);return [values[index],next=>{changes.push(index);values[index]=typeof next==='function'?next(values[index]):next;}];}};
  if(name.endsWith('request-deadline'))return {requestDeadline:(operation,_ms,message)=>requestDeadline(operation,5,message)};
  if(name.endsWith('read-json-response'))return realLoad('src/lib/http/read-json-response.ts');
  if(name.endsWith('schedule-workbook'))return {scheduleOtResolutionError:()=>null,scheduleImportDisposition:()=> 'new',parseScheduleWorkbooks:async()=>{parseCalls++;return preview;},SCHEDULE_SHEET_BRANCHES:{}};
  return new Proxy({}, {get:(_,key)=>key});
 }});
 const handlers=exports.ScheduleWorkbookImport({weekStart:'2026-10-19',canDraft:true});return {values,changes,handlers,preview,cleanup:()=>cleanup(),get parseCalls(){return parseCalls;}};
}
test('actual recheck handler releases busy on stalled read without discarding selection or preview',async()=>{
 const h=harness(()=>new Promise(()=>{}));await h.handlers.recheck();assert.equal(h.values[3],false);assert.equal(h.values[2],h.preview);assert.deepEqual(h.values[27],['branchA']);assert.match(h.values[4],/taking too long.*workbook is retained/);
});
test('actual confirm handler marks stalled mutation unconfirmed and never replays',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});await Promise.all([h.handlers.confirm(),h.handlers.confirm()]);assert.equal(calls,1);assert.equal(h.values[3],false);assert.equal(h.values[29].branchA.status,'unconfirmed');assert.deepEqual(h.values[27],['branchA']);assert.match(h.values[4],/server may have saved drafts/);
});
test('unmounted read ignores a late successful response without parsing or changing state',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));const work=h.handlers.load([{name:'synthetic.xlsx'}]);h.cleanup();const count=h.changes.length;resolve({ok:true,status:200,redirected:false,url:'/catalog',headers:{get:()=> 'application/json'},json:async()=>({staff:[],branches:[]})});await work;assert.equal(h.parseCalls,0);assert.equal(h.changes.length,count);
});

test('fingerprint save also releases busy as uncertain without clearing reason or replay',async()=>{
 let calls=0;const h=harness(()=>{calls++;return new Promise(()=>{});});const reason=h.values[18];await Promise.all([h.handlers.saveFingerprintException(),h.handlers.saveFingerprintException()]);assert.equal(calls,1);assert.equal(h.values[3],false);assert.equal(h.values[18],reason);assert.match(h.values[4],/server may have saved it/);
});
