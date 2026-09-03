-- Keep outlet roster membership independent from authentication activation.
-- Invited staff are valid workforce records even before their first login.
drop function if exists public.get_schedule_staff(uuid);

create function public.get_schedule_staff(p_branch_id uuid)
returns table(
  id uuid,
  full_name text,
  staff_code text,
  status public.record_status,
  employment_type text,
  role_code text
)
language sql
security definer
set search_path=public
stable
as $$
  select distinct
    s.id,
    s.full_name,
    s.staff_code,
    s.status,
    s.employment_type,
    r.role_code
  from public.staffs s
  join public.staff_branches sb
    on sb.staff_id=s.id
   and sb.branch_id=p_branch_id
  join public.staff_roles sr
    on sr.staff_id=s.id
   and sr.is_primary=true
   and sr.effective_from<=current_date
   and (sr.effective_to is null or sr.effective_to>=current_date)
  join public.roles r
    on r.id=sr.role_id
   and r.company_id=s.company_id
  where s.company_id=public.current_staff_company_id()
    and s.status in ('active','invited')
    and s.deleted_at is null
    and r.role_code in ('outlet_staff','outlet_supervisor')
    and public.can_access_company_branch(s.company_id,p_branch_id)
    and public.has_permission('schedule.read')
    and (
      s.id=public.current_staff_id()
      or public.has_any_permission(array[
        'schedule.draft',
        'schedule.submit',
        'schedule.approve',
        'schedule.swap_review'
      ])
    )
  order by s.full_name,s.id
$$;

revoke all on function public.get_schedule_staff(uuid) from public,anon;
grant execute on function public.get_schedule_staff(uuid) to authenticated;

comment on function public.get_schedule_staff(uuid) is
  'Returns active and invited outlet Staff/Supervisors assigned to the branch; login activation is not roster membership.';

notify pgrst,'reload schema';
