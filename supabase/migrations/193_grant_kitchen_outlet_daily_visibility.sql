-- Kitchen must see outlet daily records in order to confirm dispatch quantities.
-- Outlet Staff remain outside both company-wide visibility and Qty Sent edit.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'outlet_daily_record.view_all',
  'outlet_daily_record.qty_sent'
)
where r.role_code = 'kitchen'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

notify pgrst, 'reload schema';
