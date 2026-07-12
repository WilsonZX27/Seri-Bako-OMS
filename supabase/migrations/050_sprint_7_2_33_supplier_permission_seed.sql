-- Sprint 7.2.33: seed supplier permissions used by supplier RLS.
-- 049 switched supplier writes to public.has_permission('suppliers.create/update');
-- older environments may not yet have those permission rows.

insert into public.permissions (permission_code, module, action, description)
values
  ('suppliers.create', 'suppliers', 'create', 'Create supplier master records'),
  ('suppliers.update', 'suppliers', 'update', 'Update supplier master records'),
  ('suppliers.manage', 'suppliers', 'manage', 'Manage supplier master records')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('suppliers.create', 'suppliers.update', 'suppliers.manage')
where r.role_code in ('super_admin', 'operations_admin', 'purchasing', 'admin')
on conflict (role_id, permission_id) do nothing;
