-- Sprint 7.2.21A: legacy environments can have the ledger tables without this permission seed.

insert into public.permissions (permission_code, module, action, description)
values ('stock_transactions.create', 'stock_transactions', 'create', 'Create stock transactions')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'stock_transactions.create'
where r.role_code in ('super_admin', 'admin', 'operations_admin', 'purchasing')
on conflict (role_id, permission_id) do nothing;
