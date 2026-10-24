const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function harness({permissions=['attendance.read','comp_time.read','staffs.read'],access=true,error=null,ledger=[]}={}){
 const calls=[];const people=[
 {id:'no-activity',company_id:'company',full_name:'Synthetic no attendance',status:'active',deleted_at:null,employment_end_date:null,branches:['branch']},
 {id:'invited',company_id:'company',full_name:'Synthetic invited',status:'invited',deleted_at:null,employment_end_date:null,branches:['branch']},
 {id:'last-day',company_id:'company',full_name:'Synthetic last day',status:'active',deleted_at:null,employment_end_date:'2026-10-19',branches:['branch']},
 {id:'ended',company_id:'company',status:'active',deleted_at:null,employment_end_date:'2026-10-18',branches:['branch']},
 {id:'inactive',company_id:'company',status:'inactive',deleted_at:null,employment_end_date:null,branches:['branch']},
 {id:'deleted',company_id:'company',status:'active',deleted_at:'2026-10-01',employment_end_date:null,branches:['branch']},
 {id:'other-branch',company_id:'company',status:'active',deleted_at:null,employment_end_date:null,branches:['other']},
 {id:'other-company',company_id:'other',status:'active',deleted_at:null,employment_end_date:null,branches:['branch']},
 ];
 const db={rpc:async(n,args)=>{calls.push({rpc:n,args});return {data:access,error}},from:name=>{
  calls.push({table:name});const filters=[];let offset=0,end=499,limitDate=null;
  const q={select(s){calls.push({select:s});return q},eq(k,v){filters.push(r=>k==='staff_branches.branch_id'?r.branches.includes(v):r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},is(k,v){filters.push(r=>r[k]===v);return q},or(s){calls.push({or:s});limitDate=s.split('.gte.')[1];return q},order(){return q},range(a,b){offset=a;end=b;return q},lte(k,v){filters.push(r=>r[k]<=v);return q},gte(){return q},then(resolve,reject){const source=name==='staffs'?people:name==='comp_time_transactions'?ledger:[];const rows=source.filter(r=>filters.every(f=>f(r))&&(!limitDate||r.employment_end_date===null||r.employment_end_date>=limitDate)).slice(offset,end+1);return Promise.resolve({data:rows,error:null}).then(resolve,reject)}};
  return q;
 }};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/attendance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Intl,Date,require:n=>({
 '@/lib/supabase/server':{createClient:async()=>db},'@/lib/supabase/loose':{looseSupabase:d=>d},'@/server/auth/permissions':{hasPermission:async p=>permissions.includes(p)},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:'company'})},'@/lib/mock-mode':{isMockMode:()=>false},
 }[n]||{})});return {api:exports,calls};
}
test('independent directory includes no-attendance staff but preserves tenant, branch, deletion and date-effective eligibility',async()=>{
 const h=harness();const rows=await h.api.getAttendanceCompPeople('2026-10-19','branch');
 assert.deepEqual(Array.from(rows,r=>r.id),['no-activity','invited','last-day']);
 assert.equal(h.calls.find(c=>c.rpc).rpc,'can_access_company_branch');
 assert.deepEqual(Object.keys(h.calls.find(c=>c.rpc).args),['target_company_id','target_branch_id']);
 assert.ok(h.calls.some(c=>c.select?.includes('staff_branches!inner')));
});
test('directory does not broaden staff/comp-time/attendance access or query an unavailable branch',async()=>{
 for(const missing of ['attendance.read','comp_time.read','staffs.read']){
  const h=harness({permissions:['attendance.read','comp_time.read','staffs.read'].filter(p=>p!==missing)});
  assert.equal((await h.api.getAttendanceCompPeople('2026-10-19','branch')).length,0);assert.equal(h.calls.length,0);
 }
 const denied=harness({access:false});assert.equal((await denied.api.getAttendanceCompPeople('2026-10-19','other')).length,0);assert.ok(!denied.calls.some(c=>c.table));
 const all=harness();assert.equal((await all.api.getAttendanceCompPeople('2026-10-19')).length,0);assert.equal(all.calls.length,0);
 const error=harness({error:{message:'Synthetic permission failure'}});await assert.rejects(error.api.getAttendanceCompPeople('2026-10-19','branch'));
 const invalid=harness();await assert.rejects(invalid.api.getAttendanceCompPeople('2026-10-19,status.eq.active','branch'),/period/);
});
test('actuals includes independently authorised staff without inventing attendance or changing historical ledger sums',async()=>{
 const h=harness();const result=await h.api.getAttendanceActuals('2026-10-19','branch');
 assert.equal(result.assignments.length,0);assert.equal(result.balances['no-activity'],0);assert.equal(result.compPeople.length,3);
 assert.ok(h.calls.some(c=>c.table==='comp_time_transactions'));
});
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
test('actual panel renders independent staff identity and correction choices without fake assignments',()=>{
 let options=[];const wrap=tag=>p=>React.createElement(tag,p,p.children);
 const Panel=compile('src/components/attendance/actual-attendance-panel.tsx',{
 '@/components/ui/native-dialog':{NativeDialog:wrap('div')},'@/components/ui/button':{Button:wrap('button')},'@/components/ui/input':{Input:wrap('input')},'@/components/ui/status-badge':{StatusBadge:wrap('span')},'@/components/ui/select-control':{SelectControl:p=>{if(p.name==='staffId')options=p.options;return React.createElement('div',null,p.options?.map(o=>React.createElement('span',{key:o.value},o.label)))}},'@/lib/http/read-json-response':{},'@/lib/attendance/time':{formatAttendanceTime:()=>''}
 }).ActualAttendancePanel;
 const html=renderToStaticMarkup(React.createElement(Panel,{assignments:[],compPeople:[{id:'no-activity',full_name:'Synthetic no attendance'}],reports:[],ledger:[],balances:{'no-activity':0},canSubmit:false,canApprove:false,canSubmitComp:true,canApproveComp:false}));
 assert.match(html,/Synthetic no attendance/);assert.equal(options[0].value,'no-activity');assert.match(html,/0 min/);
});

test('adding no-attendance identities retains approved as-of-period calculation and excludes pending/future/other staff ledger',async()=>{
 const h=harness({ledger:[
 {staff_id:'no-activity',minutes:90,status:'approved',work_date:'2026-10-01'},
 {staff_id:'no-activity',minutes:-30,status:'approved',work_date:'2026-10-20'},
 {staff_id:'no-activity',minutes:500,status:'pending',work_date:'2026-10-20'},
 {staff_id:'no-activity',minutes:900,status:'approved',work_date:'2026-10-26'},
 {staff_id:'other-branch',minutes:100,status:'approved',work_date:'2026-10-20'},
 ]});
 const result=await h.api.getAttendanceActuals('2026-10-19','branch');
 assert.equal(result.balances['no-activity'],60);assert.equal(result.balances.invited,0);assert.equal(result.balances['other-branch'],undefined);assert.equal(result.ledger.length,3);
});
