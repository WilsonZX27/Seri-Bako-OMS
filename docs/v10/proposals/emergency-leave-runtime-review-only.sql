-- REVIEW ONLY; shared target nnvdsaftiwpqkekjfrgc. No historical row or payroll rewrite.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$ begin
 if to_regprocedure('public.save_schedule_week_before_ro(uuid,date,jsonb)') is null or md5(pg_get_functiondef(to_regprocedure('public.save_schedule_week_before_ro(uuid,date,jsonb)'))) is distinct from '9851187c0405d464833202bc6846a45f' then raise exception 'EL preflight function drift: save_schedule_week_before_ro'; end if;
 if to_regprocedure('public.append_schedule_workbook_rows(uuid,date,jsonb)') is null or md5(pg_get_functiondef(to_regprocedure('public.append_schedule_workbook_rows(uuid,date,jsonb)'))) is distinct from '16289a3561a6ed131ac1f134bc548bca' then raise exception 'EL preflight function drift: append_schedule_workbook_rows'; end if;
 if to_regprocedure('public.reconcile_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text)') is null or md5(pg_get_functiondef(to_regprocedure('public.reconcile_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text)'))) is distinct from '52b8284e271dfbbe5d32a0a79ae655b9' then raise exception 'EL preflight function drift: reconcile_schedule_workbook_drafts'; end if;
 if to_regprocedure('public.validate_schedule_week(uuid)') is null or md5(pg_get_functiondef(to_regprocedure('public.validate_schedule_week(uuid)'))) is distinct from 'f1789c2d278c0bf3744b82b4bd95579b' then raise exception 'EL preflight function drift: validate_schedule_week'; end if;
 if to_regprocedure('public.decide_daily_attendance_report(uuid,text,text,text)') is null or md5(pg_get_functiondef(to_regprocedure('public.decide_daily_attendance_report(uuid,text,text,text)'))) is distinct from 'e8d4dc5bb8921c680ae5be21271fba5d' then raise exception 'EL preflight function drift: decide_daily_attendance_report'; end if;
 if to_regprocedure('public.calculate_schedule_day(uuid,uuid,date)') is null or md5(pg_get_functiondef(to_regprocedure('public.calculate_schedule_day(uuid,uuid,date)'))) is distinct from '7e1f6786b9fc9f34f384064ac8a88fb4' then raise exception 'EL preflight function drift: calculate_schedule_day'; end if;
 if to_regprocedure('public.refresh_schedule_attendance(date,uuid)') is null or md5(pg_get_functiondef(to_regprocedure('public.refresh_schedule_attendance(date,uuid)'))) is distinct from '5cfbb14931ece536b9b5ae2372072c1c' then raise exception 'EL preflight function drift: refresh_schedule_attendance'; end if;
 if to_regprocedure('public.save_employee_payslip(uuid,jsonb)') is null or md5(pg_get_functiondef(to_regprocedure('public.save_employee_payslip(uuid,jsonb)'))) is distinct from 'd2acca71fad54a4246fa33c4b7b51206' then raise exception 'EL preflight function drift: save_employee_payslip'; end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.shift_assignment_revisions'::regclass and conname='shift_assignment_revisions_assignment_kind_check') is distinct from $check$CHECK ((assignment_kind = ANY (ARRAY['shift'::text, 'off'::text, 'ph'::text, 'al'::text, 'mc'::text, 'upl'::text, 'ro'::text, 'oil'::text])))$check$ then raise exception 'EL assignment constraint drift'; end if;
end $guard$;
create or replace function public.schedule_leave_capabilities() returns jsonb language sql stable security invoker set search_path=pg_catalog as $$select jsonb_build_object('revision',1,'paid_emergency_leave',true)$$;
revoke all on function public.schedule_leave_capabilities() from public,anon;
grant execute on function public.schedule_leave_capabilities() to authenticated;
alter table public.shift_assignment_revisions drop constraint shift_assignment_revisions_assignment_kind_check;
alter table public.shift_assignment_revisions add constraint shift_assignment_revisions_assignment_kind_check check(assignment_kind in ('shift','off','ph','al','mc','upl','ro','oil','el'));
create or replace function public.paid_emergency_leave_day_proof(p_staff uuid,p_date date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare a public.shift_assignment_revisions; report_id uuid; company uuid:=public.current_staff_company_id(); n integer;
begin
 select count(*) into n from public.shift_assignment_revisions x join public.schedule_weeks w on w.id=x.schedule_week_id
 where x.company_id=company and x.staff_id=p_staff and x.work_date=p_date and x.is_current and w.status in ('published','locked');
 if n<>1 then return null; end if;
 select x.* into a from public.shift_assignment_revisions x join public.schedule_weeks w on w.id=x.schedule_week_id
 where x.company_id=company and x.staff_id=p_staff and x.work_date=p_date and x.is_current and w.status in ('published','locked');
 if a.assignment_kind not in ('shift','el') then return null; end if;
 if exists(select 1 from public.daily_attendance_reports r where r.company_id=company and r.staff_id=p_staff and r.work_date=p_date and r.status='approved' and r.report_type='unpaid_leave') then
  if a.assignment_kind='el' or exists(select 1 from public.daily_attendance_reports r where r.company_id=company and r.assignment_id=a.id and r.status='approved' and r.report_type='emergency_leave') then raise exception 'Emergency Leave conflicts with approved unpaid leave. Review the source.'; end if;
  return null;
 end if;
 if a.assignment_kind='el' then return jsonb_build_object('version',1,'source','published_schedule','assignment_id',a.id,'company_id',company,'staff_id',p_staff,'branch_id',a.branch_id,'work_date',p_date); end if;
 select r.id into report_id from public.daily_attendance_reports r where r.company_id=company and r.assignment_id=a.id and r.staff_id=p_staff and r.work_date=p_date and r.status='approved' and r.report_type='emergency_leave' order by r.decided_at desc,r.id limit 1;
 if report_id is null then return null; end if;
 return jsonb_build_object('version',1,'source','approved_report','report_id',report_id,'assignment_id',a.id,'company_id',company,'staff_id',p_staff,'branch_id',a.branch_id,'work_date',p_date);
end $$;
revoke all on function public.paid_emergency_leave_day_proof(uuid,date) from public,anon,authenticated;

create or replace function public.apply_paid_emergency_leave_day(p_staff uuid,p_date date,p_batch uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare proof jsonb; prior public.daily_attendance_results; state jsonb; new_result public.daily_attendance_results; job public.attendance_schedule_refresh;
 company uuid:=public.current_staff_company_id(); destination uuid; revision integer; points jsonb; conflict boolean; kept text[];
begin
 if not public.has_any_permission(array['attendance.import','attendance.adjust','attendance.report.approve']) then raise exception 'Emergency Leave calculation is not authorised.' using errcode='42501'; end if;
 perform public.attestation_lock(p_staff);
 perform pg_advisory_xact_lock(hashtextextended(company::text||':'||p_staff::text||':'||p_date::text,0));
 proof:=public.paid_emergency_leave_day_proof(p_staff,p_date); if proof is null then return null; end if;
 destination:=(proof->>'branch_id')::uuid;
 if not public.can_access_company_branch(company,destination) then raise exception 'Emergency Leave branch is unavailable.' using errcode='42501'; end if;
 if public.attendance_payroll_locked(company,p_staff,p_date) or exists(select 1 from public.attendance_period_locks l where l.company_id=company and l.week_start=date_trunc('week',p_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=destination)) then raise exception 'Attendance or payroll period is locked.'; end if;
 select * into prior from public.daily_attendance_results where company_id=company and staff_id=p_staff and work_date=p_date and is_current for update;
 if prior.id is not null and prior.branch_id<>destination then raise exception 'Emergency Leave source branch changed. Review the source.'; end if;
 if prior.id is not null and prior.review_status='locked' then raise exception 'Attendance result is locked.'; end if;
 select * into job from public.attendance_schedule_refresh where company_id=company and staff_id=p_staff and work_date=p_date for update;
 if prior.id is not null and prior.calculation->'emergency_leave_policy'=proof and (job.staff_id is null or (prior.calculation->>'schedule_source_revision'=job.source_revision::text and prior.calculation->>'schedule_source_hash'=job.source_hash)) then return prior.id; end if;
 points:=prior.calculation->'punches';
 if points is null or jsonb_typeof(points)<>'array' or jsonb_array_length(points)=0 then
  select coalesce(jsonb_agg(e.occurred_at::text order by e.occurred_at,e.id),'[]'::jsonb) into points from public.attendance_raw_punch_events e join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=p_staff and pm.is_active where e.company_id=company and e.local_timestamp::date=p_date;
 end if;
 conflict:=jsonb_array_length(points)>0 or coalesce(prior.worked_seconds,0)>0 or coalesce(prior.overtime_seconds,0)>0 or coalesce(prior.overtime_candidate_seconds,0)>0;
 kept:=coalesce(prior.statuses,'{}'::text[]);
 if not conflict then select coalesce(array_agg(flag),'{}'::text[]) into kept from unnest(kept) flag where flag not in ('normal','missing_punches','missing_check_in','missing_check_out','missing_break_punch','odd_punch_count','late','early_leave'); end if;
 select coalesce(array_agg(distinct flag),'{}'::text[]) into kept from unnest(kept||array['emergency_leave','el_paid']||case when conflict then array['el_evidence_conflict'] else '{}'::text[] end) flag;
 select coalesce(max(calculation_revision),0)+1 into revision from public.daily_attendance_results where company_id=company and staff_id=p_staff and work_date=p_date;
 state:=coalesce(to_jsonb(prior),'{}'::jsonb)||jsonb_build_object('id',gen_random_uuid(),'company_id',company,'staff_id',p_staff,'branch_id',destination,'work_date',p_date,'assignment_id',(proof->>'assignment_id')::uuid,'import_batch_id',coalesce(prior.import_batch_id,p_batch),'calculation_revision',revision,'created_at',now(),'is_current',true,
  'raw_work_seconds',coalesce(prior.raw_work_seconds,0),'recognised_paid_seconds',coalesce(prior.recognised_paid_seconds,0),'break_seconds',coalesce(prior.break_seconds,0),'late_seconds',coalesce(prior.late_seconds,0),'early_leave_seconds',coalesce(prior.early_leave_seconds,0),'pre_shift_seconds',coalesce(prior.pre_shift_seconds,0),'post_shift_seconds',coalesce(prior.post_shift_seconds,0),'overtime_candidate_seconds',coalesce(prior.overtime_candidate_seconds,0),
  'statuses',kept,'review_status',case when conflict then 'pending' else 'adjusted' end,
  'actual_punch_count',jsonb_array_length(points),'expected_punch_count',case when proof->>'source'='published_schedule' then 0 else prior.expected_punch_count end,'missing_punch_count',case when not conflict then 0 else prior.missing_punch_count end,
  'calculation',coalesce(prior.calculation,'{}'::jsonb)||jsonb_build_object('emergency_leave_policy',proof,'short_hours_seconds',0,'deductible_short_hours_seconds',0,'punches',points,'schedule_source_revision',job.source_revision,'schedule_source_hash',job.source_hash,'no_inferred_work_hours',true));
 if prior.id is not null then update public.daily_attendance_results set is_current=false where id=prior.id; end if;
 insert into public.daily_attendance_results select (jsonb_populate_record(null::public.daily_attendance_results,state)).* returning * into new_result;
 insert into public.attendance_adjustments(company_id,result_id,actor_staff_id,reason,before_state,after_state) values(company,new_result.id,public.current_staff_id(),'Paid Emergency Leave policy; no work hours inferred',coalesce(to_jsonb(prior),'{}'::jsonb),to_jsonb(new_result));
 if job.staff_id is not null then update public.attendance_schedule_refresh set status=case when conflict then 'needs_review' else 'ready' end,calculated_revision=case when conflict then calculated_revision else source_revision end,error_code=case when conflict then 'el_evidence_conflict' else null end,updated_at=now() where company_id=company and staff_id=p_staff and work_date=p_date; end if;
 return new_result.id;
end $$;
revoke all on function public.apply_paid_emergency_leave_day(uuid,date,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_schedule_week_before_ro(p_branch_id uuid, p_week_start date, p_assignments jsonb)
 RETURNS schedule_weeks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); w public.schedule_weeks;
 item jsonb; previous public.shift_assignment_revisions; next_revision integer; target_staff uuid; target_date date;
 target_kind text; template_id uuid; custom_start time; custom_end time; custom_break integer; custom_cap integer; non_standard boolean;
 cleared_count integer:=0;
begin
 if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then raise exception 'Schedule draft is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then raise exception 'Invalid schedule week payload.'; end if;
 select * into w from public.schedule_weeks where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1 for update;
 if w.id is null then insert into public.schedule_weeks(company_id,branch_id,week_start,created_by) values(company,p_branch_id,p_week_start,actor) returning * into w;
 elsif w.status not in ('draft','returned','rejected','amendment_pending') or w.locked_at is not null then raise exception 'This schedule week is not editable.'; end if;
 for item in select value from jsonb_array_elements(p_assignments) loop
  target_staff:=(item->>'staff_id')::uuid; target_date:=(item->>'work_date')::date; target_kind:=lower(item->>'assignment_kind'); template_id:=nullif(item->>'shift_template_id','')::uuid;
  custom_start:=nullif(item->>'custom_start','')::time; custom_end:=nullif(item->>'custom_end','')::time;
  custom_break:=nullif(item->>'custom_break_seconds','')::integer; custom_cap:=nullif(item->>'custom_maximum_recognised_seconds','')::integer;
  if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','ph','al','mc','upl','ro','oil','el') then raise exception 'Invalid assignment row.'; end if;
  if not public.is_staff_schedule_eligible(target_staff,target_date) then raise exception 'Staff is not eligible for outlet scheduling.'; end if;
  if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
  if target_kind='el' then
   if not coalesce((public.schedule_leave_capabilities()->>'paid_emergency_leave')::boolean,false) then raise exception 'Paid Emergency Leave creation is disabled.'; end if;
   if template_id is not null or custom_start is not null or custom_end is not null or custom_break is not null or custom_cap is not null or nullif(item->>'ro_minutes','') is not null then raise exception 'EL cannot carry working times, paid-work caps or RO redemption.'; end if;
  end if;
  if target_kind='shift' and template_id is null then
   if custom_start is null or custom_end is null or nullif(trim(item->>'custom_reason'),'') is null or coalesce(custom_break,-1)<0 or coalesce(custom_cap,0)<=0 then raise exception 'Direct working times, break, paid cap and reason are required.'; end if;
   non_standard:=extract(minute from custom_start)::integer%30<>0 or extract(second from custom_start)<>0 or extract(minute from custom_end)::integer%30<>0 or extract(second from custom_end)<>0;
   if non_standard and not public.has_permission('shift_template.non_standard') then raise exception 'Non-standard working times require Owner authority.'; end if;
  end if;
  select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date order by revision desc limit 1 for update;
  next_revision:=coalesce(previous.revision,0)+1;
  if previous.id is not null and previous.is_current then update public.shift_assignment_revisions set is_current=false where id=previous.id; end if;
  insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by)
  values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,custom_start,custom_end,coalesce((item->>'custom_crosses_midnight')::boolean,false),custom_break,custom_cap,nullif(trim(item->>'custom_reason'),''),next_revision,
   coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',custom_start,'planned_end',custom_end,'crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',custom_break,'maximum_recognised_seconds',custom_cap,'grace_seconds',0,'match_before_seconds',14400,'match_after_seconds',14400,'overtime_rule',jsonb_build_object('mode','approved_only','threshold_seconds',0,'maximum_seconds',0,'rounding_minutes',1))),previous.id,actor);
 end loop;
 update public.shift_assignment_revisions current_assignment set is_current=false
 where current_assignment.schedule_week_id=w.id and current_assignment.is_current
   and not exists(select 1 from jsonb_array_elements(p_assignments) payload where (payload->>'staff_id')::uuid=current_assignment.staff_id and (payload->>'work_date')::date=current_assignment.work_date);
 get diagnostics cleared_count=row_count;
 if cleared_count>0 then
  insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state)
  values(company,w.id,'draft_clear',w.status,w.status,actor,format('%s schedule assignment(s) cleared.',cleared_count),jsonb_build_object('cleared_count',cleared_count),jsonb_build_object('current_assignment_count',jsonb_array_length(p_assignments)));
 end if;
 update public.schedule_weeks set updated_at=now() where id=w.id returning * into w; return w;
end $function$;

CREATE OR REPLACE FUNCTION public.append_schedule_workbook_rows(p_branch_id uuid, p_week_start date, p_assignments jsonb)
 RETURNS schedule_weeks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); w public.schedule_weeks;
 item jsonb; previous public.shift_assignment_revisions; next_revision integer; target_staff uuid; target_date date;
 target_kind text; template_id uuid; custom_start time; custom_end time; custom_break integer; custom_cap integer; non_standard boolean;

begin
 if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then raise exception 'Schedule draft is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then raise exception 'Invalid schedule week payload.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 select * into w from public.schedule_weeks where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1 for update;
 if w.id is null then insert into public.schedule_weeks(company_id,branch_id,week_start,created_by) values(company,p_branch_id,p_week_start,actor) returning * into w;
 elsif w.status not in ('draft','returned','rejected','amendment_pending') or w.locked_at is not null then raise exception 'This schedule week is not editable.'; end if;
 for item in select value from jsonb_array_elements(p_assignments) loop
  target_staff:=(item->>'staff_id')::uuid; target_date:=(item->>'work_date')::date; target_kind:=lower(item->>'assignment_kind'); template_id:=nullif(item->>'shift_template_id','')::uuid;
  custom_start:=nullif(item->>'custom_start','')::time; custom_end:=nullif(item->>'custom_end','')::time;
  custom_break:=nullif(item->>'custom_break_seconds','')::integer; custom_cap:=nullif(item->>'custom_maximum_recognised_seconds','')::integer;
  if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','ph','al','mc','upl','ro','oil','el') then raise exception 'Invalid assignment row.'; end if;
  if not exists(select 1 from public.staffs s where s.id=target_staff and s.company_id=company) then raise exception 'Employee is outside this company catalogue.'; end if;
  if not public.is_staff_schedule_eligible(target_staff,target_date) then raise exception 'Staff is not eligible for outlet scheduling.'; end if;
  if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
  if target_kind='el' then
   if not coalesce((public.schedule_leave_capabilities()->>'paid_emergency_leave')::boolean,false) then raise exception 'Paid Emergency Leave creation is disabled.'; end if;
   if template_id is not null or custom_start is not null or custom_end is not null or custom_break is not null or custom_cap is not null or nullif(item->>'ro_minutes','') is not null then raise exception 'EL cannot carry working times, paid-work caps or RO redemption.'; end if;
  end if;
  if target_kind='shift' and template_id is null then
   if custom_start is null or custom_end is null or nullif(trim(item->>'custom_reason'),'') is null or coalesce(custom_break,-1)<0 or coalesce(custom_cap,0)<=0 then raise exception 'Direct working times, break, paid cap and reason are required.'; end if;
   non_standard:=extract(minute from custom_start)::integer%30<>0 or extract(second from custom_start)<>0 or extract(minute from custom_end)::integer%30<>0 or extract(second from custom_end)<>0;
   if non_standard and not public.has_permission('shift_template.non_standard') then raise exception 'Non-standard working times require Owner authority.'; end if;
  end if;
  if exists(select 1 from public.shift_assignment_revisions where company_id=company and staff_id=target_staff and work_date=target_date and is_current) then raise exception 'An existing employee day cannot be replaced by workbook import.'; end if;
  if item ? 'ro_minutes' or item ? 'destination_branch_id' then raise exception 'RO and destination corrections require the schedule editor.'; end if;
  select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date order by revision desc limit 1 for update;
  next_revision:=coalesce(previous.revision,0)+1;

  insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by,work_site_label)
  values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,custom_start,custom_end,coalesce((item->>'custom_crosses_midnight')::boolean,false),custom_break,custom_cap,nullif(trim(item->>'custom_reason'),''),next_revision,
   coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',custom_start,'planned_end',custom_end,'crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',custom_break,'maximum_recognised_seconds',custom_cap,'grace_seconds',0,'match_before_seconds',14400,'match_after_seconds',14400,'overtime_rule',jsonb_build_object('mode','approved_only','threshold_seconds',0,'maximum_seconds',0,'rounding_minutes',1))),previous.id,actor,nullif(trim(item->>'work_site_label'),''));
 end loop;
 update public.schedule_weeks set updated_at=now() where id=w.id returning * into w; return w;
end $function$;

CREATE OR REPLACE FUNCTION public.reconcile_schedule_workbook_drafts(p_week_start date, p_file_name text, p_file_hash text, p_outlets jsonb, p_unresolved_count integer, p_source_metadata jsonb, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 receipt public.schedule_workbook_receipts; outlet jsonb; item jsonb; prior record;
 saved public.schedule_weeks; outcomes jsonb:='[]'; actual_ids jsonb; expected_ids jsonb;
 rule record; rule_branch uuid; rule_staff uuid; key_parts jsonb;
begin
 if company is null or actor is null or not public.has_permission('schedule.draft') then raise exception 'Schedule draft import is not authorised.'; end if;
 if p_request_key is null or p_request_key !~ '^[0-9a-f]{64}$' or p_file_hash is null or p_file_hash !~ '^[0-9a-f]{64}$'
 or p_week_start is null or extract(isodow from p_week_start)<>1 or coalesce(length(trim(p_file_name)),0)=0
 or jsonb_typeof(p_outlets) is distinct from 'array' or jsonb_array_length(p_outlets) not between 1 and 50
 or p_unresolved_count is distinct from 0 then raise exception 'Invalid workbook selection.'; end if;
 lock table public.shift_assignment_revisions in share row exclusive mode;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  if not public.can_access_company_branch(company,(outlet->>'branch_id')::uuid) then raise exception 'Outlet is outside your access.'; end if;
  if jsonb_typeof(outlet->'assignments') is distinct from 'array' or jsonb_array_length(outlet->'assignments') not between 1 and 1000 then raise exception 'Invalid assignment selection.'; end if;

 end loop;
 select * into receipt from public.schedule_workbook_receipts where company_id=company and request_key=p_request_key;
 if receipt.id is not null then
  if receipt.file_hash<>p_file_hash or receipt.week_start<>p_week_start or receipt.source_metadata->'selectedOutlets' is distinct from p_outlets then raise exception 'Import retry does not match its receipt.'; end if;
  return receipt.outcome||jsonb_build_object('idempotent',true);
 end if;
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  perform 1 from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start for update;
  if exists(select 1 from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start and (revision<>1 or status not in ('draft','returned','rejected') or locked_at is not null)) then raise exception 'A selected schedule is protected. Preview again.'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') a group by a->>'staff_id',a->>'work_date' having count(*)>1) then raise exception 'Choose one assignment per employee day.'; end if;
 select coalesce(jsonb_agg(a.id::text order by a.id::text),'[]') into actual_ids
 from public.shift_assignment_revisions a
 where a.company_id=company and a.is_current and exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') x where (x->>'staff_id')::uuid=a.staff_id and (x->>'work_date')::date=a.work_date);
 select coalesce(jsonb_agg(value order by value),'[]') into expected_ids from jsonb_array_elements_text(coalesce(p_source_metadata->'expectedAssignments','[]'));
 if actual_ids is distinct from expected_ids then raise exception 'The draft changed since preview. Check changes again before importing.'; end if;
 for prior in select a.id,a.branch_id,to_jsonb(a) assignment,w.status,w.revision,w.locked_at
 from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id
 where a.company_id=company and a.is_current and a.id::text in(select jsonb_array_elements_text(actual_ids)) for update of w loop
  if coalesce((prior.assignment->>'ro_minutes')::integer,0)>0 then raise exception 'An existing employee day is protected.'; end if;
  if not public.can_access_company_branch(company,prior.branch_id) or prior.status not in ('draft','returned','rejected') or prior.revision<>1 or prior.locked_at is not null then raise exception 'An existing employee day is protected.'; end if;
 end loop;
 update public.shift_assignment_revisions set is_current=false where company_id=company and is_current and id::text in(select jsonb_array_elements_text(actual_ids));
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  saved:=public.append_schedule_workbook_rows((outlet->>'branch_id')::uuid,p_week_start,outlet->'assignments');
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('branch_id',saved.branch_id,'schedule_week_id',saved.id,'status',saved.status,'assignments',jsonb_array_length(outlet->'assignments')));
 end loop;
 if jsonb_typeof(coalesce(p_source_metadata->'reusableRules','{}'))<>'object' or (select count(*) from jsonb_object_keys(coalesce(p_source_metadata->'reusableRules','{}')))>1000 then raise exception 'Invalid import rules.'; end if;
 for rule in select key,value from jsonb_each(coalesce(p_source_metadata->'reusableRules','{}')) loop
  key_parts:=rule.key::jsonb;rule_branch:=(rule.value->>'branchId')::uuid;rule_staff:=nullif(rule.value->>'staffId','')::uuid;
  if jsonb_typeof(key_parts)<>'array' or jsonb_array_length(key_parts)<>4 or key_parts->>1 not in ('branch','employee','shift','end','destination') or length(rule.key)>1000
  or jsonb_typeof(rule.value)<>'object' or rule_branch is null then raise exception 'Invalid reusable import rule.'; end if;
  if not exists(select 1 from jsonb_array_elements(p_outlets) o where (o->>'branch_id')::uuid=rule_branch) then continue; end if;
  if not public.can_access_company_branch(company,rule_branch) then raise exception 'Rule location is outside your access.'; end if;
  if rule_staff is not null and not exists(select 1 from public.staffs s where s.id=rule_staff and s.company_id=company) then raise exception 'Rule employee is outside this location.'; end if;
  if key_parts->>1<>'branch' and key_parts->>2<>rule_branch::text then raise exception 'Rule key location does not match its scope.'; end if;
  if exists(select 1 from public.schedule_workbook_rules r where r.company_id=company and r.rule_key=rule.key and not public.can_access_company_branch(company,r.branch_id)) then raise exception 'Existing rule is outside your access.'; end if;
  if rule.value ? 'destinationId' and not public.can_access_company_branch(company,(rule.value->>'destinationId')::uuid) then raise exception 'Rule destination is outside your access.'; end if;
  if key_parts->>1='shift' and (key_parts->>3) ~* '(^|[^a-z])ot([^a-z]|$)' then raise exception 'OT conditions must be confirmed for each source employee day.'; end if;
  if rule.value ? 'kind' and rule.value->>'kind' not in ('off','ph','al','mc','upl','ro','oil','el') then raise exception 'Invalid leave rule.'; end if;
  if rule.value ? 'start' then perform (rule.value->>'start')::time; end if;
  if rule.value ? 'end' then perform (rule.value->>'end')::time; end if;
  insert into public.schedule_workbook_rules(company_id,rule_key,branch_id,rule_value,confirmed_by)
  values(company,rule.key,rule_branch,rule.value,actor) on conflict(company_id,rule_key) do update set branch_id=excluded.branch_id,rule_value=excluded.rule_value,confirmed_by=excluded.confirmed_by,confirmed_at=now();
 end loop;
 if jsonb_typeof(coalesce(p_source_metadata->'untimedDuties','[]'))<>'array' or jsonb_array_length(coalesce(p_source_metadata->'untimedDuties','[]'))>1000 then raise exception 'Invalid untimed roster notes.'; end if;
 for item in select value from jsonb_array_elements(coalesce(p_source_metadata->'untimedDuties','[]')) loop
  if item->>'date' is null or item->>'branchId' is null or item->>'staffId' is null or item->>'label' not in ('MORNING','AFTERNOON','NIGHT') or item->>'label' is null or (item->>'date')::date not between p_week_start and p_week_start+6
   or not exists(select 1 from jsonb_array_elements(p_outlets) o where o->>'branch_id'=item->>'branchId')
   or not exists(select 1 from public.staffs s where s.company_id=company and s.id=(item->>'staffId')::uuid)
   or public.staff_requires_fingerprint(company,(item->>'staffId')::uuid,(item->>'date')::date)
   or not public.is_staff_schedule_eligible((item->>'staffId')::uuid,(item->>'date')::date) then raise exception 'An untimed duty requires a dated staff fingerprint exception and authorised location.'; end if;
 end loop;
 insert into public.schedule_workbook_receipts(company_id,request_key,week_start,file_hash,source_metadata,outcome,imported_by)
 values(company,p_request_key,p_week_start,p_file_hash,coalesce(p_source_metadata,'{}')||jsonb_build_object('fileName',p_file_name,'selectedOutlets',p_outlets,'retiredAssignmentIds',actual_ids),jsonb_build_object('outcomes',outcomes,'idempotent',false),actor);
 return jsonb_build_object('outcomes',outcomes,'idempotent',false);
end $function$;

CREATE OR REPLACE FUNCTION public.validate_schedule_week(p_week_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w public.schedule_weeks; blockers jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id();
 if w.id is null or not public.has_permission('schedule.submit') or not public.can_access_company_branch(w.company_id,w.branch_id) then
   return jsonb_build_object('status','blocked','blockers',jsonb_build_array(jsonb_build_object('code','not_authorised','message','You do not have permission to submit this outlet schedule.')),'warnings',warnings);
 end if;
 if w.status not in ('draft','returned','rejected','amendment_pending') then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','not_editable','message','Only a Draft, Returned, Rejected, or Amendment Pending schedule can be submitted.')); end if;
 if not exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','no_assignments','message','Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.')); end if;
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','unresolved_staff_day','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has no schedule for '||to_char(q.work_date,'Dy, DD Mon')||'. Add a shift, OFF or leave, or schedule the employee at the destination outlet.'))
   from (
    select s.id staff_id,s.full_name,d.work_date
    from public.staffs s
    join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=w.branch_id
    cross join lateral generate_series(w.week_start,w.week_start+6,interval '1 day') d(work_date)
    where s.company_id=w.company_id and s.employment_type='full_time' and public.is_staff_schedule_eligible(s.id,d.work_date::date)
      and not (s.id=any(w.excluded_staff_ids))
      and not exists(
        select 1 from public.shift_assignment_revisions a
        join public.schedule_weeks aw on aw.id=a.schedule_week_id
        where a.company_id=w.company_id and a.staff_id=s.id and a.work_date=d.work_date::date and a.is_current
          and ((a.schedule_week_id=w.id) or (a.assignment_kind='shift' and aw.week_start=w.week_start and aw.branch_id<>w.branch_id and aw.status in ('draft','returned','rejected','amendment_pending','submitted','published','locked')))
      )
    order by s.full_name,d.work_date
   ) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','ineligible_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is not eligible for scheduling on '||q.work_date::text||'. Check employee status, employment dates and role.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and not public.is_staff_schedule_eligible(a.staff_id,a.work_date)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','emergency_leave_work_conflict','staffId',a.staff_id,'workDate',a.work_date,'message','Emergency Leave conflicts with a working shift on this employee day.')) from public.shift_assignment_revisions a where a.company_id=w.company_id and a.schedule_week_id=w.id and a.is_current and a.assignment_kind in ('el','shift') and exists(select 1 from public.shift_assignment_revisions other where other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.id<>a.id and ((a.assignment_kind='el' and other.assignment_kind='shift') or (a.assignment_kind='shift' and other.assignment_kind='el')))),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil','el'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $function$;

CREATE OR REPLACE FUNCTION public.decide_daily_attendance_report(p_report_id uuid, p_decision text, p_comment text DEFAULT NULL::text, p_evidence_waiver_reason text DEFAULT NULL::text)
 RETURNS daily_attendance_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare report public.daily_attendance_reports;
begin
 select * into report from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() for update;
 if report.id is null or not public.can_access_company_branch(report.company_id,report.branch_id) then raise exception 'Attendance report is unavailable.'; end if;
 if report.report_type='comp_time_used' then raise exception 'Legacy comp-time requests cannot bypass scheduled RO settlement.'; end if;
 if report.report_type<>'unpaid_leave' then
  report:=public.decide_daily_attendance_report_before_schedule_ro(p_report_id,p_decision,p_comment,p_evidence_waiver_reason);
  if report.report_type='emergency_leave' and report.status='approved' then
   if public.apply_paid_emergency_leave_day(report.staff_id,report.work_date,null) is null then raise exception 'Emergency Leave source changed. Review the current published assignment.'; end if;
  end if;
  return report;
 end if;
 if not public.has_permission('attendance.report.approve') or p_decision not in ('approve','reject') then raise exception 'Daily attendance decision is not authorised.'; end if;
 if report.status<>'pending' then raise exception 'Pending daily attendance report not found.'; end if;
 if report.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot approve their own report.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 if exists(select 1 from public.attendance_period_locks where company_id=report.company_id and week_start=date_trunc('week',report.work_date)::date and unlocked_at is null and (branch_id is null or branch_id=report.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 update public.daily_attendance_reports set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),'') where id=report.id returning * into report;
 if p_decision='approve' then perform public.apply_approved_unpaid_leave(report.id); end if;
 return report;
end $function$;

CREATE OR REPLACE FUNCTION public.calculate_schedule_day(p_batch_id uuid, p_staff_id uuid, p_work_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare calculated integer; report record;
begin
 calculated:=public.calculate_schedule_day_part_time(p_batch_id,p_staff_id,p_work_date);
 for report in select distinct r.id from public.daily_attendance_reports r join public.daily_attendance_results d on d.company_id=r.company_id and d.staff_id=r.staff_id and d.work_date=r.work_date where r.company_id=public.current_staff_company_id() and r.status='approved' and r.report_type='unpaid_leave' and d.import_batch_id=p_batch_id and d.is_current and d.staff_id=p_staff_id and d.work_date=p_work_date loop
   perform public.apply_approved_unpaid_leave(report.id);
 end loop;
 if public.paid_emergency_leave_day_proof(p_staff_id,p_work_date) is not null then
  perform public.apply_paid_emergency_leave_day(p_staff_id,p_work_date,p_batch_id);
  calculated:=greatest(calculated,1);
 end if;
 return calculated;
end $function$;

CREATE OR REPLACE FUNCTION public.refresh_schedule_attendance(p_week_start date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare candidate public.attendance_schedule_refresh; job public.attendance_schedule_refresh; batch_id uuid; protected_result boolean; count_days integer:=0; changed integer; outcomes jsonb:='[]';
begin
 if not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
 if p_week_start is null or extract(isodow from p_week_start)<>1 then raise exception 'A Monday week is required.'; end if;
 for candidate in select * from public.attendance_schedule_refresh q
  where q.company_id=public.current_staff_company_id() and q.work_date between p_week_start and p_week_start+6
   and (p_branch_id is null or q.branch_id=p_branch_id) and public.can_access_company_branch(q.company_id,q.branch_id)
   and q.status in ('pending','failed','waiting_punches') order by q.staff_id,q.work_date limit 100
 loop
  -- Review/source writers acquire the employee lock before queue/result locks.
  -- Use the same order here, then reread the job: another worker may have
  -- completed it while this transaction waited for the employee lock.
  perform public.attestation_lock(candidate.staff_id);
  select * into job from public.attendance_schedule_refresh q
   where q.company_id=candidate.company_id and q.staff_id=candidate.staff_id and q.work_date=candidate.work_date
    and q.status in ('pending','failed','waiting_punches')
    and (p_branch_id is null or q.branch_id=p_branch_id) and public.can_access_company_branch(q.company_id,q.branch_id)
   for update skip locked;
  if not found then continue; end if;
  begin
   perform pg_advisory_xact_lock(hashtextextended(job.company_id::text||':'||job.staff_id::text||':'||job.work_date::text,0));
   perform 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current for update;
   select exists(select 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current and r.review_status<>'pending')
    or exists(select 1 from public.attendance_period_locks l where l.company_id=job.company_id and l.week_start=p_week_start and l.unlocked_at is null and (l.branch_id is null or l.branch_id=job.branch_id or exists(select 1 from public.daily_attendance_results previous where previous.company_id=job.company_id and previous.staff_id=job.staff_id and previous.work_date=job.work_date and previous.is_current and previous.branch_id=l.branch_id)))
    or exists(select 1 from public.daily_attendance_reports r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.status='approved')
    or exists(select 1 from public.shift_assignment_revisions a where a.company_id=job.company_id and a.staff_id=job.staff_id and a.work_date=job.work_date and a.is_current and not public.can_access_company_branch(a.company_id,a.branch_id))
    or exists(select 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current and not public.can_access_company_branch(r.company_id,r.branch_id))
    or exists(select 1 from public.attendance_ot_claims c where c.company_id=job.company_id and c.staff_id=job.staff_id and c.work_date=job.work_date and c.status in ('submitted','approved','credited'))
    or public.attendance_payroll_locked(job.company_id,job.staff_id,job.work_date)
    into protected_result;
   if protected_result then
    update public.attendance_schedule_refresh set status='needs_review',error_code='protected_result',updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
   elsif public.paid_emergency_leave_day_proof(job.staff_id,job.work_date) is not null then
    perform public.apply_paid_emergency_leave_day(job.staff_id,job.work_date,null);
    count_days:=count_days+1;
   else
    select b.id into batch_id from public.attendance_import_batches b where b.company_id=job.company_id and b.week_start between p_week_start-7 and p_week_start+7 and b.status='finalised' and b.parser_profile='view_attendance_punch' and exists(select 1 from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=b.id and e.local_timestamp::date between job.work_date-1 and job.work_date+2) order by b.finalised_at desc nulls last,b.created_at desc,b.id limit 1;
    if batch_id is null then
     update public.attendance_schedule_refresh set status='waiting_punches',error_code=null,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
    elsif (select count(*) from public.shift_assignment_revisions a where a.company_id=job.company_id and a.staff_id=job.staff_id and a.work_date=job.work_date and a.is_current and a.assignment_kind='shift')<>1 then
     update public.attendance_schedule_refresh set status='needs_review',error_code='no_unique_working_shift',updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
    else
     update public.attendance_schedule_refresh set status='running',error_code=null,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
     changed:=public.calculate_schedule_day(batch_id,job.staff_id,job.work_date);
     if changed<>1 then raise exception 'Expected one employee-day result'; end if;
     update public.daily_attendance_results r set calculation=r.calculation||jsonb_build_object('schedule_source_revision',job.source_revision,'schedule_source_hash',job.source_hash)
      where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current;
     update public.attendance_schedule_refresh set status=case when exists(select 1 from public.daily_attendance_results el where el.company_id=job.company_id and el.staff_id=job.staff_id and el.work_date=job.work_date and el.is_current and 'el_evidence_conflict'=any(el.statuses)) then 'needs_review' else 'ready' end,calculated_revision=job.source_revision,error_code=case when exists(select 1 from public.daily_attendance_results el where el.company_id=job.company_id and el.staff_id=job.staff_id and el.work_date=job.work_date and el.is_current and 'el_evidence_conflict'=any(el.statuses)) then 'el_evidence_conflict' else null end,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
     count_days:=count_days+1;
    end if;
   end if;
  exception when others then
   update public.attendance_schedule_refresh set status='failed',error_code=sqlstate,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
  end;
  outcomes:=outcomes||jsonb_build_array((select jsonb_build_object('staffId',q.staff_id,'workDate',q.work_date,'status',q.status,'sourceRevision',q.source_revision,'sourceHash',q.source_hash) from public.attendance_schedule_refresh q where q.company_id=job.company_id and q.staff_id=job.staff_id and q.work_date=job.work_date));
 end loop;
 return jsonb_build_object('calculated',count_days,'outcomes',outcomes);
end $function$;

CREATE OR REPLACE FUNCTION public.save_employee_payslip(p_confirmation uuid, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare c public.attendance_confirmations; p public.employee_payslips; item jsonb; clean jsonb:='[]'; earning numeric:=0; deduction numeric:=0; amount numeric; basis text; dates jsonb; source_day date;
begin
 if not public.attestation_people('payroll.payslip.manage') then raise exception 'Access denied' using errcode='42501'; end if;
 select * into c from public.attendance_confirmations where id=p_confirmation and company_id=public.current_staff_company_id();
 if c.id is null then raise exception 'Attendance unavailable'; end if;
 perform public.attestation_lock(c.staff_id);
 select * into c from public.attendance_confirmations where id=p_confirmation for update;
 perform public.attestation_require_ready(c.staff_id,c.period_start,c.period_end);
 if c.state<>'approved' or public.attestation_content_hash(public.attestation_source(c.staff_id,c.period_start,c.period_end))<>c.source_hash then raise exception 'Current completed attendance approval required' using errcode='P0001'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 50 then raise exception 'Enter 1–50 payroll lines'; end if;
 for item in select * from jsonb_array_elements(p_lines) loop
  if item->>'kind' is null or item->>'kind' not in ('earning','deduction') or nullif(trim(item->>'label'),'') is null or length(item->>'label')>120 or item->'amount' is null or jsonb_typeof(item->'amount')<>'number' then raise exception 'Invalid payroll line'; end if;
  basis:=coalesce(item->>'source_kind','manual'); dates:=coalesce(item->'source_dates','[]'::jsonb);
  if basis not in ('manual','attendance_short_hours','emergency_leave') or jsonb_typeof(dates)<>'array' or jsonb_array_length(dates)>366 then raise exception 'Invalid payroll source'; end if;
  if item->>'kind'='deduction' and basis='emergency_leave' then raise exception 'Emergency Leave is paid leave and cannot be a deduction'; end if;
  if basis='attendance_short_hours' and (item->>'kind'<>'deduction' or jsonb_array_length(dates)=0) then raise exception 'Short-hours deductions require source dates'; end if;
  for source_day in select case when jsonb_typeof(value)='string' and value#>>'{}' ~ '^\d{4}-\d{2}-\d{2}$' then (value#>>'{}')::date else null end from jsonb_array_elements(dates) loop
   if source_day is null or source_day not between c.period_start and c.period_end then raise exception 'Payroll source date is outside this confirmed period'; end if;
   if item->>'kind'='deduction' and basis='attendance_short_hours' and exists(
    select 1 from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id
    where a.company_id=c.company_id and a.staff_id=c.staff_id and a.work_date=source_day and a.is_current and w.status in ('published','locked')
    and (a.assignment_kind='el' or exists(select 1 from public.daily_attendance_reports r where r.company_id=c.company_id and r.assignment_id=a.id and r.staff_id=c.staff_id and r.work_date=source_day and r.report_type='emergency_leave' and r.status='approved'))
   ) then raise exception 'Emergency Leave dates cannot be included in a short-hours deduction'; end if;
  end loop;
  amount:=(item->>'amount')::numeric;
  if amount<0 or amount>999999999 or round(amount,2)<>amount then raise exception 'Invalid monetary amount'; end if;
  clean:=clean||jsonb_build_array(jsonb_build_object('kind',item->>'kind','label',trim(item->>'label'),'amount',amount,'source_kind',basis,'source_dates',dates));
  if item->>'kind'='earning' then earning:=earning+amount; else deduction:=deduction+amount; end if;
 end loop;
 select * into p from public.employee_payslips where confirmation_id=c.id for update;
 if p.state='released' then raise exception 'Released payslip is immutable'; end if;
 insert into public.employee_payslips(confirmation_id,company_id,staff_id,earnings,deductions,detail,state,calculated_by,calculation_hash)
 values(c.id,c.company_id,c.staff_id,earning,deduction,clean,'draft',public.current_staff_id(),public.attestation_calculation_hash(c.staff_id,c.period_start,c.period_end))
 on conflict(confirmation_id) do update set earnings=excluded.earnings,deductions=excluded.deductions,detail=excluded.detail,state='draft',
 version=employee_payslips.version+1,calculation_hash=excluded.calculation_hash,calculated_by=excluded.calculated_by,calculated_at=now(),approved_by=null,approved_at=null returning * into p;
 insert into public.employee_payslip_events(payslip_id,actor_id,action,version,detail) values(p.id,public.current_staff_id(),'calculate',p.version,p.detail);
 return p.id;
end $function$;

rollback; -- Review only: do not activate without the exact coordinated approval.
