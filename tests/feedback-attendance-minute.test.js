const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=require('./helpers/load-source.cjs');
const {pairPunches,calculateAttendance}=load({Date})('src/lib/attendance/calculation.ts');
const event=(time,source='A')=>({occurredAt:new Date('2026-10-26T'+time+'+08:00'),source});
test('three taps within one minute retain first punch, not a30second work interval',()=>{
 const r=pairPunches(['09:00:00','09:00:20','09:00:50','13:00:00','14:00:00','18:30:00'].map(t=>event(t)));
 assert.equal(r.ordered.length,4);assert.equal(r.ignored.length,2);assert.equal(r.intervals.length,2);assert.equal(r.intervals[0].start.occurredAt.getTime(),event('09:00:00').occurredAt.getTime());assert.equal(r.intervals[0].end.occurredAt.getTime(),event('13:00:00').occurredAt.getTime());
});
test('60second boundary remains; burst anchors to retained event, not a sliding chain',()=>{
 const r=pairPunches(['09:01:00','09:00:00','09:00:59','09:01:30','09:02:00'].map(t=>event(t)));
 assert.equal(r.ordered.length,3);assert.equal(r.ignored.length,2);
});
test('duplicates do not conceal wrong device and never create missing punches',()=>{
 const r=calculateAttendance({scheduledStart:event('09:00:00').occurredAt,scheduledEnd:event('18:30:00').occurredAt,maximumRecognisedSeconds:30600,expectedBranchSource:'A'},[event('09:00:00'),event('09:00:20','B'),event('18:30:00')]);
 assert.equal(r.workedSeconds,null);assert.equal(r.overtimeSeconds,0);assert.ok(r.exceptions.includes('Wrong Branch/Device'));assert.equal(r.ignoredDuplicatePunches.length,1);
});
test('database candidate covers weekly and schedule refresh while retaining raw audit',()=>{
 const s=fs.readFileSync('supabase/migrations/371_attendance_one_minute_deduplication.sql','utf8');
 assert.match(s,/recalculate_attendance_week_pay_v1/);assert.match(s,/calculate_schedule_day_base/);assert.match(s,/interval '60 seconds'/);assert.match(s,/'raw_punches'/);assert.match(s,/'ignored_duplicate_count'/);assert.doesNotMatch(s,/delete from|truncate |select public.recalculate/i);
});
test('Manager grant is read-only and store writes fail closed with audit/version/idempotency',()=>{
 const grant=fs.readFileSync('supabase/migrations/372_manager_items_visibility.sql','utf8');assert.match(grant,/permission_code='items.view'/);assert.doesNotMatch(grant,/items.create|items.update|items.delete/);
 const sql=fs.readFileSync('supabase/migrations/373_packaging_store_ledger.sql','utf8');for(const pattern of [/enable row level security/,/revoke all on public.packaging_stores/,/company_id=actor.company_id/,/super_admin/,/for update/,/p_expected_version<>coalesce\(balance.version,0\)/,/unique\(company_id,client_key\)/,/Count the opening balance first/,/Insufficient packaging balance/,/reason text not null/,/employment_end_date/])assert.match(sql,pattern);
});

test('Manager Items list appears only with grant; create/edit/import routes remain excluded',()=>{
 const ia=load()('src/lib/information-architecture.ts');const routes=load()('src/server/auth/route-permissions.ts');
 const item=ia.informationArchitecture.find(i=>i.href==='/items');assert.equal(ia.isIaItemVisible(item,'manager',{'items.view':true}),true);assert.equal(ia.isIaItemVisible(item,'manager',{'items.view':false}),false);
 assert.deepEqual(Array.from(routes.getRouteAllowedRoles('/outlet-packaging/stores')),['super_admin']);assert.ok(routes.getRouteAllowedRoles('/items').includes('manager'));assert.ok(!routes.getRouteAllowedRoles('/items/new').includes('manager'));assert.ok(!routes.getRouteAllowedRoles('/items/example').includes('manager'));assert.ok(!routes.getRouteAllowedRoles('/imports').includes('manager'));
});
test('optional store RPC outage renders unavailable without throwing or fabricating zero',async()=>{
 const vm=require('node:vm'),ts=require('typescript'),out={};
 const jsx=(type,props)=>({type,props});
 const source=ts.transpileModule(fs.readFileSync('src/components/packaging-store-summary.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports:out,require:id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.includes('packaging-stores')?{getPackagingStoreWorkspace:async()=>{throw Error('synthetic timeout')}}:id.includes('queries/outlet-packaging')?{getOutletPackagingReport:async()=>({latest:[],products:[],outlets:[]})}:id.includes('retry-button')?{RetryButton:'retry'}:{default:'a'}});
 const view=await out.PackagingStoreSummary({days:7}),text=JSON.stringify(view);assert.match(text,/Store balances unavailable/);assert.match(text,/outlet report above remains available/);assert.doesNotMatch(text,/0 PCS|synthetic timeout/);
});
