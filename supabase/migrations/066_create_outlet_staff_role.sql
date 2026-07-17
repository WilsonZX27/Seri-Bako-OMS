-- Sprint 7.21.1: minimal assigned-outlet data-entry role.

-- Update the role if it already exists.
update public.roles
set
  role_name = 'Outlet Staff',
  description = 'Outlet worker who records daily received quantities, leftovers, and wastage for assigned outlets.',
  status = 'active'
where role_code = 'outlet_staff';

-- Insert the role only when it does not already exist.
insert into public.roles (
  role_code,
  role_name,
  description,
  status
)
select
  'outlet_staff',
  'Outlet Staff',
  'Outlet worker who records daily received quantities, leftovers, and wastage for assigned outlets.',
  'active'
where not exists (
  select 1
  from public.roles
  where role_code = 'outlet_staff'
);

-- Assign only the minimum required permissions.
-- Use one canonical Outlet Staff role row in case legacy duplicates exist.
with target_role as (
  select id
  from public.roles
  where role_code = 'outlet_staff'
  order by id
  limit 1
),
target_permissions as (
  select id
  from public.permissions
  where permission_code in (
    'dashboard.view',
    'outlet_daily_record.view',
    'outlet_daily_record.create',
    'outlet_daily_record.update'
  )
)
insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from target_role r
cross join target_permissions p
where not exists (
  select 1
  from public.role_permissions rp
  where rp.role_id = r.id
    and rp.permission_id = p.id
);