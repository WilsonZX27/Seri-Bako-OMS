const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('vm');
function load({permission=true,wide=false,branchIds=['b'],people=[],nullBalance=false,balanceFor}={}){
 const calls=[],m={exports:{}};let current=0,max=0;
 let statuses=null,excludeEnded=false,span=null,ordering=[];
 const q={};for(const method of ['select','eq','is','in','or','order','range'])q[method]=(...args)=>{calls.push({method,args});if(method==='in'&&args[0]==='status')statuses=args[1];if(method==='or'&&args[0].startsWith('employment_end_date.'))excludeEnded=true;if(method==='range')span=args;if(method==='order')ordering.push(args);return q;};
 q.then=(a,b)=>{let rows=people.filter(p=>(!statuses||statuses.includes(p.status))&&(!excludeEnded||!p.employment_end_date||p.employment_end_date>='2026-10-24'));for(const [key,opts]of [...ordering].reverse())rows.sort((a,b)=>(opts?.ascending===false?-1:1)*String(a[key]??'').localeCompare(String(b[key]??'')));const count=rows.length;if(span)rows=rows.slice(span[0],span[1]+1);return Promise.resolve({data:rows,count,error:null}).then(a,b);};
 const db={from:table=>(calls.push({table}),q),rpc:async(name,args)=>{calls.push({name,args});current++;max=Math.max(max,current);await Promise.resolve();current--;return {data:nullBalance?null:balanceFor?balanceFor(name,args.p_staff_id):name==='get_comp_time_balance'?120:60,error:null}}};
 const mocks={'@/lib/business-date':{todayInKualaLumpur:()=> '2026-10-24'},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:x=>x},'@/server/auth/permissions':{hasPermission:async()=>permission},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'c'})},'@/server/queries/notifications':{getCurrentUserScope:async()=>({companyWideAccess:wide,branchIds})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/ro-management.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>{if(!mocks[n])throw Error(n);return mocks[n]}});return {run:m.exports.getRoManagement,calls,max:()=>max};
}
const person=i=>({id:'s'+i,full_name:'Synthetic '+i,status:'active',employment_end_date:null,staff_branches:[{branch_id:'b',is_default:true,branches:{branch_name:'Synthetic outlet'}}]});
test('RO central query denies absent permissions and out-of-scope branches before reading balances',async()=>{
 for(const options of [{permission:false},{branchIds:[]}]){const h=load(options);assert.equal((await h.run({})).rows.length,0);assert.equal(h.calls.length,0)}
 const h=load();assert.equal((await h.run({branch_id:'foreign'})).rows.length,0);assert.equal(h.calls.length,0);
});
test('RO central directory excludes ended/disabled with minimal scoped fields and authoritative RPCs',async()=>{
 const h=load({people:[person(1)]}),r=await h.run({search:'Synthetic'});assert.equal(r.rows[0].balance,120);assert.equal(r.rows[0].available,60);assert.equal(r.rows[0].branchId,'b');
 assert.ok(h.calls.some(c=>c.method==='eq'&&c.args[0]==='company_id'&&c.args[1]==='c'));
 assert.ok(h.calls.some(c=>c.method==='in'&&c.args[0]==='staff_branches.branch_id'));
 assert.ok(h.calls.some(c=>c.method==='select'&&c.args[0].includes('staff_branches!inner')));
 assert.ok(!h.calls.some(c=>c.method==='select'&&/email|phone|auth_user|payroll|\*/.test(c.args[0])));
 assert.ok(h.calls.some(c=>c.method==='in'&&c.args[0]==='status'&&c.args[1].join(',')==='active,invited'));
 assert.ok(h.calls.some(c=>c.method==='or'&&c.args[0].includes('employment_end_date.gte.2026-10-24')));
 assert.ok(h.calls.filter(c=>c.name).every(c=>['get_comp_time_balance','get_comp_time_available_balance'].includes(c.name)));
});
test('RO paging is bounded, preserves next-page indication, and missing balance is never zero',async()=>{
 const h=load({wide:true,people:Array.from({length:26},(_,i)=>person(i))}),r=await h.run({page:'2'});assert.equal(r.rows.length,1);assert.equal(r.hasNext,false);assert.equal(r.totalRows,26);assert.ok(h.max()<=10);assert.ok(h.calls.some(c=>c.method==='range'&&c.args[0]===25&&c.args[1]===50));
 await assert.rejects(load({people:[person(1)],nullBalance:true}).run({}),/no zero balance was assumed/);
});
test('RO corrections reuse the existing approval API and permission gates; no new mutation endpoint',()=>{
 const p=fs.readFileSync('src/app/(app)/people/ro/page.tsx','utf8');assert.match(p,/hasPermission\("comp_time.submit"\)/);assert.match(p,/CompTimeCorrectionForm/);assert.match(p,/\/attendance\/review/);assert.doesNotMatch(p,/createAdminClient|\.rpc\(|\/api\/people\/ro/);
});

test('RO disabled and resigned staff are absent before ledger reads; last working day is inclusive',async()=>{const ended={...person(1),employment_end_date:'2026-10-23'},disabled={...person(2),status:'disabled'},lastDay={...person(3),employment_end_date:'2026-10-24'};const h=load({people:[ended,disabled,lastDay]});const result=await h.run({});assert.equal(result.rows.length,1);assert.equal(result.rows[0].id,lastDay.id);assert.ok(h.calls.filter(c=>c.name).every(c=>c.args.p_staff_id===lastDay.id));});
test('RO balance sorts globally before25-row paging and preserves the authoritative available calculation',async()=>{const h=load({wide:true,people:Array.from({length:30},(_,i)=>person(i)),balanceFor:(name,id)=>Number(id.slice(1))*(name==='get_comp_time_balance'?10:3)});const r=await h.run({sort:'available',dir:'desc',page:'2'});assert.equal(r.totalRows,30);assert.equal(r.rows.length,5);assert.deepEqual(Array.from(r.rows,x=>x.available),[12,9,6,3,0]);assert.ok(h.max()<=10);});
test('RO large numeric sorting refuses partial results before balance reads',async()=>{const h=load({wide:true,people:Array.from({length:502},(_,i)=>person(i))});const result=await h.run({sort:'balance'});assert.equal(result.sortUnavailable,true);assert.equal(result.rows.length,0);assert.equal(result.totalRows,502);assert.equal(h.calls.filter(c=>c.name).length,0);});
test('RO uses standard table sortable headers pagination and right panel, with no ad-hoc footer',()=>{const page=fs.readFileSync('src/app/(app)/people/ro/page.tsx','utf8');assert.match(page,/<Table /);assert.match(page,/<SortableHead label="Available"/);assert.match(page,/<PaginationControls/);assert.match(page,/rightRail={rail}/);assert.doesNotMatch(page,/<article|<footer|staffEmploymentStatus/);});

test('RO nonzero ascending and descending sorts retain negatives, available versus balance, and stable ties',async()=>{
 const values={s0:[-30,-45],s1:[120,80],s2:[120,50],s3:[0,0]};
 for(const sort of ['balance','available'])for(const dir of ['asc','desc']){
  const h=load({wide:true,people:[person(2),person(0),person(3),person(1)],balanceFor:(name,id)=>values[id][name==='get_comp_time_balance'?0:1]});
  const result=await h.run({sort,dir});const numbers=Array.from(result.rows,r=>r[sort]);assert.deepEqual(numbers,[...numbers].sort((a,b)=>dir==='asc'?a-b:b-a));
  assert.equal(result.rows.find(r=>r.id==='s0').available,-45);assert.equal(result.rows.find(r=>r.id==='s1').balance,120);
  if(sort==='balance')assert.deepEqual(Array.from(result.rows.filter(r=>r.balance===120),r=>r.id),['s1','s2']);
 }
});
test('RO exact500-row numeric boundary sorts,501 refuses partial ledger results and pagination clamps',async()=>{
 for(const count of [500,501]){
  const h=load({wide:true,people:Array.from({length:count},(_,i)=>person(i)),balanceFor:(name,id)=>Number(id.slice(1))});const r=await h.run({sort:'available',dir:'desc'});
  assert.equal(r.sortUnavailable,count>500);if(count===500){assert.equal(r.rows[0].available,499);assert.equal(r.rows.length,25);assert.equal(r.hasNext,true);}else assert.equal(h.calls.filter(c=>c.name).length,0);
 }
 const h=load({wide:true,people:[person(1)]});assert.equal((await h.run({page:'-9'})).page,1);assert.equal((await h.run({page:'20001'})).page,10000);
});
