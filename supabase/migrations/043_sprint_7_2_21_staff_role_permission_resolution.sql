-- Sprint 7.2.21A: resolve permissions from the authenticated staff member's assigned roles.

create or replace function public.has_permission(permission text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id and r.status = 'active'
    left join public.role_permissions rp on rp.role_id = r.id
    left join public.permissions p on p.id = rp.permission_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active'
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
      and (r.role_code = 'admin' or p.permission_code = permission)
  )
$$;
