-- Preserve the published-correction workflow introduced in migration 282,
-- while assigning composite-returning functions directly to row variables.
-- SELECT function(...) INTO a composite variable attempts to coerce the whole
-- returned row into its first field and can fail with SQLSTATE 22P02.

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
  source_status text;
begin
  if not public.has_permission('schedule.approve') or not public.has_permission('schedule.draft') then
    raise exception 'Schedule decision is not authorised.';
  end if;
  if nullif(trim(p_reason),'') is null then
    raise exception 'Manager correction reason is required.';
  end if;

  select * into roster
  from public.schedule_weeks
  where id=p_week_id and company_id=public.current_staff_company_id()
  for update;

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
  into before_assignments
  from public.shift_assignment_revisions a
  where a.schedule_week_id=roster.id and a.is_current;

  update public.schedule_weeks
  set status='amendment_pending',updated_at=now()
  where id=roster.id;

  saved_week := public.save_schedule_week(roster.branch_id,roster.week_start,p_assignments);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then
    raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.');
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb)
  into after_assignments
  from public.shift_assignment_revisions a
  where a.schedule_week_id=roster.id and a.is_current;

  update public.schedule_weeks
  set status='submitted',updated_at=now()
  where id=roster.id;

  insert into public.schedule_approval_events(
    company_id,schedule_week_id,event_type,from_status,to_status,
    actor_staff_id,comment,before_state,after_state
  ) values(
    roster.company_id,roster.id,'manager_edit',source_status,'submitted',
    public.current_staff_id(),trim(p_reason),
    jsonb_build_object('assignments',before_assignments),
    jsonb_build_object('assignments',after_assignments)
  );

  published_week := public.decide_schedule_week(roster.id,'approve',trim(p_reason));
  return jsonb_build_object(
    'week',to_jsonb(published_week),
    'warnings',coalesce(validation->'warnings','[]'::jsonb)
  );
end $$;

revoke all on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
