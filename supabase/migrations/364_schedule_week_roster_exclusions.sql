begin;
-- Explicit week-only exclusions: never change employment or branch access.
-- Existing assignment, version, destination and submission checks remain authoritative.
alter table public.schedule_weeks add column if not exists excluded_staff_ids uuid[] not null default '{}';

create or replace function public.save_schedule_week_roster(
 p_branch_id uuid, p_week_start date, p_assignments jsonb,
 p_excluded_staff_ids uuid[], p_expected_updated_at timestamptz default null
) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare current_week public.schedule_weeks; saved_week public.schedule_weeks; excluded uuid[];
begin
 if not public.has_permission('schedule.draft') or not public.can_access_company_branch(public.current_staff_company_id(),p_branch_id) then
   raise exception 'Schedule submission is not authorised.';
 end if;
 -- Serialize first saves as well as edits for this tenant/outlet/week.
 perform pg_advisory_xact_lock(hashtextextended(public.current_staff_company_id()::text||':'||p_branch_id::text||':'||p_week_start::text,0));
 select * into current_week from public.schedule_weeks where company_id=public.current_staff_company_id() and branch_id=p_branch_id and week_start=p_week_start order by revision desc limit 1 for update;
 if current_week.id is not null and p_expected_updated_at is not null and current_week.updated_at<>p_expected_updated_at then
   raise exception 'Schedule changed since it was opened.';
 end if;
 excluded := array(select distinct id from unnest(coalesce(p_excluded_staff_ids,'{}'::uuid[])) id order by id);
 if exists(select 1 from unnest(excluded) removed(staff_id) where not exists(select 1 from public.staffs s where s.id=removed.staff_id and s.company_id=public.current_staff_company_id())) then
   raise exception 'Removed employees must belong to this company.';
 end if;
 if exists(select 1 from jsonb_array_elements(p_assignments) a where (a->>'staff_id')::uuid=any(excluded)) then
   raise exception 'A removed employee still has assignments in this outlet week.';
 end if;
 saved_week := public.save_schedule_week_with_destinations(p_branch_id,p_week_start,p_assignments);
 update public.schedule_weeks set excluded_staff_ids=excluded where id=saved_week.id returning * into saved_week;
 if coalesce(current_week.excluded_staff_ids,'{}'::uuid[]) is distinct from excluded then
   insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state)
   values(saved_week.company_id,saved_week.id,'roster_membership',saved_week.status,saved_week.status,public.current_staff_id(),'Week-only employee exclusions updated.',jsonb_build_object('excluded_staff_ids',coalesce(current_week.excluded_staff_ids,'{}'::uuid[])),jsonb_build_object('excluded_staff_ids',excluded));
 end if;
 return saved_week;
end $$;
revoke all on function public.save_schedule_week_roster(uuid,date,jsonb,uuid[],timestamptz) from public,anon;
grant execute on function public.save_schedule_week_roster(uuid,date,jsonb,uuid[],timestamptz) to authenticated;

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
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $function$
;

create or replace function public.submit_schedule_week_roster(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb,
  p_excluded_staff_ids uuid[],
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
  perform pg_advisory_xact_lock(hashtextextended(public.current_staff_company_id()::text||':'||p_branch_id::text||':'||p_week_start::text,0));
  select * into current_week from public.schedule_weeks
   where company_id=public.current_staff_company_id() and branch_id=p_branch_id and week_start=p_week_start
   order by revision desc limit 1 for update;
  if current_week.id is not null and p_expected_updated_at is not null and current_week.updated_at<>p_expected_updated_at then
    raise exception 'Schedule changed since it was opened.';
  end if;
  saved_week := public.save_schedule_week_roster(p_branch_id,p_week_start,p_assignments,p_excluded_staff_ids,p_expected_updated_at);
  validation:=public.validate_schedule_week(saved_week.id);
  if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then
    raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.');
  end if;
  submitted_week := public.submit_schedule_week(saved_week.id,p_comment);
  return jsonb_build_object('week',to_jsonb(submitted_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

revoke all on function public.submit_schedule_week_roster(uuid,date,jsonb,uuid[],timestamptz,text) from public,anon;
grant execute on function public.submit_schedule_week_roster(uuid,date,jsonb,uuid[],timestamptz,text) to authenticated;
-- Import/copy and older clients re-adding a real assignment must also restore membership.
create or replace function public.restore_schedule_roster_member()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.is_current then
   update public.schedule_weeks set excluded_staff_ids=array_remove(excluded_staff_ids,new.staff_id)
    where id=new.schedule_week_id and company_id=new.company_id and new.staff_id=any(excluded_staff_ids);
 end if;
 return new;
end $$;
revoke all on function public.restore_schedule_roster_member() from public,anon,authenticated;
drop trigger if exists restore_schedule_roster_member on public.shift_assignment_revisions;
create trigger restore_schedule_roster_member after insert or update of is_current on public.shift_assignment_revisions
for each row execute function public.restore_schedule_roster_member();

create or replace function public.edit_and_publish_schedule_week_roster(
  p_week_id uuid,p_assignments jsonb,p_expected_updated_at timestamptz,p_reason text,p_excluded_staff_ids uuid[]
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
  if exists(select 1 from unnest(coalesce(p_excluded_staff_ids,'{}'::uuid[])) removed(staff_id) where not exists(select 1 from public.staffs s where s.id=removed.staff_id and s.company_id=roster.company_id)) then
    raise exception 'Removed employees must belong to this company.';
  end if;
  if exists(select 1 from jsonb_array_elements(p_assignments) a where (a->>'staff_id')::uuid=any(p_excluded_staff_ids)) then
    raise exception 'A removed employee still has assignments in this outlet week.';
  end if;
  update public.schedule_weeks set excluded_staff_ids=coalesce(p_excluded_staff_ids,'{}'::uuid[]) where id=roster.id;
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
    jsonb_build_object('assignments',before_assignments,'excluded_staff_ids',roster.excluded_staff_ids),jsonb_build_object('assignments',after_assignments,'excluded_staff_ids',p_excluded_staff_ids)
  );
  published_week:=public.decide_schedule_week(roster.id,'approve',trim(p_reason));
  return jsonb_build_object('week',to_jsonb(published_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;
revoke all on function public.edit_and_publish_schedule_week_roster(uuid,jsonb,timestamptz,text,uuid[]) from public,anon;
grant execute on function public.edit_and_publish_schedule_week_roster(uuid,jsonb,timestamptz,text,uuid[]) to authenticated;

notify pgrst, 'reload schema';

commit;
