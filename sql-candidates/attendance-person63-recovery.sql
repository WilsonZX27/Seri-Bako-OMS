-- UNNUMBERED LOCAL CANDIDATE. Disabled until separately reviewed/installed/armed.
-- Do not reuse closed281. No role grants, global recalculation or auth impersonation.
begin;
create schema oms_person63_recovery;
revoke all on schema oms_person63_recovery from public,anon,authenticated,service_role;
create table oms_person63_recovery.control(
 id boolean primary key default true check(id), enabled boolean not null default false, restore_enabled boolean not null default false,
 actor_id uuid references public.staffs(id), expires_at timestamptz,
 approved_catalog jsonb,
 function_hashes jsonb not null default '{"calculate_schedule_day":"69158adcc739580106b2af1dc12847ed","calculate_schedule_day_base":"9a5b65c871c34c1213fa28aaa6e86c48","calculate_schedule_day_part_time":"cca451bf6258de76e89690adedef150c","calculate_schedule_day_pay_policy":"5a4742ee7d6ff689a1a8431d5411d6c5"}'
);
insert into oms_person63_recovery.control(id) values(true);
create table oms_person63_recovery.receipt(
 id boolean primary key default true check(id), actor_id uuid not null,
 completed_at timestamptz not null default now(), snapshot text not null,
 before_state jsonb not null, after_state jsonb not null, restored_at timestamptz, restore_actor uuid, restore_state jsonb
);
revoke all on all tables in schema oms_person63_recovery from public,anon,authenticated,service_role;

create function oms_person63_recovery.scope() returns table(work_date date,batch_id uuid)
language sql immutable set search_path=pg_catalog as $$
 select d::date,b::uuid from (values
 ('2026-10-01','d6ff61b1-076e-42ef-86cf-ff49aa3d60f2'),('2026-10-02','d6ff61b1-076e-42ef-86cf-ff49aa3d60f2'),('2026-10-03','d6ff61b1-076e-42ef-86cf-ff49aa3d60f2'),('2026-10-04','d6ff61b1-076e-42ef-86cf-ff49aa3d60f2'),
 ('2026-10-05','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),('2026-10-07','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),('2026-10-08','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),('2026-10-09','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),('2026-10-10','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),('2026-10-11','4e6c2ff9-cb09-4f37-a4ca-aae2b6c0a2ca'),
 ('2026-10-15','e55e4f4f-9ced-4462-a23b-822785576d96'),('2026-10-16','e55e4f4f-9ced-4462-a23b-822785576d96'),('2026-10-18','e55e4f4f-9ced-4462-a23b-822785576d96'),
 ('2026-10-20','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),('2026-10-21','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),('2026-10-22','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),('2026-10-23','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),('2026-10-24','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),('2026-10-25','34ffbb89-be58-4d74-b6ed-a8ab3a25cda5'),
 ('2026-10-27','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'),('2026-10-28','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'),('2026-10-29','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'),('2026-10-30','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'),('2026-10-31','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'),('2026-11-01','b7e77aa3-ed10-4a15-bfbd-26ac3a1e1822'))v(d,b)
$$;

create function oms_person63_recovery.snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c constant uuid:='3b104582-f8cb-4a4d-867f-b99e5ffc6486'; s constant uuid:='3e248456-89e6-4849-a53d-cf344e6bd587'; result jsonb; t text; rows jsonb;
begin
 result:=jsonb_build_object(
 'staff',(select jsonb_build_object('id',id,'company_id',company_id,'staff_code',staff_code,'status',status,'employment_type',employment_type,'deleted_at',deleted_at) from public.staffs where id=s and company_id=c),
 'mapping',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.ngteco_person_mappings x where company_id=c and (person_id='63' or staff_id=s)),'[]'),
 'fingerprint_policies',coalesce((select jsonb_agg(to_jsonb(x) order by effective_from) from public.staff_fingerprint_policies x where company_id=c and staff_id=s),'[]'),
 'results',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.daily_attendance_results x where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01'),'[]'),
 'exceptions',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from public.attendance_exceptions x join public.daily_attendance_results r on r.id=x.result_id where r.company_id=c and r.staff_id=s and r.work_date between '2026-10-01' and '2026-11-01'),'[]'),
 'assignments',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.shift_assignment_revisions x where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01'),'[]'),
 'weeks',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.schedule_weeks x where id in(select schedule_week_id from public.shift_assignment_revisions where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01')),'[]'),
 'raw',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.attendance_raw_punch_events x where company_id=c and person_id='63'),'[]'),
 'memberships',coalesce((select jsonb_agg(to_jsonb(x) order by batch_id,event_id,source_row_number) from public.attendance_import_batch_events x where event_id in(select id from public.attendance_raw_punch_events where company_id=c and person_id='63')),'[]'),
 'batches',coalesce((select jsonb_agg(to_jsonb(x) order by id) from public.attendance_import_batches x where id in(select batch_id from oms_person63_recovery.scope())),'[]'),
 'functions',(select jsonb_object_agg(proname,md5(pg_get_functiondef(oid))) from pg_proc where pronamespace='public'::regnamespace and proname in('calculate_schedule_day','calculate_schedule_day_base','calculate_schedule_day_part_time','calculate_schedule_day_pay_policy','attendance_retained_punch_indexes','paid_emergency_leave_day_proof','apply_paid_emergency_leave_day','apply_approved_unpaid_leave','upsert_ngteco_person_mapping','current_staff_id','current_staff_company_id','has_permission','has_any_permission','staff_requires_fingerprint','attestation_lock','attestation_invalidate','attestation_source','attestation_content_hash','attestation_calculation_hash')),
 'triggers',(select jsonb_agg(jsonb_build_object('definition',pg_get_triggerdef(oid),'function',pg_get_functiondef(tgfoid)) order by oid) from pg_trigger where not tgisinternal and tgrelid in('public.ngteco_person_mappings'::regclass,'public.daily_attendance_results'::regclass,'public.attendance_exceptions'::regclass)),
 'outside_exceptions',(select md5(coalesce(string_agg(to_jsonb(e)::text,'' order by e.id),'')) from public.attendance_exceptions e join public.daily_attendance_results r on r.id=e.result_id where r.company_id=c and r.staff_id=s and r.work_date not in(select work_date from oms_person63_recovery.scope())),
 'outside_results',(select md5(coalesce(string_agg(to_jsonb(x)::text,'' order by id),'')) from public.daily_attendance_results x where company_id=c and staff_id=s and work_date not in(select work_date from oms_person63_recovery.scope()))
 );
 foreach t in array array['ngteco_device_mappings','shift_templates','attendance_pay_rule_versions','public_holidays','public_holiday_branches','attendance_period_locks'] loop
 -- Holiday branch association has no company_id; capture only relevant holiday IDs.
 if t='public_holiday_branches' then
 select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') into rows from public.public_holiday_branches x where holiday_id in(select id from public.public_holidays where company_id=c);
 else execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]'') from public.%I x where company_id=$1',t) into rows using c; end if;
 result:=result||jsonb_build_object(t,rows);
 end loop;
 return result;
end $$;

create function oms_person63_recovery.lock_inputs() returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c constant uuid:='3b104582-f8cb-4a4d-867f-b99e5ffc6486'; s constant uuid:='3e248456-89e6-4849-a53d-cf344e6bd587'; actor uuid:=public.current_staff_id();
begin
 perform public.attestation_lock(s);
 -- Row locks only. Company FK anchor fences new company-scoped inserts, not other tenants.
 perform 1 from public.companies where id=c for update;
 perform 1 from public.staffs where id in(actor,s) order by id for update;
 perform 1 from public.staff_fingerprint_policies where company_id=c and staff_id=s for update;
 perform 1 from public.staff_roles where staff_id=actor for update;
 perform 1 from public.staff_permission_overrides where staff_id=actor for update;
 perform 1 from public.roles where id in(select role_id from public.staff_roles where staff_id=actor) for update;
 perform 1 from public.role_permissions where role_id in(select role_id from public.staff_roles where staff_id=actor) for update;
 perform 1 from public.permissions where permission_code in('attendance.map','attendance.import','attendance.adjust') for update;
 perform 1 from public.attendance_import_batches where id in(select batch_id from oms_person63_recovery.scope()) order by id for update;
 perform 1 from public.attendance_raw_punch_events where (company_id=c and person_id='63') or id in(select event_id from public.attendance_import_batch_events where batch_id in(select batch_id from oms_person63_recovery.scope())) order by id for update;
 perform 1 from public.attendance_import_batch_events where batch_id in(select batch_id from oms_person63_recovery.scope()) for update;
 perform 1 from public.shift_assignment_revisions where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01' order by id for update;
 perform 1 from public.schedule_weeks where id in(select schedule_week_id from public.shift_assignment_revisions where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01') for update;
 perform 1 from public.daily_attendance_results where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01' order by id for update;
 perform 1 from public.attendance_exceptions where result_id in(select id from public.daily_attendance_results where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01') for update;
 perform 1 from public.ngteco_person_mappings where company_id=c and (person_id='63' or staff_id=s) for update;
 perform 1 from public.ngteco_device_mappings where company_id=c for update;
 perform 1 from public.shift_templates where company_id=c for update;
 perform 1 from public.attendance_pay_rule_versions where company_id=c for update;
 perform 1 from public.public_holidays where company_id=c for update;
 perform 1 from public.public_holiday_branches where holiday_id in(select id from public.public_holidays where company_id=c) for update;
 perform 1 from public.attendance_period_locks where company_id=c and week_start between '2026-09-28' and '2026-11-02' for update;
 perform 1 from public.attendance_ot_claims where company_id=c and staff_id=s for update;
 perform 1 from public.comp_time_transactions where company_id=c and staff_id=s for update;
 perform 1 from public.attendance_ro_reservations where company_id=c and staff_id=s for update;
 perform 1 from public.daily_attendance_reports where company_id=c and staff_id=s for update;
 perform 1 from public.attendance_confirmations where company_id=c and staff_id=s for update;
 perform 1 from public.employee_payslips where company_id=c and staff_id=s for update;

end $$;

create function oms_person63_recovery.assert_unprotected() returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c constant uuid:='3b104582-f8cb-4a4d-867f-b99e5ffc6486'; s constant uuid:='3e248456-89e6-4849-a53d-cf344e6bd587';
begin
 if exists(select 1 from public.attendance_period_locks where company_id=c and unlocked_at is null and week_start between '2026-09-28' and '2026-11-02')
 or exists(select 1 from public.attendance_ot_claims where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01')
 or exists(select 1 from public.comp_time_transactions where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01')
 or exists(select 1 from public.attendance_ro_reservations where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01')
 or exists(select 1 from public.daily_attendance_reports where company_id=c and staff_id=s and work_date between '2026-10-01' and '2026-11-01')
 or exists(select 1 from public.attendance_confirmations where company_id=c and staff_id=s and period_start<='2026-11-01' and period_end>='2026-10-01') then raise exception 'Recovery has protected records.';end if;
end $$;

create function public.recover_attendance_person63(p_expected_snapshot text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public set statement_timeout='8s' as $$
declare c constant uuid:='3b104582-f8cb-4a4d-867f-b99e5ffc6486'; s constant uuid:='3e248456-89e6-4849-a53d-cf344e6bd587'; actor uuid:=public.current_staff_id(); gate oms_person63_recovery.control; receipt oms_person63_recovery.receipt; before_doc jsonb; after_doc jsonb; digest text; x record; n integer;
begin
 if auth.uid() is null or actor is null or public.current_staff_company_id() is distinct from c or public.has_permission('attendance.map') is not true or public.has_any_permission(array['attendance.import','attendance.adjust']) is not true then raise exception using errcode='42501',message='Recovery is not authorised.'; end if;
 perform set_config('lock_timeout','3s',true);
 if p_expected_snapshot is null then select * into gate from oms_person63_recovery.control where id;
 else select * into gate from oms_person63_recovery.control where id for update;end if;
 if gate.actor_id is distinct from actor then raise exception using errcode='42501',message='Recovery is not authorised.';end if;
 select * into receipt from oms_person63_recovery.receipt where id;
 if found then
 if receipt.restored_at is not null then return jsonb_build_object('status','restored','count',25);end if;
 if p_expected_snapshot is not null and p_expected_snapshot is distinct from receipt.snapshot then raise exception using errcode='P0001',message='Recovery preflight changed.';end if;
 return jsonb_build_object('status','completed','count',25,'completedAt',receipt.completed_at,'replayed',true,'afterSnapshot',md5(receipt.after_state::text));end if;
 if not gate.enabled or gate.expires_at is null or gate.expires_at<=clock_timestamp() then raise exception using errcode='P0001',message='Recovery is disabled.';end if;
 perform set_config('lock_timeout','3s',true);
 if p_expected_snapshot is not null then perform oms_person63_recovery.lock_inputs();end if;
 if public.current_staff_id() is distinct from actor or public.current_staff_company_id() is distinct from c or public.has_permission('attendance.map') is not true or public.has_any_permission(array['attendance.import','attendance.adjust']) is not true then raise exception using errcode='42501',message='Recovery is not authorised.';end if;
 if not exists(select 1 from public.staffs where id=s and company_id=c and staff_code='63' and status='invited' and deleted_at is null) then raise exception 'Recovery preflight changed.';end if;
 if exists(select 1 from public.ngteco_person_mappings where company_id=c and (person_id='63' or staff_id=s)) then raise exception 'Recovery preflight changed.';end if;
 if (select count(*) from public.daily_attendance_results where company_id=c and staff_id=s and is_current and work_date between '2026-10-01' and '2026-11-01')<>25 then raise exception 'Recovery preflight changed.';end if;
 for x in select * from oms_person63_recovery.scope() order by work_date loop
 if p_expected_snapshot is not null then perform pg_advisory_xact_lock(hashtextextended(c::text||':'||s::text||':'||x.work_date::text,0));end if;
 select count(*) into n from public.daily_attendance_results r join public.shift_assignment_revisions a on a.id=r.assignment_id join public.schedule_weeks w on w.id=a.schedule_week_id where r.company_id=c and r.staff_id=s and r.work_date=x.work_date and r.import_batch_id=x.batch_id and r.is_current and r.review_status='pending' and r.actual_punch_count=0 and a.company_id=c and a.staff_id=s and a.work_date=x.work_date and a.is_current and a.assignment_kind='shift' and w.status in('draft','submitted');
 if n<>1 or (select count(*) from public.shift_assignment_revisions where company_id=c and staff_id=s and work_date=x.work_date and is_current)<>1 then raise exception 'Recovery preflight changed.';end if;
 end loop;
 if (select count(*) from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id where a.company_id=c and a.staff_id=s and a.is_current and a.work_date in(select work_date from oms_person63_recovery.scope()) and w.status='draft')<>19 or (select count(*) from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id where a.company_id=c and a.staff_id=s and a.is_current and a.work_date in(select work_date from oms_person63_recovery.scope()) and w.status='submitted')<>6 then raise exception 'Recovery preflight changed.';end if;
 if (select count(*) from public.attendance_raw_punch_events where company_id=c and person_id='63' and local_timestamp>='2026-10-01' and local_timestamp<'2026-11-02')<>115 then raise exception 'Recovery raw evidence changed.';end if;
 if exists(select 1 from public.shift_assignment_revisions where company_id=c and staff_id=s and is_current and work_date in('2026-10-13','2026-10-17')) then raise exception 'Recovery preflight changed.';end if;
 perform oms_person63_recovery.assert_unprotected();
 before_doc:=oms_person63_recovery.snapshot();
 if gate.approved_catalog is distinct from jsonb_build_object('functions',before_doc->'functions','triggers',before_doc->'triggers') then raise exception 'Recovery catalog is not reviewed.';end if;
 if not (before_doc->'functions' @> gate.function_hashes) then raise exception 'Recovery functions changed.';end if;
 digest:=md5(before_doc::text);
 if p_expected_snapshot is null then return jsonb_build_object('status','ready','count',25,'snapshot',digest);end if;
 if p_expected_snapshot is distinct from digest then raise exception 'Recovery preflight changed.';end if;
 if gate.expires_at<=clock_timestamp() then raise exception 'Recovery is disabled.';end if;
 perform public.upsert_ngteco_person_mapping('63',s,true);
 for x in select * from oms_person63_recovery.scope() order by work_date loop
 n:=public.calculate_schedule_day(x.batch_id,s,x.work_date);
 if n<>1 then raise exception 'Recovery result count changed.';end if;
 end loop;
 update public.daily_attendance_results r set monthly_missing_punch_count=m.total from
 (select date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total from public.daily_attendance_results where company_id=c and staff_id=s and is_current group by date_trunc('month',work_date)::date) m
 where r.company_id=c and r.staff_id=s and r.is_current and r.work_date in(select work_date from oms_person63_recovery.scope()) and date_trunc('month',r.work_date)::date=m.month_start;
 set constraints all immediate;
 after_doc:=oms_person63_recovery.snapshot();
 if (before_doc - array['results','exceptions','mapping']) is distinct from (after_doc - array['results','exceptions','mapping']) then raise exception 'Recovery changed protected inputs.';end if;
 if before_doc->'raw' is distinct from after_doc->'raw' or before_doc->'memberships' is distinct from after_doc->'memberships' or before_doc->'assignments' is distinct from after_doc->'assignments' or before_doc->'weeks' is distinct from after_doc->'weeks' or before_doc->'outside_results' is distinct from after_doc->'outside_results' or before_doc->'outside_exceptions' is distinct from after_doc->'outside_exceptions' then raise exception 'Recovery changed unrelated evidence.';end if;
 if (select count(*) from public.daily_attendance_results where company_id=c and staff_id=s and is_current and work_date in(select work_date from oms_person63_recovery.scope()) and actual_punch_count>0 and review_status='pending')<>25 then raise exception 'Recovery punch verification failed.';end if;
 if exists(select 1 from jsonb_array_elements(before_doc->'results') old where not exists(select 1 from public.daily_attendance_results r where r.id=(old->>'id')::uuid and not r.is_current and to_jsonb(r)-'is_current'=old-'is_current')) then raise exception 'Recovery history verification failed.';end if;
 perform oms_person63_recovery.assert_unprotected();
 if jsonb_array_length(after_doc->'results')<>jsonb_array_length(before_doc->'results')+25 or jsonb_array_length(after_doc->'mapping')<>1 then raise exception 'Recovery cardinality verification failed.';end if;
 if exists(select 1 from jsonb_array_elements(before_doc->'exceptions') old where not exists(select 1 from public.attendance_exceptions e where e.id=(old->>'id')::uuid and to_jsonb(e)=old)) then raise exception 'Recovery exception history changed.';end if;
 insert into oms_person63_recovery.receipt(id,actor_id,snapshot,before_state,after_state) values(true,actor,digest,before_doc,after_doc);
 update oms_person63_recovery.control set enabled=false where id;
 return jsonb_build_object('status','completed','count',25,'replayed',false);
end $$;

-- Separate default-off, explicitly re-armed compensation; never deletes raw/history.
create function public.restore_attendance_person63(p_expected_snapshot text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public set statement_timeout='8s' as $$
declare c constant uuid:='3b104582-f8cb-4a4d-867f-b99e5ffc6486'; s constant uuid:='3e248456-89e6-4849-a53d-cf344e6bd587'; actor uuid:=public.current_staff_id(); gate oms_person63_recovery.control; receipt oms_person63_recovery.receipt; live jsonb; old jsonb;
begin
 if auth.uid() is null or actor is null or public.current_staff_company_id() is distinct from c or public.has_permission('attendance.map') is not true or public.has_any_permission(array['attendance.import','attendance.adjust']) is not true then raise exception using errcode='42501',message='Recovery is not authorised.';end if;
 perform set_config('lock_timeout','3s',true);
 select * into gate from oms_person63_recovery.control where id for update;
 if gate.actor_id is distinct from actor then raise exception using errcode='42501',message='Recovery is not authorised.';end if;
 select * into receipt from oms_person63_recovery.receipt where id for update;
 if not found then raise exception 'Recovery receipt is missing.';end if;
 if receipt.restored_at is not null then return jsonb_build_object('status','restored','replayed',true);end if;
 if not gate.restore_enabled or gate.expires_at is null or gate.expires_at<=clock_timestamp() then raise exception 'Restoration is disabled.';end if;
 perform oms_person63_recovery.lock_inputs();
 if public.current_staff_id() is distinct from actor or public.current_staff_company_id() is distinct from c or public.has_permission('attendance.map') is not true or public.has_any_permission(array['attendance.import','attendance.adjust']) is not true then raise exception using errcode='42501',message='Recovery is not authorised.';end if;
 perform oms_person63_recovery.assert_unprotected();
 live:=oms_person63_recovery.snapshot();
 if live is distinct from receipt.after_state or p_expected_snapshot is distinct from md5(receipt.after_state::text) then raise exception 'Restoration postimage changed.';end if;
 if gate.expires_at<=clock_timestamp() then raise exception 'Restoration is disabled.';end if;
 update public.daily_attendance_results set is_current=false where company_id=c and staff_id=s and is_current and work_date in(select work_date from oms_person63_recovery.scope());
 for old in select value from jsonb_array_elements(receipt.before_state->'results') loop
 if (old->>'is_current')::boolean then update public.daily_attendance_results set is_current=true where id=(old->>'id')::uuid;end if;
 end loop;
 update public.ngteco_person_mappings set is_active=false where company_id=c and person_id='63' and staff_id=s;
 if exists(select 1 from jsonb_array_elements(receipt.before_state->'results') x where not exists(select 1 from public.daily_attendance_results r where r.id=(x->>'id')::uuid and to_jsonb(r)=x)) then raise exception 'Restoration verification failed.';end if;
 set constraints all immediate;
 live:=oms_person63_recovery.snapshot();
 if (live-array['results','exceptions','mapping']) is distinct from (receipt.after_state-array['results','exceptions','mapping']) then raise exception 'Restoration changed protected inputs.';end if;
 perform oms_person63_recovery.assert_unprotected();
 update oms_person63_recovery.receipt set restored_at=now(),restore_actor=actor,restore_state=live where id;
 update oms_person63_recovery.control set enabled=false,restore_enabled=false where id;
 return jsonb_build_object('status','restored','count',25,'replayed',false);
end $$;
revoke all on function public.restore_attendance_person63(text) from public,anon,service_role;
grant execute on function public.restore_attendance_person63(text) to authenticated;

revoke all on all functions in schema oms_person63_recovery from public,anon,authenticated,service_role;
revoke all on function public.recover_attendance_person63(text) from public,anon,service_role;
grant execute on function public.recover_attendance_person63(text) to authenticated;
commit;
