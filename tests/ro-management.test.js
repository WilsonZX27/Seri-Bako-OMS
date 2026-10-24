const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('vm');
function load({permission=true,wide=false,branchIds=['b'],people=[],nullBalance=false}={}){
 const calls=[],m={exports:{}};let current=0,max=0;
 const q={};for(const method of ['select','eq','is','in','or','order','range'])q[method]=(...args)=>(calls.push({method,args}),q);q.then=(a,b)=>Promise.resolve({data:people,error:null}).then(a,b);
 const db={from:table=>(calls.push({table}),q),rpc:async(name,args)=>{calls.push({name,args});current++;max=Math.max(max,current);await Promise.resolve();current--;return {data:nullBalance?null:name==='get_comp_time_balance'?120:60,error:null}}};
 const mocks={'@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:x=>x},'@/server/auth/permissions':{hasPermission:async()=>permission},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'c'})},'@/server/queries/notifications':{getCurrentUserScope:async()=>({companyWideAccess:wide,branchIds})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/ro-management.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>{if(!mocks[n])throw Error(n);return mocks[n]}});return {run:m.exports.getRoManagement,calls,max:()=>max};
}
const person=i=>({id:'s'+i,full_name:'Synthetic '+i,status:'disabled',employment_end_date:'2026-09-30',staff_branches:[{branch_id:'b',is_default:true,branches:{branch_name:'Synthetic outlet'}}]});
test('RO central query denies absent permissions and out-of-scope branches before reading balances',async()=>{
 for(const options of [{permission:false},{branchIds:[]}]){const h=load(options);assert.equal((await h.run({})).rows.length,0);assert.equal(h.calls.length,0)}
 const h=load();assert.equal((await h.run({branch_id:'foreign'})).rows.length,0);assert.equal(h.calls.length,0);
});
test('RO central directory includes ended/disabled balances with minimal scoped fields and authoritative RPCs',async()=>{
 const h=load({people:[person(1)]}),r=await h.run({search:'Synthetic'});assert.equal(r.rows[0].balance,120);assert.equal(r.rows[0].available,60);assert.equal(r.rows[0].branchId,'b');
 assert.ok(h.calls.some(c=>c.method==='eq'&&c.args[0]==='company_id'&&c.args[1]==='c'));
 assert.ok(h.calls.some(c=>c.method==='in'&&c.args[0]==='staff_branches.branch_id'));
 assert.ok(h.calls.some(c=>c.method==='select'&&c.args[0].includes('staff_branches!inner')));
 assert.ok(!h.calls.some(c=>c.method==='select'&&/email|phone|auth_user|payroll|\*/.test(c.args[0])));
 assert.ok(!h.calls.some(c=>c.method==='in'&&c.args[0]==='status'));
 assert.ok(h.calls.filter(c=>c.name).every(c=>['get_comp_time_balance','get_comp_time_available_balance'].includes(c.name)));
});
test('RO paging is bounded, preserves next-page indication, and missing balance is never zero',async()=>{
 const h=load({wide:true,people:Array.from({length:26},(_,i)=>person(i))}),r=await h.run({page:'2'});assert.equal(r.rows.length,25);assert.equal(r.hasNext,true);assert.ok(h.max()<=10);assert.ok(h.calls.some(c=>c.method==='range'&&c.args[0]===25&&c.args[1]===50));
 await assert.rejects(load({people:[person(1)],nullBalance:true}).run({}),/no zero balance was assumed/);
});
test('RO corrections reuse the existing approval API and permission gates; no new mutation endpoint',()=>{
 const p=fs.readFileSync('src/app/(app)/people/ro/page.tsx','utf8');assert.match(p,/hasPermission\("comp_time.submit"\)/);assert.match(p,/CompTimeCorrectionForm/);assert.match(p,/\/attendance\/review/);assert.doesNotMatch(p,/createAdminClient|\.rpc\(|\/api\/people\/ro/);
});
