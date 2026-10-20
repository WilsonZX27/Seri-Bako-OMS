import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const f=JSON.parse(fs.readFileSync('/tmp/oms-people-browser-private.json')),actor=f.ids['31000000-0000-0000-0000-000000000001'];
const sql=`begin;
set local request.jwt.claims='{"sub":"${actor}","role":"authenticated"}';
select set_config('test.other_hash',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) from daily_attendance_results r where not (staff_id='${f.staff}' and work_date='2026-09-08')),true);
select public.calculate_schedule_day('${f.ids['81000000-0000-4000-8000-000000000001']}','${f.staff}','2026-09-08');
do $$ begin
 if current_setting('test.other_hash') is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) from daily_attendance_results r where not (staff_id='${f.staff}' and work_date='2026-09-08')) then raise exception 'Scoped refresh changed unrelated results';end if;
 if not exists(select 1 from daily_attendance_results where staff_id='${f.staff}' and work_date='2026-09-08' and is_current and worked_seconds=25200 and overtime_candidate_seconds=0 and actual_break_out is not null and actual_break_in is not null) then raise exception 'Midnight four punch result changed';end if;
 if exists(select 1 from daily_attendance_results where staff_id='${f.staff}' and work_date between '2026-09-09' and '2026-09-12' and is_current and (worked_seconds is not null or payable_seconds is not null or overtime_candidate_seconds<>0)) then raise exception 'Refresh fabricated anomalous work';end if;
end $$;
update attendance_schedule_refresh set status='pending' where staff_id='${f.staff}' and work_date='2026-09-13';
set local role authenticated;select public.refresh_schedule_attendance('2026-09-07','${f.branch}');reset role;
do $$ begin
 if not exists(select 1 from attendance_schedule_refresh where staff_id='${f.staff}' and work_date='2026-09-13' and status='needs_review') then raise exception 'Reviewed claim was not protected';end if;
 if not exists(select 1 from daily_attendance_results where staff_id='${f.staff}' and work_date='2026-09-13' and is_current and overtime_seconds=1800 and worked_seconds=32400) then raise exception 'Approved OT was overwritten';end if;
end $$;
savepoint adjacent_batch;
update attendance_import_batches set week_start='2026-08-31' where id='${f.ids['81000000-0000-4000-8000-000000000001']}';
do $$ begin if public.calculate_schedule_day('${f.ids['81000000-0000-4000-8000-000000000001']}','${f.staff}','2026-09-08')<>1 then raise exception 'Adjacent-week batch lost target day';end if;end $$;
rollback to savepoint adjacent_batch;
insert into attendance_confirmations(company_id,staff_id,period_start,period_end,version,source_hash,attendance,state,prepared_by)
select '${f.company}','${f.staff}','2026-09-08','2026-09-08',1,public.attestation_content_hash(payload),payload,'approved','${f.ids['41000000-0000-0000-0000-000000000001']}' from(select public.attestation_source('${f.staff}','2026-09-08','2026-09-08') payload)x;
update attendance_schedule_refresh set status='pending' where staff_id='${f.staff}' and work_date='2026-09-08';
set local role authenticated;select public.refresh_schedule_attendance('2026-09-07','${f.branch}');reset role;
do $$ begin if not exists(select 1 from attendance_confirmations where staff_id='${f.staff}' and period_start='2026-09-08' and state='approved') then raise exception 'Unchanged refresh invalidated signature';end if;end $$;
insert into employee_payslips(confirmation_id,company_id,staff_id,calculation_hash,earnings,deductions,detail,state,calculated_by)
select id,company_id,staff_id,public.attestation_calculation_hash(staff_id,period_start,period_end),0,0,'[]','released',prepared_by from attendance_confirmations where staff_id='${f.staff}' and period_start='2026-09-08';
select set_config('test.protected_hash',(select md5(jsonb_agg(to_jsonb(r) order by r.id)::text) from daily_attendance_results r where staff_id='${f.staff}' and work_date='2026-09-08'),true);
update attendance_schedule_refresh set status='pending' where staff_id='${f.staff}' and work_date='2026-09-08';
set local role authenticated;select public.refresh_schedule_attendance('2026-09-07','${f.branch}');reset role;
do $$ begin
 if not exists(select 1 from attendance_schedule_refresh where staff_id='${f.staff}' and work_date='2026-09-08' and status='needs_review') then raise exception 'Released payroll not protected';end if;
 if current_setting('test.protected_hash') is distinct from(select md5(jsonb_agg(to_jsonb(r) order by r.id)::text) from daily_attendance_results r where staff_id='${f.staff}' and work_date='2026-09-08') then raise exception 'Released results changed';end if;
end $$;rollback;`;
const r=spawnSync('docker',['exec','-i','supabase_db_oms-integration-20261014','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'});fs.writeFileSync('/tmp/oms-scoped-refresh-db.log',r.stdout+r.stderr);if(r.status)throw Error(r.stderr);fs.writeFileSync('outputs/qa/component-states/scoped-refresh.json',JSON.stringify({scope:'synthetic transaction rollback',checks:['Scoped refresh preserves all unrelated daily-result rows byte for byte','Cross-midnight four-punch work and zero candidate retained','Duplicate/missing/extra anomalies stay unpayable','Reviewed active claim returns needs_review and retains approved OT','Unchanged refresh preserves signed confirmation','Released payroll blocks refresh and preserves result hash','Adjacent-week batch still recalculates the explicit target day']},null,2));console.log('PASS scoped refresh parity, unrelated-row hashes and approved-claim protection');
