-- Sprint 7.2.21A: the item master permission codes predate the permission table.

insert into public.permissions (permission_code, module, action, description)
values
  ('items.create', 'items', 'create', 'Create item and product master records'),
  ('items.update', 'items', 'update', 'Update item and product master records')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('items.create', 'items.update')
where r.role_code in ('super_admin', 'admin', 'operations_admin', 'purchasing')
on conflict (role_id, permission_id) do nothing;
