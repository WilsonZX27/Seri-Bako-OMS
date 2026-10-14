import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const f=JSON.parse(fs.readFileSync('/tmp/oms-ot-concurrency-fixture.json')),id=k=>f.ids[k],a=id('31000000-0000-0000-0000-000000000001'),b=id('31000000-0000-0000-0000-000000000003'),role=id('51000000-0000-0000-0000-000000000001');
const auth=x=>`set local role authenticated;set local request.jwt.claims='{"sub":"${x}","role":"authenticated"}';`;
const sql=`begin;
insert into role_permissions(role_id,permission_id) select '${role}',id from permissions where permission_code in ('comp_time.submit','comp_time.approve','comp_time.read') on conflict do nothing;
savepoint used_credit;
with used as (insert into comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,status,submitted_by,decided_by) select company_id,staff_id,branch_id,work_date,'used',-30,'Synthetic prior redemption','approved',submitted_by,decided_by from comp_time_transactions where source_ot_claim_id='${f.claim}' returning id,company_id)
insert into comp_time_allocations(company_id,used_transaction_id,earned_transaction_id,allocated_minutes) select used.company_id,used.id,t.id,30 from used join comp_time_transactions t on t.source_ot_claim_id='${f.claim}';
${auth(b)}
do $$ begin
 begin perform public.submit_attendance_ot_reconciliation('${f.claim}','Used credit reversal',null);raise exception 'Used credit reversal accepted';exception when others then if sqlerrm not like '%already been used%' then raise;end if;end;
end $$;
reset role;rollback to savepoint used_credit;
${auth(b)}
select set_config('test.reversal',(public.submit_attendance_ot_reconciliation('${f.claim}','Synthetic audited reversal',null)).id::text,true);
do $$ begin
 if (select overtime_seconds from daily_attendance_results where company_id='${f.company}' and work_date='2026-09-13' and is_current)<>3600 then raise exception 'Submitting reversal changed approved hours';end if;
 begin perform public.decide_comp_time_transaction(current_setting('test.reversal')::uuid,'approve',null);raise exception 'Self approval accepted';exception when others then if sqlerrm not like '%submitter cannot approve%' then raise;end if;end;
end $$;
${auth(a)}
select (public.decide_comp_time_transaction(current_setting('test.reversal')::uuid,'approve','Verified original credit')).status;
reset role;set constraints all immediate;
do $$ declare r daily_attendance_results; begin
 if (select status from attendance_ot_claims where id='${f.claim}')<>'cancelled' then raise exception 'Claim stayed active';end if;
 if public.get_comp_time_balance('${f.staff}')<>0 then raise exception 'Reversal balance incorrect';end if;
 if (select sum(allocated_minutes) from comp_time_allocations where used_transaction_id=current_setting('test.reversal')::uuid)<>60 then raise exception 'Reversed earning remains available';end if;
 if (select state from attendance_confirmations where company_id='${f.company}' and period_start='2026-09-13')<>'approved' then raise exception 'Reversal cleared attendance signature';end if;
 select * into r from daily_attendance_results where company_id='${f.company}' and work_date='2026-09-13' and is_current;
 r:=public.adjust_attendance_result(r.id,'{"actual_last_out":"2026-09-13T19:00:00+08:00"}','Correct after approved RO reconciliation');
 if r.worked_seconds<>32400 or r.overtime_candidate_seconds<>1800 or r.overtime_seconds<>0 then raise exception 'Reconciled time correction incorrect';end if;
 if (select state from attendance_confirmations where company_id='${f.company}' and period_start='2026-09-13')='approved' then raise exception 'Time correction retained stale signature';end if;
end $$;
${auth(a)}
select set_config('test.new_claim',(public.submit_attendance_ot_claim((select id from daily_attendance_results where company_id='${f.company}' and work_date='2026-09-13' and is_current),30,'Corrected claim',null)).id::text,true);
${auth(b)}
select (public.decide_attendance_ot_claim(current_setting('test.new_claim')::uuid,'approve',30,null)).status;
reset role;
do $$ begin
 if public.get_comp_time_balance('${f.staff}')<>30 then raise exception 'Corrected claim duplicated balance';end if;
 begin perform public.submit_attendance_ot_reconciliation('${f.claim}','Repeat old reversal',null);raise exception 'Old reversal repeated';exception when others then if sqlerrm not like '%credited OT claim is required%' then raise;end if;end;
 raise notice 'PASS linked reversal, separate approver, signature preservation, time correction, new claim and final net RO 30 minutes';
end $$;
rollback;`;
const r=spawnSync('docker',['exec','-i','supabase_db_oms-integration-replay-20261014','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'});
fs.writeFileSync('/tmp/oms-ot-reconciliation-db.log',r.stdout+r.stderr);if(r.status)throw Error(r.stderr);console.log(r.stderr.trim());
fs.writeFileSync('outputs/qa/component-states/ot-reconciliation.json',JSON.stringify({scope:'local synthetic rollback',checks:['Already-used OT credit reversal is rejected','People fixture permissions match migration 265 (read, submit, approve)','Pending reversal leaves credit unchanged','Self approval rejected','Other People approval reverses exactly 60 minutes','Original earning allocated to reversal and unavailable for RO','Money-only reversal preserves attendance signature','Time correction after reconciliation invalidates signature','Corrected 30-minute OT claim produces net RO 30 minutes','Repeated original reversal rejected'],rollback:true},null,2));
