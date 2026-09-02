-- Align roster markers with the outlet schedule workbooks: PH and OIL are
-- explicit non-working states and participate in the weekly rest-day check.
alter table public.shift_assignment_revisions
  drop constraint if exists shift_assignment_revisions_assignment_kind_check;
alter table public.shift_assignment_revisions
  add constraint shift_assignment_revisions_assignment_kind_check
  check (assignment_kind in ('shift','off','ph','al','mc','upl','ro','oil'));

create or replace function public.submit_schedule_week(p_week_id uuid,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare w public.schedule_weeks; actor uuid:=public.current_staff_id(); prior_status text;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if w.id is null or not public.has_permission('schedule.submit') or not public.can_access_company_branch(w.company_id,w.branch_id) then raise exception 'Schedule submission is not authorised.'; end if;
 if w.status not in ('draft','returned','rejected','amendment_pending') then raise exception 'Only an editable roster may be submitted.'; end if;
 if not exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current) then raise exception 'A roster cannot be submitted without assignments.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status<>'active' or s.deleted_at is not null)) then raise exception 'Inactive staff cannot be scheduled.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) then raise exception 'Every scheduled employee requires at least one weekly OFF, public holiday, leave, or off-in-lieu day.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift' and other.assignment_kind='shift' and other.branch_id<>a.branch_id) then raise exception 'Cross-branch schedule collision detected.'; end if;
 prior_status:=w.status;
 update public.schedule_weeks set status='submitted',submitted_by=actor,submitted_at=now(),updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,'submit',prior_status,'submitted',actor,p_comment);
 return w;
end $$;

revoke all on function public.submit_schedule_week(uuid,text) from public,anon;
grant execute on function public.submit_schedule_week(uuid,text) to authenticated;
notify pgrst, 'reload schema';
