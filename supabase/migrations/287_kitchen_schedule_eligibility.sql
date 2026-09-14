-- Include Kitchen employees in the canonical roster, save/import eligibility and
-- completeness checks. Existing tenant, branch, role-date and workflow gates remain.


create or replace function public.get_schedule_staff(p_branch_id uuid,p_week_id uuid default null) returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text)
language sql security definer set search_path=public stable as $$
 select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code
 from public.staffs s
 join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
 join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
 where s.company_id=public.current_staff_company_id() and s.deleted_at is null
   and s.status in ('active','invited') and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
   and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
   and (exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=p_branch_id)
     or exists(select 1 from public.shift_assignment_revisions a where a.staff_id=s.id and a.branch_id=p_branch_id and a.schedule_week_id=p_week_id and a.is_current))
 order by s.full_name,s.id
$$;

create or replace function public.get_schedule_staff_candidates(p_branch_id uuid)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text)
language sql security definer set search_path=public stable as $$
  select s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code
  from public.staffs s
  join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
  join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
  where s.company_id=public.current_staff_company_id() and s.deleted_at is null
    and s.status in ('active','invited') and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
    and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
  order by s.full_name,s.id
$$;

create or replace function public.is_staff_schedule_eligible(p_staff_id uuid,p_work_date date)
returns boolean
language sql security definer set search_path=public stable as $$
  select exists(
    select 1 from public.staffs s
    where s.id=p_staff_id and s.company_id=public.current_staff_company_id()
      and s.status in ('active','invited') and s.deleted_at is null
      and (
        exists(
          select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
          where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=p_work_date
            and (sr.effective_to is null or sr.effective_to>=p_work_date)
            and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
        )
        or (
          p_work_date<current_date
          and not exists(
            select 1 from public.staff_roles sr
            where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=p_work_date
              and (sr.effective_to is null or sr.effective_to>=p_work_date)
          )
          and exists(
            select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
            where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=current_date
              and (sr.effective_to is null or sr.effective_to>=current_date)
              and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
          )
        )
      )
  )
$$;

create or replace function public.validate_schedule_week(p_week_id uuid) returns jsonb
language plpgsql security definer set search_path=public stable as $$
declare w public.schedule_weeks; blockers jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id();
 if w.id is null or not public.has_permission('schedule.submit') or not public.can_access_company_branch(w.company_id,w.branch_id) then
  return jsonb_build_object('status','blocked','blockers',jsonb_build_array(jsonb_build_object('code','not_authorised','message','You do not have permission to submit this outlet schedule.')),'warnings',warnings);
 end if;
 if w.status not in ('draft','returned','rejected','amendment_pending') then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','not_editable','message','Only a Draft, Returned, Rejected, or Amendment Pending schedule can be submitted.')); end if;
 if not exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','no_assignments','message','Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.')); end if;
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','unresolved_staff_day','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has no schedule for '||to_char(q.work_date,'Dy, DD Mon')||'. Add a shift, OFF or leave, or schedule the employee at the destination outlet.')) from (
  select s.id staff_id,s.full_name,d.work_date from public.staffs s join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=w.branch_id cross join lateral generate_series(w.week_start,w.week_start+6,interval '1 day') d(work_date)
  where s.company_id=w.company_id and s.employment_type='full_time' and s.status='active' and s.deleted_at is null
   and exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=d.work_date::date and (sr.effective_to is null or sr.effective_to>=d.work_date::date) and r.role_code in ('outlet_staff','outlet_supervisor','kitchen'))
   and not exists(select 1 from public.shift_assignment_revisions a join public.schedule_weeks aw on aw.id=a.schedule_week_id where a.company_id=w.company_id and a.staff_id=s.id and a.work_date=d.work_date::date and a.is_current and (a.schedule_week_id=w.id or (aw.week_start=w.week_start and aw.branch_id<>w.branch_id and aw.status in ('submitted','published','locked'))))
  order by s.full_name,d.work_date
 ) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','inactive_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is inactive and must be removed before submission.')) from (select distinct a.staff_id,s.full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status not in ('active','invited') or s.deleted_at is not null)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $$;

notify pgrst,'reload schema';
