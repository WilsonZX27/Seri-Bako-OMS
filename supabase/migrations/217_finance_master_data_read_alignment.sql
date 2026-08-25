-- Finance has read-level visibility across the Purchasing master-data surface.
-- Keep the alignment intentionally read-only: mutation authority remains with
-- Purchasing (and the Owner bypass) through the existing action grants.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.permission_code in ('supplier_items.read', 'uom_conversions.read')
where r.role_code = 'finance'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;
