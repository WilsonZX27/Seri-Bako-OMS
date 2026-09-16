-- Save an external assignment in the destination outlet's canonical roster.
-- The home roster receives it through get_schedule_external_assignments, so
-- attendance reconciliation and both outlet views use one source of truth.

create or replace function public.save_schedule_week_with_destinations(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb
) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
  company uuid:=public.current_staff_company_id();
  result public.schedule_weeks;
  destination uuid;
  destination_week public.schedule_weeks;
  destination_payload jsonb;
  incoming jsonb;
  moved record;
begin
  if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then
    raise exception 'Schedule draft is not authorised.';
  end if;
  if jsonb_typeof(p_assignments)<>'array' then raise exception 'Invalid schedule week payload.'; end if;

  for destination in
    select distinct nullif(value->>'destination_branch_id','')::uuid
    from jsonb_array_elements(p_assignments)
    where nullif(value->>'destination_branch_id','') is not null
  loop
    if destination=p_branch_id or not exists(
      select 1 from public.branches b where b.id=destination and b.company_id=company
        and b.status='active' and b.deleted_at is null and b.branch_type in ('outlet','central_kitchen')
    ) or not public.can_access_company_branch(company,destination) then
      raise exception 'The selected destination outlet is not available.';
    end if;

    incoming:=(select jsonb_agg((value-'destination_branch_id')||jsonb_build_object('work_site_label',null))
      from jsonb_array_elements(p_assignments)
      where nullif(value->>'destination_branch_id','')::uuid=destination);

    -- A staff member can only work at one outlet on a date. Supersede an old
    -- draft placement before writing the newly selected destination.
    for moved in
      select a.id,a.schedule_week_id
      from public.shift_assignment_revisions a
      join public.schedule_weeks w on w.id=a.schedule_week_id
      where a.company_id=company and a.is_current and a.assignment_kind='shift'
        and w.week_start=p_week_start and w.branch_id<>p_branch_id and w.branch_id<>destination
        and w.status in ('draft','returned','rejected','amendment_pending')
        and exists(select 1 from jsonb_array_elements(incoming) i
          where (i->>'staff_id')::uuid=a.staff_id and (i->>'work_date')::date=a.work_date)
    loop
      update public.shift_assignment_revisions set is_current=false where id=moved.id;
    end loop;

    destination_week:=null;
    select * into destination_week from public.schedule_weeks
      where company_id=company and branch_id=destination and week_start=p_week_start and revision=1;
    if destination_week.id is not null and (destination_week.status not in ('draft','returned','rejected','amendment_pending') or destination_week.locked_at is not null) then
      raise exception 'The destination outlet schedule is no longer editable.';
    end if;

    destination_payload:=coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'staff_id',a.staff_id,'work_date',a.work_date,'assignment_kind',a.assignment_kind,
        'shift_template_id',a.shift_template_id,'custom_start',a.custom_start,'custom_end',a.custom_end,
        'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,
        'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,'custom_reason',a.custom_reason,
        'work_site_label',a.work_site_label,'ro_minutes',a.ro_minutes,'ro_original_start',a.ro_original_start,
        'ro_original_end',a.ro_original_end,'ro_direction',a.ro_direction)))
      from public.shift_assignment_revisions a
      where a.schedule_week_id=destination_week.id and a.is_current
        and not exists(select 1 from jsonb_array_elements(incoming) i
          where (i->>'staff_id')::uuid=a.staff_id and (i->>'work_date')::date=a.work_date)
    ),'[]'::jsonb)||incoming;
    perform public.save_schedule_week(destination,p_week_start,destination_payload);
  end loop;

  select public.save_schedule_week(p_branch_id,p_week_start,
    coalesce(jsonb_agg(value-'destination_branch_id'),'[]'::jsonb)) into result
  from jsonb_array_elements(p_assignments)
  where nullif(value->>'destination_branch_id','') is null;
  return result;
end $$;

revoke all on function public.save_schedule_week_with_destinations(uuid,date,jsonb) from public,anon;
grant execute on function public.save_schedule_week_with_destinations(uuid,date,jsonb) to authenticated;

-- Convert legacy free-text outlet names into canonical destination shifts.
do $$
declare
  legacy record;
  target_week public.schedule_weeks;
  target_previous public.shift_assignment_revisions;
begin
  for legacy in
    select a.*,w.week_start,b.id destination_branch_id
    from public.shift_assignment_revisions a
    join public.schedule_weeks w on w.id=a.schedule_week_id
    join public.branches b on b.company_id=a.company_id and lower(trim(b.branch_name))=lower(trim(a.work_site_label))
      and b.id<>a.branch_id and b.status='active' and b.deleted_at is null
    where a.is_current and a.assignment_kind='shift' and a.work_site_label is not null
      and w.status in ('draft','returned','rejected','amendment_pending') and w.locked_at is null
  loop
    target_week:=null;
    select * into target_week from public.schedule_weeks
      where company_id=legacy.company_id and branch_id=legacy.destination_branch_id
        and week_start=legacy.week_start and revision=1;
    if target_week.id is null then
      insert into public.schedule_weeks(company_id,branch_id,week_start,created_by)
      values(legacy.company_id,legacy.destination_branch_id,legacy.week_start,legacy.created_by)
      returning * into target_week;
    end if;
    if target_week.status in ('draft','returned','rejected','amendment_pending') and target_week.locked_at is null then
      target_previous:=null;
      select * into target_previous from public.shift_assignment_revisions
        where schedule_week_id=target_week.id and staff_id=legacy.staff_id and work_date=legacy.work_date
        order by revision desc limit 1;
      if target_previous.id is null or not target_previous.is_current then
        insert into public.shift_assignment_revisions(
          company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,
          custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,
          custom_reason,revision,template_snapshot,supersedes_id,created_by,work_site_label,
          ro_minutes,ro_original_start,ro_original_end,ro_direction
        ) values(
          legacy.company_id,target_week.id,legacy.staff_id,legacy.destination_branch_id,legacy.work_date,legacy.assignment_kind,legacy.shift_template_id,
          legacy.custom_start,legacy.custom_end,legacy.custom_crosses_midnight,legacy.custom_break_seconds,legacy.custom_maximum_recognised_seconds,
          coalesce(legacy.custom_reason,'Moved from legacy external assignment'),coalesce(target_previous.revision,0)+1,legacy.template_snapshot,target_previous.id,legacy.created_by,null,
          legacy.ro_minutes,legacy.ro_original_start,legacy.ro_original_end,legacy.ro_direction
        );
      end if;
      update public.shift_assignment_revisions set is_current=false where id=legacy.id;
    end if;
  end loop;
end $$;

notify pgrst,'reload schema';
