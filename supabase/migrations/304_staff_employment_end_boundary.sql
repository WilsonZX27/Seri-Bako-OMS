-- Date-effective staff offboarding. Historical facts remain intact while
-- access and future scheduling stop after the employee's last working date.

alter table public.staffs
  add column if not exists employment_end_date date;

create index if not exists staffs_company_employment_end_idx
  on public.staffs(company_id, employment_end_date)
  where deleted_at is null and employment_end_date is not null;

create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path=pg_catalog,public as $$
  select s.id from public.staffs s
  where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null
    and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date)
  limit 1
$$;

create or replace function public.current_staff_company_id()
returns uuid language sql stable security definer set search_path=pg_catalog,public as $$
  select s.company_id from public.staffs s
  where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null
    and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date)
  limit 1
$$;

create or replace function public.is_staff_schedule_eligible(p_staff_id uuid,p_work_date date)
returns boolean language sql security definer set search_path=public stable as $$
  select exists(
    select 1 from public.staffs s
    where s.id=p_staff_id and s.company_id=public.current_staff_company_id()
      and s.status in ('active','invited') and s.deleted_at is null
      and (s.employment_end_date is null or p_work_date<=s.employment_end_date)
      and (
        exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
          where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=p_work_date
            and (sr.effective_to is null or sr.effective_to>=p_work_date)
            and r.role_code in ('outlet_staff','outlet_supervisor','kitchen'))
        or (p_work_date<current_date and not exists(select 1 from public.staff_roles sr where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=p_work_date and (sr.effective_to is null or sr.effective_to>=p_work_date))
          and exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id and r.company_id=s.company_id where sr.staff_id=s.id and sr.is_primary and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')))
      )
  )
$$;

drop function if exists public.get_schedule_staff(uuid,uuid);
create function public.get_schedule_staff(p_branch_id uuid,p_week_id uuid default null)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text,employment_end_date date)
language sql security definer set search_path=public stable as $$
 select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code,s.employment_end_date
 from public.staffs s
 join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true
 join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
 where s.company_id=public.current_staff_company_id() and s.deleted_at is null
   and s.status in ('active','invited') and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
   and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
   and (exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=p_branch_id)
     or exists(select 1 from public.shift_assignment_revisions a where a.staff_id=s.id and a.branch_id=p_branch_id and a.schedule_week_id=p_week_id and a.is_current))
   and ((sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date))
     or exists(select 1 from public.shift_assignment_revisions a where a.staff_id=s.id and a.branch_id=p_branch_id and a.schedule_week_id=p_week_id and a.is_current))
 order by s.full_name,s.id
$$;

drop function if exists public.get_schedule_staff_candidates(uuid);
create function public.get_schedule_staff_candidates(p_branch_id uuid)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text,employment_end_date date)
language sql security definer set search_path=public stable as $$
 select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code,s.employment_end_date
 from public.staffs s join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
 join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
 where s.company_id=public.current_staff_company_id() and s.deleted_at is null and s.status in ('active','invited')
   and (s.employment_end_date is null or s.employment_end_date>=(now() at time zone 'Asia/Kuala_Lumpur')::date)
   and r.role_code in ('outlet_staff','outlet_supervisor','kitchen')
   and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
 order by s.full_name,s.id
$$;

revoke all on function public.current_staff_id(),public.current_staff_company_id(),public.is_staff_schedule_eligible(uuid,date),public.get_schedule_staff(uuid,uuid),public.get_schedule_staff_candidates(uuid) from public,anon;
grant execute on function public.current_staff_id(),public.current_staff_company_id(),public.is_staff_schedule_eligible(uuid,date),public.get_schedule_staff(uuid,uuid),public.get_schedule_staff_candidates(uuid) to authenticated;

notify pgrst,'reload schema';
