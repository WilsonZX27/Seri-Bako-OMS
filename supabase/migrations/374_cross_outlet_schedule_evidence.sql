begin;
-- Pending only. Read actual other-outlet roster evidence; never manufacture missing days.
create or replace function public.get_schedule_external_assignments_v2(p_branch_id uuid,p_week_start date)
returns table(staff_id uuid,work_date date,branch_id uuid,branch_name text,planned_start time,planned_end time,assignment_kind text,schedule_status text)
language sql security definer set search_path=public stable as $$
 with latest as (
  select distinct on(w.branch_id) w.* from public.schedule_weeks w
  where w.company_id=public.current_staff_company_id() and w.week_start=p_week_start
   and w.status in ('draft','returned','rejected','amendment_pending','submitted','published','locked')
  order by w.branch_id,w.revision desc
 )
 select a.staff_id,a.work_date,a.branch_id,b.branch_name,
  coalesce(a.custom_start,(a.template_snapshot->>'planned_start')::time),
  coalesce(a.custom_end,(a.template_snapshot->>'planned_end')::time),a.assignment_kind::text,w.status::text
 from public.shift_assignment_revisions a join latest w on w.id=a.schedule_week_id
 join public.branches b on b.id=a.branch_id and b.company_id=a.company_id
 where a.company_id=public.current_staff_company_id() and a.is_current and w.branch_id<>p_branch_id
  and a.work_date between p_week_start and p_week_start+6
  and a.assignment_kind in ('shift','off','ph','al','mc','upl','ro','oil','el')
  and public.has_permission('schedule.read') and public.can_access_company_branch(a.company_id,p_branch_id)
  and (exists(select 1 from public.staff_branches sb where sb.staff_id=a.staff_id and sb.branch_id=p_branch_id)
    or exists(select 1 from public.shift_assignment_revisions own join latest ow on ow.id=own.schedule_week_id
      where ow.branch_id=p_branch_id and own.company_id=a.company_id and own.staff_id=a.staff_id and own.is_current))
 order by a.work_date,b.branch_name,a.staff_id
$$;
revoke all on function public.get_schedule_external_assignments_v2(uuid,date) from public,anon;
grant execute on function public.get_schedule_external_assignments_v2(uuid,date) to authenticated;

-- Preserve the recorded activated Paid EL definition; fresh live drift guard required before activation.
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
          and ((a.schedule_week_id=w.id) or (a.assignment_kind in ('shift','off','ph','al','mc','upl','ro','oil','el') and aw.week_start=w.week_start and aw.branch_id<>w.branch_id and aw.status in ('draft','returned','rejected','amendment_pending','submitted','published','locked')
           and aw.id=(select latest.id from public.schedule_weeks latest where latest.company_id=w.company_id and latest.branch_id=aw.branch_id and latest.week_start=w.week_start and latest.status in ('draft','returned','rejected','amendment_pending','submitted','published','locked') order by latest.revision desc limit 1)))
      )
    order by s.full_name,d.work_date
   ) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','ineligible_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is not eligible for scheduling on '||q.work_date::text||'. Check employee status, employment dates and role.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and not public.is_staff_schedule_eligible(a.staff_id,a.work_date)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','emergency_leave_work_conflict','staffId',a.staff_id,'workDate',a.work_date,'message','Emergency Leave conflicts with a working shift on this employee day.')) from public.shift_assignment_revisions a where a.company_id=w.company_id and a.schedule_week_id=w.id and a.is_current and a.assignment_kind in ('el','shift') and exists(select 1 from public.shift_assignment_revisions other where other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.id<>a.id and ((a.assignment_kind='el' and other.assignment_kind='shift') or (a.assignment_kind='shift' and other.assignment_kind='el')))),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil','el'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $function$
;
notify pgrst, 'reload schema';
commit;
