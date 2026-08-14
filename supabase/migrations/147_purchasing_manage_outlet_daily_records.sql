-- Purchasing coordinates replenishment and must be able to inspect and correct
-- outlet receiving/wastage records across the company. Existing record-state
-- validation and tenant boundaries remain enforced by the save RPC and RLS.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'outlet_daily_record.view',
  'outlet_daily_record.view_all',
  'outlet_daily_record.update',
  'outlet_daily_record.qty_sent'
)
where r.role_code = 'purchasing'
  and r.status = 'active'
  and r.deleted_at is null
  and r.company_id is not null
on conflict (role_id, permission_id) do nothing;
