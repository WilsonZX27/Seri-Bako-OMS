-- Qty Sent ownership closure: Outlet staff never enter dispatch quantities.
-- Kitchen and company-wide review roles may confirm or correct them.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'outlet_daily_record.qty_sent'
where r.role_code in ('manager', 'purchasing', 'finance')
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

-- Keep the permission resolution cache/API schema current without changing
-- Outlet access: Outlet staff are intentionally absent from this grant.
notify pgrst, 'reload schema';
