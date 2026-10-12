-- Give destination-roster shifts a durable source identity so moving an
-- employee back home (or removing the day) retracts the old projection in the
-- same transaction instead of leaving two current shifts behind.

alter table public.shift_assignment_revisions
  add column if not exists projected_from_branch_id uuid references public.branches(id),
  add column if not exists projected_from_schedule_week_id uuid references public.schedule_weeks(id);

alter table public.shift_assignment_revisions
  drop constraint if exists shift_assignment_projection_source_pair;
alter table public.shift_assignment_revisions
  add constraint shift_assignment_projection_source_pair check (
    (projected_from_branch_id is null and projected_from_schedule_week_id is null)
    or
    (projected_from_branch_id is not null and projected_from_schedule_week_id is not null
      and projected_from_branch_id <> branch_id)
  );

-- Existing canonical away shifts predate provenance. Backfill only when the
-- employee has exactly one active branch membership and it differs from the
-- roster that owns the shift; ambiguous multi-branch staff remain untouched.
with unambiguous_home as (
  select sb.staff_id,min(sb.branch_id::text)::uuid branch_id
  from public.staff_branches sb
  group by sb.staff_id
  having count(distinct sb.branch_id)=1
), raw_candidates as (
  select a.id,home.branch_id source_branch_id,source_week.id source_week_id,
    count(*) over(partition by source_week.id,a.staff_id,a.work_date) candidate_count
  from public.shift_assignment_revisions a
  join public.schedule_weeks destination_week on destination_week.id=a.schedule_week_id
  join unambiguous_home home on home.staff_id=a.staff_id and home.branch_id<>a.branch_id
  join public.schedule_weeks source_week on source_week.company_id=a.company_id
    and source_week.branch_id=home.branch_id and source_week.week_start=destination_week.week_start
    and source_week.revision=1
  where a.is_current and a.assignment_kind='shift'
    and a.projected_from_branch_id is null and a.projected_from_schedule_week_id is null
), candidates as (
  select id,source_branch_id,source_week_id from raw_candidates where candidate_count=1
)
update public.shift_assignment_revisions a
set projected_from_branch_id=c.source_branch_id,
    projected_from_schedule_week_id=c.source_week_id
from candidates c where c.id=a.id;

create unique index if not exists schedule_assignment_one_current_projection
  on public.shift_assignment_revisions(projected_from_schedule_week_id,staff_id,work_date)
  where is_current and projected_from_schedule_week_id is not null;

create or replace function public.save_schedule_week_with_destinations(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb
) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
  company uuid:=public.current_staff_company_id();
  actor uuid:=public.current_staff_id();
  source_week public.schedule_weeks;
  result public.schedule_weeks;
  destination uuid;
  destination_week public.schedule_weeks;
  destination_payload jsonb;
  home_payload jsonb;
  incoming jsonb;
  payload_item jsonb;
  cleared record;
  cleared_count integer;
begin
  if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then
    raise exception 'Schedule draft is not authorised.';
  end if;
  if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then
    raise exception 'Invalid schedule week payload.';
  end if;

  select * into source_week from public.schedule_weeks
  where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1
  for update;
  if source_week.id is null then
    insert into public.schedule_weeks(company_id,branch_id,week_start,created_by)
    values(company,p_branch_id,p_week_start,actor) returning * into source_week;
  elsif source_week.status not in ('draft','returned','rejected','amendment_pending') or source_week.locked_at is not null then
    raise exception 'This schedule week is not editable.';
  end if;

  -- A removed or repatriated staff-day must retire its exact destination
  -- projection. Never rewrite an already submitted destination roster.
  for cleared in
    select a.id,a.schedule_week_id,w.status,w.locked_at
    from public.shift_assignment_revisions a
    join public.schedule_weeks w on w.id=a.schedule_week_id
    where a.company_id=company and a.is_current
      and a.projected_from_schedule_week_id=source_week.id
      and not exists (
        select 1 from jsonb_array_elements(p_assignments) item
        where (item->>'staff_id')::uuid=a.staff_id
          and (item->>'work_date')::date=a.work_date
          and nullif(item->>'destination_branch_id','')::uuid=a.branch_id
      )
    for update of a,w
  loop
    if cleared.status not in ('draft','returned','rejected','amendment_pending') or cleared.locked_at is not null then
      raise exception 'The previous destination outlet schedule is no longer editable.';
    end if;
    update public.shift_assignment_revisions set is_current=false where id=cleared.id;
    select count(*) into cleared_count from public.shift_assignment_revisions
      where schedule_week_id=cleared.schedule_week_id and is_current;
    insert into public.schedule_approval_events(
      company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state
    ) values (
      company,cleared.schedule_week_id,'projection_clear',cleared.status,cleared.status,actor,
      'Cross-outlet projection removed by its source roster.',
      jsonb_build_object('source_schedule_week_id',source_week.id,'assignment_id',cleared.id),
      jsonb_build_object('current_assignment_count',cleared_count)
    );
  end loop;

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

    incoming:=(select jsonb_agg(
      (value-'destination_branch_id')||jsonb_build_object(
        'work_site_label',null,
        '_projected_from_branch_id',p_branch_id,
        '_projected_from_schedule_week_id',source_week.id
      ))
      from jsonb_array_elements(p_assignments)
      where nullif(value->>'destination_branch_id','')::uuid=destination);

    destination_week:=null;
    select * into destination_week from public.schedule_weeks
      where company_id=company and branch_id=destination and week_start=p_week_start and revision=1
      for update;
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
        'ro_original_end',a.ro_original_end,'ro_direction',a.ro_direction,
        '_projected_from_branch_id',a.projected_from_branch_id,
        '_projected_from_schedule_week_id',a.projected_from_schedule_week_id)))
      from public.shift_assignment_revisions a
      where a.schedule_week_id=destination_week.id and a.is_current
        and not exists(select 1 from jsonb_array_elements(incoming) i
          where (i->>'staff_id')::uuid=a.staff_id and (i->>'work_date')::date=a.work_date)
    ),'[]'::jsonb)||incoming;

    destination_week:=public.save_schedule_week(destination,p_week_start,destination_payload);
    for payload_item in select value from jsonb_array_elements(destination_payload) loop
      update public.shift_assignment_revisions a set
        projected_from_branch_id=nullif(payload_item->>'_projected_from_branch_id','')::uuid,
        projected_from_schedule_week_id=nullif(payload_item->>'_projected_from_schedule_week_id','')::uuid
      where a.schedule_week_id=destination_week.id and a.is_current
        and a.staff_id=(payload_item->>'staff_id')::uuid
        and a.work_date=(payload_item->>'work_date')::date;
    end loop;
  end loop;

  -- Preserve provenance when a destination supervisor edits the projected
  -- canonical row in their own roster.
  select coalesce(jsonb_agg(
    (item.value-'destination_branch_id')||jsonb_strip_nulls(jsonb_build_object(
      '_projected_from_branch_id',previous.projected_from_branch_id,
      '_projected_from_schedule_week_id',previous.projected_from_schedule_week_id
    ))
  ),'[]'::jsonb) into home_payload
  from jsonb_array_elements(p_assignments) item(value)
  left join public.shift_assignment_revisions previous
    on previous.schedule_week_id=source_week.id and previous.is_current
    and previous.staff_id=(item.value->>'staff_id')::uuid
    and previous.work_date=(item.value->>'work_date')::date
  where nullif(item.value->>'destination_branch_id','') is null;

  result:=public.save_schedule_week(p_branch_id,p_week_start,home_payload);
  for payload_item in select value from jsonb_array_elements(home_payload) loop
    update public.shift_assignment_revisions a set
      projected_from_branch_id=nullif(payload_item->>'_projected_from_branch_id','')::uuid,
      projected_from_schedule_week_id=nullif(payload_item->>'_projected_from_schedule_week_id','')::uuid
    where a.schedule_week_id=result.id and a.is_current
      and a.staff_id=(payload_item->>'staff_id')::uuid
      and a.work_date=(payload_item->>'work_date')::date;
  end loop;
  return result;
end $$;

revoke all on function public.save_schedule_week_with_destinations(uuid,date,jsonb) from public,anon;
grant execute on function public.save_schedule_week_with_destinations(uuid,date,jsonb) to authenticated;

create or replace function public.copy_schedule_week(p_source_week_id uuid,p_target_week_start date)
returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare source public.schedule_weeks; result public.schedule_weeks; payload jsonb;
begin
  select * into source from public.schedule_weeks
  where id=p_source_week_id and company_id=public.current_staff_company_id();
  if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id)
    or extract(isodow from p_target_week_start)<>1 then
    raise exception 'Schedule copy is not authorised.';
  end if;

  select coalesce(jsonb_agg(row_payload order by staff_id,work_date),'[]'::jsonb) into payload
  from (
    select a.staff_id,a.work_date,
      jsonb_strip_nulls(jsonb_build_object(
        'staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),
        'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,
        'custom_start',a.custom_start,'custom_end',a.custom_end,
        'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,
        'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,
        'custom_reason',coalesce(a.custom_reason,'Copied from prior week'),'work_site_label',a.work_site_label,
        'ro_minutes',a.ro_minutes,'ro_original_start',a.ro_original_start,'ro_original_end',a.ro_original_end,
        'ro_direction',a.ro_direction
      )) row_payload
    from public.shift_assignment_revisions a
    where a.schedule_week_id=source.id and a.is_current
    union all
    select a.staff_id,a.work_date,
      jsonb_strip_nulls(jsonb_build_object(
        'staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),
        'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,
        'custom_start',a.custom_start,'custom_end',a.custom_end,
        'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,
        'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,
        'custom_reason',coalesce(a.custom_reason,'Copied from prior week'),
        'ro_minutes',a.ro_minutes,'ro_original_start',a.ro_original_start,'ro_original_end',a.ro_original_end,
        'ro_direction',a.ro_direction,'destination_branch_id',a.branch_id
      )) row_payload
    from public.shift_assignment_revisions a
    where a.projected_from_schedule_week_id=source.id and a.is_current
  ) copied;

  result:=public.save_schedule_week_with_destinations(source.branch_id,p_target_week_start,payload);
  return result;
end $$;

create or replace function public.edit_and_publish_schedule_week(
  p_week_id uuid,p_assignments jsonb,p_expected_updated_at timestamptz,p_reason text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare roster public.schedule_weeks; saved_week public.schedule_weeks; published_week public.schedule_weeks;
  before_assignments jsonb; after_assignments jsonb; validation jsonb; source_status text;
begin
  if not public.has_permission('schedule.approve') or not public.has_permission('schedule.draft') then
    raise exception 'Schedule decision is not authorised.';
  end if;
  if nullif(trim(p_reason),'') is null then raise exception 'Manager correction reason is required.'; end if;
  select * into roster from public.schedule_weeks
  where id=p_week_id and company_id=public.current_staff_company_id() for update;
  if roster.id is null or not public.can_access_company_branch(roster.company_id,roster.branch_id) then
    raise exception 'Schedule decision is not authorised.';
  end if;
  if roster.status not in ('submitted','published') or roster.locked_at is not null then
    raise exception 'Only a submitted or published unlocked roster may be corrected.';
  end if;
  if p_expected_updated_at is not null and roster.updated_at<>p_expected_updated_at then
    raise exception 'Schedule changed since it was opened.';
  end if;
  source_status:=roster.status;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb)
    into before_assignments from public.shift_assignment_revisions a
    where a.is_current and (a.schedule_week_id=roster.id or a.projected_from_schedule_week_id=roster.id);
  update public.schedule_weeks set status='amendment_pending',updated_at=now() where id=roster.id;
  saved_week:=public.save_schedule_week_with_destinations(roster.branch_id,roster.week_start,p_assignments);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then
    raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.');
  end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb)
    into after_assignments from public.shift_assignment_revisions a
    where a.is_current and (a.schedule_week_id=roster.id or a.projected_from_schedule_week_id=roster.id);
  update public.schedule_weeks set status='submitted',updated_at=now() where id=roster.id;
  insert into public.schedule_approval_events(
    company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state
  ) values (
    roster.company_id,roster.id,'manager_edit',source_status,'submitted',public.current_staff_id(),trim(p_reason),
    jsonb_build_object('assignments',before_assignments),jsonb_build_object('assignments',after_assignments)
  );
  published_week:=public.decide_schedule_week(roster.id,'approve',trim(p_reason));
  return jsonb_build_object('week',to_jsonb(published_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

revoke all on function public.copy_schedule_week(uuid,date) from public,anon;
grant execute on function public.copy_schedule_week(uuid,date) to authenticated;
revoke all on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) to authenticated;

notify pgrst,'reload schema';
