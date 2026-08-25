-- Manager is a company-wide operational reviewer. Remove the historical PR
-- authoring grants and make its inventory visibility explicit instead of
-- relying on the pr.create alias to open read-only inventory workspaces.

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.role_code = 'manager'
  and r.status = 'active'
  and r.deleted_at is null
  and p.permission_code in (
    'pr.create',
    'pr.submit',
    'purchase_request.create',
    'purchase_request.submit'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.permission_code in (
    'stock_balance.read',
    'stock_transactions.read',
    'low_stock.view'
  )
where r.role_code = 'manager'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;
