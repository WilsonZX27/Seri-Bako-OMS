-- Disposable synthetic release fixture only; all test data rolls back.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub',s.auth_user_id::text,true),set_config('test.company',s.company_id::text,true),
 set_config('test.owner',s.id::text,true),set_config('test.staff',staff.id::text,true),set_config('test.branch',sb.branch_id::text,true)
from public.staffs s join auth.users u on u.id=s.auth_user_id
join public.staffs staff on staff.company_id=s.company_id and staff.full_name='Synthetic staff'
join public.staff_branches sb on sb.staff_id=staff.id
where u.email like 'release-%' and s.full_name='Synthetic owner' limit 1;
-- Imported punches precede the roster. Two uploads include the same event;
-- immutable event IDs must be deduplicated across both uploads.
insert into public.attendance_import_batches(id,company_id,parser_profile,week_start,file_name,file_hash,status,uploader_staff_id,finalised_at)
values('a1111111-1111-4111-8111-111111111111',current_setting('test.company')::uuid,'view_attendance_punch','2026-10-19','synthetic-first.xlsx',repeat('a',64),'finalised',current_setting('test.owner')::uuid,now()-interval '1 hour'),
('a2222222-2222-4222-8222-222222222222',current_setting('test.company')::uuid,'view_attendance_punch','2026-10-26','synthetic-second.xlsx',repeat('b',64),'finalised',current_setting('test.owner')::uuid,now());
insert into public.ngteco_person_mappings(company_id,person_id,staff_id,created_by)
values(current_setting('test.company')::uuid,'schedule-refresh-synthetic',current_setting('test.staff')::uuid,current_setting('test.owner')::uuid);
insert into public.attendance_raw_punch_events(id,company_id,person_id,occurred_at,local_timestamp,timezone_offset,source_code,punch_type,event_fingerprint,raw_row)
values('a3333333-3333-4333-8333-333333333333',current_setting('test.company')::uuid,'schedule-refresh-synthetic','2026-10-25 20:00+08','2026-10-25 20:00','+08:00','SYNTHETIC','in','schedule-refresh-in','{}'),
('a4444444-4444-4444-8444-444444444444',current_setting('test.company')::uuid,'schedule-refresh-synthetic','2026-10-26 05:00+08','2026-10-26 05:00','+08:00','SYNTHETIC','out','schedule-refresh-out','{}');
insert into public.attendance_import_batch_events(batch_id,event_id,source_row_number,disposition)
values('a1111111-1111-4111-8111-111111111111','a3333333-3333-4333-8333-333333333333',1,'inserted'),
('a2222222-2222-4222-8222-222222222222','a3333333-3333-4333-8333-333333333333',1,'duplicate'),
('a2222222-2222-4222-8222-222222222222','a4444444-4444-4444-8444-444444444444',2,'inserted');
-- A sentinel outside the affected day must remain byte-for-byte identical.
insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,recognised_paid_seconds)
values(current_setting('test.company')::uuid,current_setting('test.staff')::uuid,current_setting('test.branch')::uuid,'2026-10-18',123);
select set_config('test.sentinel',(select to_jsonb(r)::text from public.daily_attendance_results r where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-18' and is_current),true);
set local role authenticated;
do $$
declare payload jsonb; outcome jsonb; result public.daily_attendance_results; total integer;
begin
 payload:=jsonb_build_array(jsonb_build_object('branch_id',current_setting('test.branch'),'assignments',jsonb_build_array(jsonb_build_object('staff_id',current_setting('test.staff'),'work_date','2026-10-25','assignment_kind','shift','shift_template_id',null,'custom_start','20:00','custom_end','05:00','custom_crosses_midnight',true,'custom_break_seconds',0,'custom_maximum_recognised_seconds',32400,'custom_reason','Synthetic overnight test'))));
 perform public.append_schedule_workbook_drafts('2026-10-19','synthetic.xlsx',repeat('c',64),payload,0,'{}',repeat('d',64));
 outcome:=public.refresh_schedule_attendance('2026-10-19',current_setting('test.branch')::uuid);
 if (outcome->>'calculated')::integer<>1 then raise exception 'Calculation failed: %',outcome; end if;
 select * into result from public.daily_attendance_results where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25' and is_current;
 if result.actual_first_in<>'2026-10-25 20:00+08'::timestamptz or result.actual_last_out<>'2026-10-26 05:00+08'::timestamptz then raise exception 'Cross-midnight matching lost a punch'; end if;
 if result.actual_punch_count<>2 then raise exception 'Repeated upload duplicated evidence'; end if;
 if result.calculation->>'schedule_source_hash' is null then raise exception 'Missing source version contract'; end if;
 if (select to_jsonb(r) from public.daily_attendance_results r where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-18' and is_current) is distinct from current_setting('test.sentinel')::jsonb then raise exception 'Unrelated result changed'; end if;
 select count(*) into total from public.daily_attendance_results where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25';
 perform public.refresh_schedule_attendance('2026-10-19',current_setting('test.branch')::uuid);
 if (select count(*) from public.daily_attendance_results where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25')<>total then raise exception 'Unchanged refresh created duplicate revisions'; end if;
 raise notice 'PASS: punches-before-roster, overnight union/dedupe, scoped result, idempotent refresh';
end $$;
reset role;
update public.daily_attendance_results set review_status='reviewed' where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25' and is_current;
select set_config('test.reviewed',(select to_jsonb(r)::text from public.daily_attendance_results r where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25' and is_current),true);
update public.shift_assignment_revisions set custom_start='20:30' where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25' and is_current;
set local role authenticated;
do $$
begin
 perform public.refresh_schedule_attendance('2026-10-19',current_setting('test.branch')::uuid);
 if (select status from public.attendance_schedule_refresh where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25')<>'needs_review' then raise exception 'Reviewed day was not flagged'; end if;
 if (select to_jsonb(r) from public.daily_attendance_results r where staff_id=current_setting('test.staff')::uuid and work_date='2026-10-25' and is_current) is distinct from current_setting('test.reviewed')::jsonb then raise exception 'Reviewed result was changed'; end if;
 raise notice 'PASS: schedule change invalidates revision without rewriting reviewed result';
end $$;
rollback;
