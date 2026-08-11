-- Repair the assigned-outlet role access path without changing record data or RLS boundaries.
-- The application middleware and database policies both require these capabilities.

insert into public.permissions (permission_code, module, action, description)
values
  ('dashboard.view', 'dashboard', 'view', 'Open the operational dashboard'),
  ('outlet_daily_record.view', 'outlet_daily_record', 'view', 'View assigned outlet daily records'),
  ('outlet_daily_record.create', 'outlet_daily_record', 'create', 'Create assigned outlet daily records'),
  ('outlet_daily_record.update', 'outlet_daily_record', 'update', 'Update unreviewed assigned outlet daily records')
on conflict (permission_code) do update
set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.permission_code in (
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
