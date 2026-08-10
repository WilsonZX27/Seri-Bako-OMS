-- Repair access for tenants whose Outlet Staff role was created after the
-- original role seed migration. This is authorization metadata only; it does
-- not broaden branch scope or change outlet daily record business rules.

insert into public.permissions (permission_code, module, action, description)
values
  ('outlet_daily_record.view', 'outlet_daily_record', 'view', 'View outlet daily receiving and wastage records'),
  ('outlet_daily_record.create', 'outlet_daily_record', 'create', 'Create outlet daily records'),
  ('outlet_daily_record.update', 'outlet_daily_record', 'update', 'Update unreviewed outlet daily records')
on conflict (permission_code) do update
set description = excluded.description;

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
  and r.status = 'active'
  and r.deleted_at is null
  and r.company_id is not null
on conflict (role_id, permission_id) do nothing;

