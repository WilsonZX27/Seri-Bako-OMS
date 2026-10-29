const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const load=require('./helpers/load-source.cjs');
test('composite audit references do not reveal UUID strings outside technical details',()=>{
 const {assetDisplayReference,assetAuditRows}=load({Date,Intl})('src/lib/asset-audit-display.ts');const id='12345678-1234-4234-8234-123456789abc';
 assert.equal(assetDisplayReference('audit:'+id),'Ref 12345678');const rows=assetAuditRows({source:'audit:'+id});assert.equal(rows[0].technical,true);assert.equal(rows[0].raw,'audit:'+id);assert.equal(rows[0].display,'Ref 12345678');
});
test('cross-outlet labels retain OFF/leave/state and do not silently overwrite collisions',()=>{
 const {externalScheduleDays,externalScheduleLabel}=load()('src/lib/attendance/external-schedule.ts');const row={staff_id:'a',work_date:'2026-10-26',branch_id:'b',branch_name:'Synthetic B',planned_start:null,planned_end:null,assignment_kind:'off',schedule_status:'submitted'};
 assert.equal(externalScheduleLabel(row),'Synthetic B · OFF · Unpublished');const map=externalScheduleDays([row,{...row,branch_id:'c',branch_name:'Synthetic C'}]);assert.equal(map.size,1);assert.match(externalScheduleLabel(map.values().next().value),/Conflicting rosters/);
});
test('notice ownership and disabled-account guidance are explicit',()=>{
 const page=fs.readFileSync('src/app/(app)/people/[id]/page.tsx','utf8'),rail=fs.readFileSync('src/components/staff-security-panel.tsx','utf8');assert.match(page,/<ActionErrorNotice message={message.error}/);assert.match(page,/data-route-feedback role="status"/);assert.match(rail,/!blockedReason \? <ConsoleSection title="Password actions"/);assert.match(rail,/Record last working day/);assert.doesNotMatch(rail,/Advanced: unused test profiles|Test profile cleanup/);assert.match(rail,/!reason \? <div className="\[&>button\]:justify-center"><DangerConfirmForm/);
});
test('schedule identity is keyed by outlet/week/revision and no payroll/auto-publication introduced',()=>{
 const s=fs.readFileSync('src/app/(app)/attendance/schedule/page.tsx','utf8');assert.match(s,/key={`\$\{data.branchId\}:\$\{weekStart\}:\$\{data.week\?\.id/);
 const sql=fs.readFileSync('supabase/migrations/374_cross_outlet_schedule_evidence.sql','utf8');for(const p of [/staff_branches/,/own.staff_id=a.staff_id/,/assignment_kind in \('shift','off'/,/current_staff_company_id/,/can_access_company_branch/,/latest.revision desc/,/not_authorised/,/cross_branch_collision/])assert.match(sql,p);assert.doesNotMatch(sql,/update public.schedule|insert into public.shift|delete from public.shift/i);
});

test('StatusTabs declares a stable drawer identity in production',()=>{assert.match(fs.readFileSync('src/components/status-tabs.tsx','utf8'),/StatusTabs.displayName = "StatusTabs"/);});

test('cross-outlet patch retains activated Paid EL conflict and weekly rest guards',()=>{const sql=fs.readFileSync('supabase/migrations/374_cross_outlet_schedule_evidence.sql','utf8');assert.match(sql,/emergency_leave_work_conflict/);assert.match(sql,/in \('off','ph','al','mc','upl','ro','oil','el'\)/);});
