-- Sprint 7.22.1: align Kitchen's database permission with its intended PR workflow.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'pr.submit'
where r.role_code in ('kitchen', 'kitchen_staff')
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

do $$
begin
  if exists (
    select 1
    from public.roles r
    where r.role_code in ('kitchen', 'kitchen_staff')
      and r.status = 'active'
      and r.deleted_at is null
      and not exists (
        select 1
        from public.role_permissions rp
        join public.permissions p on p.id = rp.permission_id
        where rp.role_id = r.id and p.permission_code = 'pr.submit'
      )
  ) then
    raise exception 'Kitchen pr.submit permission verification failed.';
  end if;
end
$$;
