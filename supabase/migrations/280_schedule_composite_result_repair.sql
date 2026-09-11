-- Keep atomic schedule actions typed as schedule_weeks rows. Selecting a
-- composite-returning function as one scalar coerces the whole row to text,
-- which later fails when its id is passed to UUID arguments.

create or replace function public.save_schedule_week(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare result public.schedule_weeks; item jsonb; a public.shift_assignment_revisions; original_start time; original_end time; adjusted_start time; adjusted_end time; minutes integer; direction text; staff_type text; begin
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  if minutes is not null then
   if minutes<=0 or minutes%30<>0 or lower(item->>'assignment_kind')<>'shift' then raise exception 'RO must be attached to a working shift in 30-minute units.'; end if;
   select employment_type into staff_type from public.staffs where id=(item->>'staff_id')::uuid and company_id=public.current_staff_company_id();
   if staff_type<>'full_time' then raise exception 'Only Full-time employees can reserve RO.'; end if;
   select planned_start,planned_end into original_start,original_end from public.shift_templates where id=nullif(item->>'shift_template_id','')::uuid and company_id=public.current_staff_company_id();
   original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
   adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
   if original_start is null or original_end is null or adjusted_start is null or adjusted_end is null then raise exception 'Original and adjusted RO shift times are required.'; end if;
   direction:=case when adjusted_start>original_start and adjusted_end=original_end then 'late_start' when adjusted_start=original_start and adjusted_end<original_end then 'early_finish' end;
   if direction is null or (case direction when 'late_start' then extract(epoch from adjusted_start-original_start) else extract(epoch from original_end-adjusted_end) end)::integer<>minutes*60 then raise exception 'Adjusted shift must redeem exactly the selected RO minutes at one edge.'; end if;
  end if;
 end loop;
 result := public.save_schedule_week_before_ro(p_branch_id,p_week_start,p_assignments);
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  select * into a from public.shift_assignment_revisions where schedule_week_id=result.id and staff_id=(item->>'staff_id')::uuid and work_date=(item->>'work_date')::date and is_current;
  if a.id is not null then
   if minutes is null then update public.shift_assignment_revisions set ro_minutes=null,ro_original_start=null,ro_original_end=null,ro_direction=null where id=a.id;
   else
    select planned_start,planned_end into original_start,original_end from public.shift_templates where id=a.shift_template_id;
    original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
    adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
    direction:=case when adjusted_start>original_start then 'late_start' else 'early_finish' end;
    update public.shift_assignment_revisions set ro_minutes=minutes,ro_original_start=original_start,ro_original_end=original_end,ro_direction=direction,
      template_snapshot=template_snapshot||jsonb_build_object('planned_start',adjusted_start,'planned_end',adjusted_end,'ro_original_start',original_start,'ro_original_end',original_end,'ro_minutes',minutes,'ro_direction',direction)
    where id=a.id;
   end if;
  end if;
 end loop; return result; end $$;

create or replace function public.copy_schedule_week(p_source_week_id uuid,p_target_week_start date) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare source public.schedule_weeks; result public.schedule_weeks; payload jsonb; begin
 select * into source from public.schedule_weeks where id=p_source_week_id and company_id=public.current_staff_company_id();
 if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id) or extract(isodow from p_target_week_start)<>1 then raise exception 'Schedule copy is not authorised.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,'custom_start',a.custom_start,'custom_end',a.custom_end,'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,'custom_reason',coalesce(a.custom_reason,'Copied from prior week'))),'[]'::jsonb) into payload from public.shift_assignment_revisions a where a.schedule_week_id=source.id and a.is_current;
 result := public.save_schedule_week(source.branch_id,p_target_week_start,payload); return result; end $$;

create or replace function public.decide_schedule_week(p_week_id uuid,p_decision text,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare result public.schedule_weeks; a record; available integer; begin
 result := public.decide_schedule_week_before_ro(p_week_id,p_decision,p_comment);
 if p_decision='approve' then
  for a in select * from public.shift_assignment_revisions where schedule_week_id=result.id and is_current and ro_minutes is not null order by staff_id,work_date loop
   perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||':'||a.staff_id::text,0));
   select public.get_comp_time_available_balance(a.staff_id) into available;
   if available<a.ro_minutes then raise exception 'Insufficient RO balance for % on %: % minutes available, % requested.',(select full_name from public.staffs where id=a.staff_id),a.work_date,available,a.ro_minutes; end if;
   insert into public.attendance_ro_reservations(company_id,schedule_week_id,assignment_id,staff_id,branch_id,work_date,reserved_minutes,original_start,original_end,adjusted_start,adjusted_end,direction,reserved_by)
   values(a.company_id,a.schedule_week_id,a.id,a.staff_id,a.branch_id,a.work_date,a.ro_minutes,a.ro_original_start,a.ro_original_end,coalesce(a.custom_start,(a.template_snapshot->>'planned_start')::time),coalesce(a.custom_end,(a.template_snapshot->>'planned_end')::time),a.ro_direction,public.current_staff_id());
  end loop;
 elsif p_decision in ('return','reject') then update public.attendance_ro_reservations set status='released',decided_by=public.current_staff_id(),decided_at=now(),decision_note=coalesce(p_comment,'Schedule returned'),updated_at=now() where schedule_week_id=result.id and status='reserved'; end if;
 return result; end $$;

create or replace function public.submit_schedule_week_atomic(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb,
  p_expected_updated_at timestamptz default null,
  p_comment text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  current_week public.schedule_weeks;
  saved_week public.schedule_weeks;
  submitted_week public.schedule_weeks;
  validation jsonb;
begin
  if not public.has_permission('schedule.submit') or not public.has_permission('schedule.draft') then
    raise exception 'Schedule submission is not authorised.';
  end if;
  select * into current_week from public.schedule_weeks
   where company_id=public.current_staff_company_id() and branch_id=p_branch_id and week_start=p_week_start
   order by revision desc limit 1 for update;
  if current_week.id is not null and p_expected_updated_at is not null and current_week.updated_at<>p_expected_updated_at then
    raise exception 'Schedule changed since it was opened.';
  end if;
  saved_week := public.save_schedule_week(p_branch_id,p_week_start,p_assignments);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then
    raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.');
  end if;
  submitted_week := public.submit_schedule_week(saved_week.id,p_comment);
  return jsonb_build_object('week',to_jsonb(submitted_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

create or replace function public.edit_and_publish_schedule_week(
  p_week_id uuid,
  p_assignments jsonb,
  p_expected_updated_at timestamptz,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  roster public.schedule_weeks;
  saved_week public.schedule_weeks;
  published_week public.schedule_weeks;
  before_assignments jsonb;
  after_assignments jsonb;
  validation jsonb;
begin
  if not public.has_permission('schedule.approve') or not public.has_permission('schedule.draft') then
    raise exception 'Schedule decision is not authorised.';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Manager correction reason is required.'; end if;
  select * into roster from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
  if roster.id is null or not public.can_access_company_branch(roster.company_id,roster.branch_id) then raise exception 'Schedule decision is not authorised.'; end if;
  if roster.status<>'submitted' then raise exception 'Only a submitted roster may be decided.'; end if;
  if p_expected_updated_at is not null and roster.updated_at<>p_expected_updated_at then raise exception 'Schedule changed since it was opened.'; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb) into before_assignments from public.shift_assignment_revisions a where a.schedule_week_id=roster.id and a.is_current;
  update public.schedule_weeks set status='amendment_pending',updated_at=now() where id=roster.id;
  saved_week := public.save_schedule_week(roster.branch_id,roster.week_start,p_assignments);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.'); end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb) into after_assignments from public.shift_assignment_revisions a where a.schedule_week_id=roster.id and a.is_current;
  update public.schedule_weeks set status='submitted',updated_at=now() where id=roster.id;
  insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state)
  values(roster.company_id,roster.id,'manager_edit','submitted','submitted',public.current_staff_id(),trim(p_reason),jsonb_build_object('assignments',before_assignments),jsonb_build_object('assignments',after_assignments));
  published_week := public.decide_schedule_week(roster.id,'approve',trim(p_reason));
  return jsonb_build_object('week',to_jsonb(published_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

create or replace function public.import_schedule_workbook_drafts(
  p_week_start date,
  p_file_name text,
  p_file_hash text,
  p_outlets jsonb,
  p_unresolved_count integer default 0,
  p_source_metadata jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  company uuid:=public.current_staff_company_id();
  actor uuid:=public.current_staff_id();
  existing public.schedule_import_batches;
  batch public.schedule_import_batches;
  outlet jsonb;
  current_week public.schedule_weeks;
  saved public.schedule_weeks;
  outcomes jsonb:='[]'::jsonb;
  assignment_total integer:=0;
begin
  if not public.has_permission('schedule.draft') then raise exception 'Schedule draft import is not authorised.'; end if;
  if extract(isodow from p_week_start)<>1 or coalesce(length(trim(p_file_name)),0)=0 or coalesce(length(p_file_hash),0)<>64 or jsonb_typeof(p_outlets)<>'array' or jsonb_array_length(p_outlets)=0 or jsonb_array_length(p_outlets)>50 then raise exception 'Invalid schedule workbook import payload.'; end if;
  if p_unresolved_count<>0 then raise exception 'Resolve or explicitly remove every unresolved workbook value before importing drafts.'; end if;
  select * into existing from public.schedule_import_batches where company_id=company and week_start=p_week_start and file_hash=p_file_hash;
  if existing.id is not null then return jsonb_build_object('batch',to_jsonb(existing),'idempotent',true,'outcomes',existing.source_metadata->'outcomes'); end if;
  for outlet in select value from jsonb_array_elements(p_outlets) loop
    if jsonb_typeof(outlet->'assignments')<>'array' then raise exception 'Each outlet requires an assignments array.'; end if;
    select * into current_week from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start order by revision desc limit 1 for update;
    if current_week.status in ('published','locked') then raise exception 'Published or locked schedules cannot be replaced by workbook import.'; end if;
    saved := public.save_schedule_week((outlet->>'branch_id')::uuid,p_week_start,outlet->'assignments');
    assignment_total:=assignment_total+jsonb_array_length(outlet->'assignments');
    outcomes:=outcomes||jsonb_build_array(jsonb_build_object('branch_id',saved.branch_id,'schedule_week_id',saved.id,'status',saved.status,'assignments',jsonb_array_length(outlet->'assignments')));
  end loop;
  insert into public.schedule_import_batches(company_id,week_start,file_name,file_hash,outlet_count,assignment_count,unresolved_count,source_metadata,imported_by)
  values(company,p_week_start,left(trim(p_file_name),255),lower(p_file_hash),jsonb_array_length(p_outlets),assignment_total,p_unresolved_count,coalesce(p_source_metadata,'{}'::jsonb)||jsonb_build_object('outcomes',outcomes),actor)
  returning * into batch;
  return jsonb_build_object('batch',to_jsonb(batch),'idempotent',false,'outcomes',outcomes);
end $$;

-- Migration 274 preserved a column that was removed before release. Keep the
-- immutable revision behaviour while restoring only fields that still exist.
create or replace function public.adjust_attendance_result(
  p_result_id uuid,
  p_patch jsonb,
  p_reason text
) returns public.daily_attendance_results
language plpgsql security definer set search_path=public as $$
declare
  prior public.daily_attendance_results;
  revised public.daily_attendance_results;
begin
  select * into prior
    from public.daily_attendance_results
   where id=p_result_id
     and company_id=public.current_staff_company_id()
     and is_current
   for update;

  select * into revised
    from public.adjust_attendance_result_before_ot_claims(
      p_result_id,
      p_patch-'overtime_seconds',
      p_reason
    );

  update public.daily_attendance_results set
    expected_punch_count=prior.expected_punch_count,
    actual_punch_count=prior.actual_punch_count,
    missing_punch_count=prior.missing_punch_count,
    monthly_missing_punch_count=prior.monthly_missing_punch_count,
    overtime_candidate_seconds=prior.overtime_candidate_seconds,
    holiday_normal_equivalent_seconds=prior.holiday_normal_equivalent_seconds
  where id=revised.id
  returning * into revised;

  return revised;
end $$;

create or replace function public.decide_attendance_ot_claim(
  p_claim_id uuid,
  p_decision text,
  p_decided_minutes integer,
  p_comment text default null
) returns public.attendance_ot_claims
language plpgsql security definer set search_path=public as $$
declare
  claim public.attendance_ot_claims;
  transaction_id uuid;
  current_result public.daily_attendance_results;
  revised public.daily_attendance_results;
begin
  if not public.has_permission('attendance.ot.approve') or p_decision not in ('approve','reject') then raise exception 'OT claim decision is not authorised.'; end if;
  select * into claim from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id() for update;
  if claim.id is null or claim.status<>'submitted' then raise exception 'Submitted OT claim was not found.'; end if;
  if claim.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot decide their own OT claim.'; end if;
  if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
  if p_decision='approve' and (coalesce(p_decided_minutes,0)<=0 or p_decided_minutes%30<>0 or p_decided_minutes>claim.requested_minutes) then raise exception 'Approved OT must be a 30-minute amount within the request.'; end if;

  update public.attendance_ot_claims set
    status=case when p_decision='approve' then 'approved' else 'rejected' end,
    decided_minutes=case when p_decision='approve' then p_decided_minutes else 0 end,
    decided_by=public.current_staff_id(),
    decided_at=now(),
    decision_comment=nullif(trim(p_comment),''),
    updated_at=now()
  where id=claim.id
  returning * into claim;

  if p_decision='approve' then
    insert into public.comp_time_transactions(
      company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,
      source_result_id,source_ot_claim_id,status,submitted_by,decided_by,decided_at,decision_comment
    ) values(
      claim.company_id,claim.staff_id,claim.branch_id,claim.work_date,'earned',p_decided_minutes,
      'Approved attendance OT',claim.reason,claim.result_id,claim.id,'approved',claim.submitted_by,
      public.current_staff_id(),now(),p_comment
    ) returning id into transaction_id;

    select * into current_result
      from public.daily_attendance_results
     where company_id=claim.company_id
       and staff_id=claim.staff_id
       and work_date=claim.work_date
       and is_current
     for update;

    if current_result.id is not null then
      select * into revised
        from public.adjust_attendance_result_before_ot_claims(
          current_result.id,
          jsonb_build_object(
            'recognised_paid_seconds',coalesce(current_result.payable_seconds,current_result.recognised_paid_seconds),
            'overtime_seconds',p_decided_minutes*60
          ),
          format('People approved OT claim %s',claim.id)
        );
      update public.daily_attendance_results set
        expected_punch_count=current_result.expected_punch_count,
        actual_punch_count=current_result.actual_punch_count,
        missing_punch_count=current_result.missing_punch_count,
        monthly_missing_punch_count=current_result.monthly_missing_punch_count,
        overtime_candidate_seconds=current_result.overtime_candidate_seconds,
        holiday_normal_equivalent_seconds=current_result.holiday_normal_equivalent_seconds
      where id=revised.id;
    end if;

    update public.attendance_ot_claims set
      status='credited',
      credited_transaction_id=transaction_id,
      updated_at=now()
    where id=claim.id
    returning * into claim;
  end if;

  return claim;
end $$;

-- The legacy Timecard importer is superseded by the canonical raw-punch import.
drop function if exists public.finalise_timecard_attendance_import(date,text,text,jsonb);

revoke all on function public.submit_schedule_week_atomic(uuid,date,jsonb,timestamptz,text),public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) from public,anon;
revoke all on function public.import_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb) from public,anon;
revoke all on function public.adjust_attendance_result(uuid,jsonb,text),public.decide_attendance_ot_claim(uuid,text,integer,text) from public,anon;
grant execute on function public.submit_schedule_week_atomic(uuid,date,jsonb,timestamptz,text),public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text),public.import_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb),public.adjust_attendance_result(uuid,jsonb,text),public.decide_attendance_ot_claim(uuid,text,integer,text) to authenticated;
notify pgrst,'reload schema';
