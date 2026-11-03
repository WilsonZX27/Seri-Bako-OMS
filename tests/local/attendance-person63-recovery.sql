-- SYNTHETIC LOCAL ONLY; run via build-person63-rehearsal.py. Ends with ROLLBACK.
select md5(pg_get_functiondef('public.calculate_schedule_day_base(uuid,uuid,date)'::regprocedure)) as tested_base_md5;
set local lock_timeout='3s';
set local statement_timeout='60s';
select id as actor,company_id as company,auth_user_id as actor_auth,default_branch_id as branch from staffs where full_name='QA super_admin' \gset
select id as target from staffs where full_name='QA outlet_staff' \gset
select set_config('request.jwt.claim.sub',:'actor_auth',true);
select set_config('test.target',:'target'::text,true);
select set_config('test.company',:'company'::text,true);
create temp table scope(work_date date primary key,batch_id uuid);
insert into scope select * from oms_person63_recovery.scope();
insert into schedule_weeks(company_id,branch_id,week_start,status,created_by) select distinct :'company'::uuid,:'branch'::uuid,date_trunc('week',work_date)::date,'draft',:'actor'::uuid from scope;
update schedule_weeks set status='submitted' where company_id=:'company'::uuid and week_start='2026-10-26';
insert into shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,custom_start,custom_end,custom_reason,created_by)
select :'company'::uuid,w.id,:'target'::uuid,:'branch'::uuid,s.work_date,'shift','09:00','18:00','Synthetic mapping repair rehearsal',:'actor'::uuid from scope s join schedule_weeks w on w.company_id=:'company'::uuid and w.branch_id=:'branch'::uuid and w.week_start=date_trunc('week',s.work_date)::date;
insert into attendance_import_batches(id,company_id,week_start,parser_profile,file_name,file_hash,status,uploader_staff_id)
select distinct batch_id,:'company'::uuid,date_trunc('week',work_date)::date,'view_attendance_punch','SYNTHETIC.csv',batch_id::text,'finalised',:'actor'::uuid from scope;
insert into attendance_raw_punch_events(company_id,person_id,occurred_at,local_timestamp,timezone_offset,source_code,punch_type,event_fingerprint,raw_row)
select :'company'::uuid,'63',(d+t) at time zone 'Asia/Kuala_Lumpur',d+t,'+08:00','SYNTHETIC',case when t in ('09:00'::time,'14:00'::time) then 'in' else 'out' end,md5(d::text||t::text||'baki-rehearsal'),'{}' from (select work_date d from scope union select '2026-10-13'::date union select '2026-10-17'::date) days cross join unnest(array['09:00','13:00','14:00','18:00']::time[]) t;
insert into attendance_raw_punch_events(company_id,person_id,occurred_at,local_timestamp,timezone_offset,source_code,punch_type,event_fingerprint,raw_row)
select company_id,person_id,occurred_at+make_interval(secs=>i),local_timestamp+make_interval(secs=>i),timezone_offset,source_code,punch_type,md5(event_fingerprint||i::text),raw_row from attendance_raw_punch_events cross join generate_series(1,7)i where person_id='63' and local_timestamp='2026-10-01 09:00';
insert into attendance_import_batch_events(batch_id,event_id,source_row_number,disposition)
select s.batch_id,e.id,row_number() over(partition by s.batch_id order by e.occurred_at)::integer,'inserted' from scope s join attendance_raw_punch_events e on e.person_id='63' and e.local_timestamp::date=s.work_date;
select calculate_schedule_day(batch_id,:'target'::uuid,work_date) from scope order by work_date;
create temp table before_results as select r.* from daily_attendance_results r where r.staff_id=:'target'::uuid and r.work_date between '2026-10-01' and '2026-11-01';
create temp table before_raw as select id,md5(to_jsonb(e)::text) digest from attendance_raw_punch_events e;
create temp table before_exceptions as select e.* from attendance_exceptions e join before_results r on r.id=e.result_id;
create temp table before_outside as select id,md5(to_jsonb(r)::text) digest from daily_attendance_results r where not exists(select 1 from before_results b where b.id=r.id);
do $$begin if (select count(*) from before_results where is_current and actual_punch_count=0)<>25 then raise exception 'expected25 unmapped zero rows';end if;end$$;

update staffs set status='invited',staff_code='63' where id=:'target'::uuid;
update oms_person63_recovery.control set actor_id=:'actor'::uuid,enabled=true,expires_at=now()+interval '1 hour',function_hashes=(select jsonb_object_agg(proname,md5(pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace and proname in('calculate_schedule_day','calculate_schedule_day_base','calculate_schedule_day_part_time','calculate_schedule_day_pay_policy'));

update oms_person63_recovery.control set approved_catalog=(select jsonb_build_object('functions',d->'functions','triggers',d->'triggers') from (select oms_person63_recovery.snapshot() d)x);
savepoint negative_checks;
update oms_person63_recovery.control set enabled=false;
set local role authenticated;
do $$begin begin perform public.recover_attendance_person63(null);raise exception 'disabled accepted';exception when others then if sqlerrm<>'Recovery is disabled.' then raise;end if;end;end$$;
reset role;
rollback to negative_checks;
insert into attendance_period_locks(company_id,branch_id,week_start,locked_by) values(:'company'::uuid,:'branch'::uuid,'2026-09-28',:'actor'::uuid);
set local role authenticated;
do $$begin begin perform public.recover_attendance_person63(null);raise exception 'lock accepted';exception when others then if sqlerrm<>'Recovery has protected records.' then raise;end if;end;end$$;
reset role;
rollback to negative_checks;
create function pg_temp.fail_recovery() returns trigger language plpgsql as $$begin if new.work_date='2026-10-15' and new.calculation_revision>1 then raise exception 'synthetic mid-repair failure';end if; return new;end$$;
create trigger test_recovery_failure before insert on daily_attendance_results for each row execute function pg_temp.fail_recovery();
update oms_person63_recovery.control set approved_catalog=(select jsonb_build_object('functions',d->'functions','triggers',d->'triggers') from (select oms_person63_recovery.snapshot() d)x);

set local role authenticated;
select public.recover_attendance_person63(null)->>'snapshot' as broken_snapshot \gset
select set_config('test.broken_snapshot',:'broken_snapshot',true);
do $$begin begin perform public.recover_attendance_person63(current_setting('test.broken_snapshot'));raise exception 'injected failure missed';exception when others then if sqlerrm<>'synthetic mid-repair failure' then raise;end if;end;end$$;
reset role;
do $$begin
 if exists(select 1 from ngteco_person_mappings where person_id='63' and staff_id=current_setting('test.target')::uuid) or exists(select 1 from oms_person63_recovery.receipt) then raise exception 'partial mapping/receipt persisted';end if;
 if (select count(*) from daily_attendance_results r join scope using(work_date) where staff_id=current_setting('test.target')::uuid and is_current and actual_punch_count=0)<>25 then raise exception 'partial results persisted';end if;
end$$;
rollback to negative_checks;
set local role authenticated;
select public.recover_attendance_person63(null)->>'snapshot' as snapshot \gset
select set_config('test.snapshot',:'snapshot',true);
do $$begin
 begin perform public.recover_attendance_person63(repeat('0',32));raise exception 'unexpected stale success';exception when others then if sqlerrm<>'Recovery preflight changed.' then raise;end if;end;
end$$;
select public.recover_attendance_person63(:'snapshot');
select public.recover_attendance_person63(:'snapshot');
reset role;
do $$begin
 if (select count(*) from daily_attendance_results r join scope using(work_date) where staff_id=current_setting('test.target')::uuid and is_current and actual_punch_count=4)<>25 then raise exception 'punch mismatch';end if;
 if (select count(*) from oms_person63_recovery.receipt)<>1 then raise exception 'receipt mismatch';end if;
 if (select jsonb_array_length(before_state->'results') from oms_person63_recovery.receipt)<>25 then raise exception 'backup mismatch';end if;
 if (select count(*) from daily_attendance_results r join scope using(work_date) where staff_id=current_setting('test.target')::uuid)<>50 then raise exception 'retry added revisions';end if;
 if exists(select 1 from before_raw b full join (select id,md5(to_jsonb(e)::text) digest from attendance_raw_punch_events e) a using(id) where b.digest is distinct from a.digest) then raise exception 'raw changed';end if;
 if exists(select 1 from before_outside b join daily_attendance_results r using(id) where b.digest<>md5(to_jsonb(r)::text)) then raise exception 'outside changed';end if;
 if has_table_privilege('authenticated','oms_person63_recovery.receipt','SELECT') or has_function_privilege('service_role','public.recover_attendance_person63(text)','EXECUTE') then raise exception 'ACL leak';end if;
end$$;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA people_operations'),true);
set local role authenticated;
do $$begin begin perform public.recover_attendance_person63(null);raise exception 'wrong actor accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA super_admin'),true);
update oms_person63_recovery.control set restore_enabled=true,expires_at=now()+interval '1 hour';
select md5(after_state::text) as after_digest from oms_person63_recovery.receipt \gset
select set_config('test.after_digest',:'after_digest',true);
savepoint restore_negative;
update daily_attendance_results set review_status='reviewed' where staff_id=:'target'::uuid and is_current and work_date='2026-10-01';
set local role authenticated;
do $$begin begin perform public.restore_attendance_person63(current_setting('test.after_digest'));raise exception 'changed postimage accepted';exception when others then if sqlerrm<>'Restoration postimage changed.' then raise;end if;end;end$$;
reset role;
rollback to restore_negative;
set local role authenticated;
select public.restore_attendance_person63(:'after_digest');
select public.restore_attendance_person63(:'after_digest');
reset role;
do $$begin
 if (select count(*) from daily_attendance_results r join scope using(work_date) where staff_id=current_setting('test.target')::uuid and is_current and actual_punch_count=0)<>25 then raise exception 'restore failed';end if;
 if (select count(*) from daily_attendance_results r join scope using(work_date) where staff_id=current_setting('test.target')::uuid)<>50 then raise exception 'restore deleted history';end if;
 if exists(select 1 from ngteco_person_mappings where person_id='63' and staff_id=current_setting('test.target')::uuid and is_active) then raise exception 'mapping remains active';end if;
end$$;
select 'PASS fixed25, backup, stale guard, receipt replay, raw/outside unchanged, wrong actor denied, internal ACLs';
rollback;
