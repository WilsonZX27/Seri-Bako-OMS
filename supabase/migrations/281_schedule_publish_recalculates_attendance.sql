-- Publishing a roster after raw punches were imported must materialise the
-- newly scheduled staff days without requiring a second import. The imported
-- evidence remains immutable; recalculation creates a new result revision.

alter function public.decide_schedule_week(uuid,text,text) rename to decide_schedule_week_before_attendance_recalculation;

create or replace function public.decide_schedule_week(
  p_week_id uuid,
  p_decision text,
  p_comment text default null
) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
  result public.schedule_weeks;
  batch record;
begin
  result := public.decide_schedule_week_before_attendance_recalculation(p_week_id,p_decision,p_comment);

  if p_decision='approve' then
    for batch in
      select b.id
      from public.attendance_import_batches b
      where b.company_id=result.company_id
        and b.week_start=result.week_start
        and b.status='finalised'
        and b.parser_profile='view_attendance_punch'
      order by b.finalised_at desc nulls last,b.created_at desc
    loop
      perform public.recalculate_attendance_week(batch.id);
    end loop;
  end if;

  return result;
end $$;

revoke all on function public.decide_schedule_week_before_attendance_recalculation(uuid,text,text) from public,anon,authenticated;
revoke all on function public.decide_schedule_week(uuid,text,text) from public,anon;
grant execute on function public.decide_schedule_week(uuid,text,text) to authenticated;
notify pgrst,'reload schema';

create or replace function public.get_schedule_staff_candidates(p_branch_id uuid)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text)
language sql security definer set search_path=public stable as $$
  select s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code
  from public.staffs s
  join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
  join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
  where s.company_id=public.current_staff_company_id() and s.deleted_at is null
    and s.status in ('active','invited') and r.role_code in ('outlet_staff','outlet_supervisor')
    and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
  order by s.full_name,s.id
$$;

revoke all on function public.get_schedule_staff_candidates(uuid) from public,anon;
grant execute on function public.get_schedule_staff_candidates(uuid) to authenticated;
notify pgrst,'reload schema';



-- Company staff may be assigned to a different outlet for this week without
-- changing their permanent staff_branches ownership.
create or replace function public.save_schedule_week_before_ro(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
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
  if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','ph','al','mc','upl','ro','oil') then raise exception 'Invalid assignment row.'; end if;
  if not exists(select 1 from public.staffs s join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=target_date and (sr.effective_to is null or sr.effective_to>=target_date) join public.roles r on r.id=sr.role_id and r.company_id=s.company_id where s.id=target_staff and s.company_id=company and s.status in ('active','invited') and s.deleted_at is null and r.role_code in ('outlet_staff','outlet_supervisor')) then raise exception 'Staff is not eligible for outlet scheduling.'; end if;
  if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
  if target_kind='shift' and template_id is null then
   if custom_start is null or custom_end is null or nullif(trim(item->>'custom_reason'),'') is null or coalesce(custom_break,-1)<0 or coalesce(custom_cap,0)<=0 then raise exception 'Direct working times, break, paid cap and reason are required.'; end if;
   non_standard:=extract(minute from custom_start)::integer%30<>0 or extract(second from custom_start)<>0 or extract(minute from custom_end)::integer%30<>0 or extract(second from custom_end)<>0;
   if non_standard and not public.has_permission('shift_template.non_standard') then raise exception 'Non-standard working times require Owner authority.'; end if;
  end if;
  select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date and is_current for update;
  next_revision:=coalesce(previous.revision,0)+1;
  if previous.id is not null then update public.shift_assignment_revisions set is_current=false where id=previous.id; end if;
  insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by)
  values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,custom_start,custom_end,coalesce((item->>'custom_crosses_midnight')::boolean,false),custom_break,custom_cap,nullif(trim(item->>'custom_reason'),''),next_revision,
   coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',custom_start,'planned_end',custom_end,'crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',custom_break,'maximum_recognised_seconds',custom_cap,'grace_seconds',0,'match_before_seconds',14400,'match_after_seconds',14400,'overtime_rule',jsonb_build_object('mode','approved_only','threshold_seconds',0,'maximum_seconds',0,'rounding_minutes',1))),previous.id,actor);
 end loop;
 update public.shift_assignment_revisions current_assignment
 set is_current=false
 where current_assignment.schedule_week_id=w.id and current_assignment.is_current
   and not exists (
    select 1 from jsonb_array_elements(p_assignments) payload
    where (payload->>'staff_id')::uuid=current_assignment.staff_id
      and (payload->>'work_date')::date=current_assignment.work_date
   );
 get diagnostics cleared_count=row_count;
 if cleared_count>0 then
  insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state)
  values(company,w.id,'draft_clear',w.status,w.status,actor,format('%s schedule assignment(s) cleared.',cleared_count),jsonb_build_object('cleared_count',cleared_count),jsonb_build_object('current_assignment_count',jsonb_array_length(p_assignments)));
 end if;
 update public.schedule_weeks set updated_at=now() where id=w.id returning * into w; return w;
end $$;
