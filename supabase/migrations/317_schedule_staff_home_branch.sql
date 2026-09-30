-- Expose the home outlet in the existing bounded roster RPC so borrowed shifts have one visual authority.
drop function if exists public.get_schedule_staff(uuid,uuid);
create function public.get_schedule_staff(p_branch_id uuid,p_week_id uuid default null)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text,employment_end_date date,default_branch_id uuid)
language sql security definer set search_path=public stable as $$
 select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code,s.employment_end_date,s.default_branch_id
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

revoke all on function public.get_schedule_staff(uuid,uuid) from public,anon;
grant execute on function public.get_schedule_staff(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
