-- Sprint 7.2.21A: restore opening-stock access for operational owner roles.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'stock_transactions.create'
where r.role_code in ('super_admin', 'admin', 'operations_admin', 'purchasing')
on conflict (role_id, permission_id) do nothing;
