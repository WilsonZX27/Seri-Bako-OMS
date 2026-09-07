-- Finance owns the finance-review decision, including returning a request to
-- Purchasing for correction. Migration 266 added the RPC but omitted the
-- existing reject permission that the RPC checks.

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'pr.reject'
where r.role_code = 'finance'
  and r.status = 'active'
  and r.deleted_at is null
on conflict(role_id, permission_id) do nothing;

