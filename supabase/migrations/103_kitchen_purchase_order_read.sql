-- Sprint 7.23.7.1 — Kitchen receiving must be able to read its eligible PO.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'purchase_order.read'
where r.role_code = 'kitchen'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'documents.attach'
where r.role_code = 'finance'
on conflict (role_id, permission_id) do nothing;
