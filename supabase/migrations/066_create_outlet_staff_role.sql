-- Sprint 7.21.1: minimal assigned-outlet data-entry role, scoped per company.

insert into public.roles (company_id, role_code, role_name, description, status)
select
  c.id,
  'outlet_staff',
  'Outlet Staff',
  'Outlet worker who records daily received quantities, leftovers, and wastage for assigned outlets.',
  'active'
from public.companies c
where c.deleted_at is null
on conflict (company_id, role_code) do update set
  role_name = excluded.role_name,
  description = excluded.description,
  status = 'active';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'dashboard.view',
  'outlet_daily_record.view',
  'outlet_daily_record.create',
  'outlet_daily_record.update'
)
where r.role_code = 'outlet_staff'
  and r.company_id is not null
on conflict (role_id, permission_id) do nothing;
