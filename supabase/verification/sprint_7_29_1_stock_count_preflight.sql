-- Sprint 7.29.1 Stock Count migration preflight (READ ONLY).
-- Run this against the intended NON-PRODUCTION target before applying 110.
-- Do not use `supabase db push`: local migrations 110 and 111 must be isolated.

-- 1. Confirm which of the two local versions the target has already recorded.
select version, name
from supabase_migrations.schema_migrations
where version in ('110', '111')
order by version;

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 1;

do $$
declare
  required_permissions text[] := array[
    'stock_count.read',
    'stock_count.create',
    'stock_count.update',
    'stock_count.post',
    'inventory.read',
    'stock.view',
    'stock_balance.read',
    'stock_transactions.read'
  ];
  missing_permissions text[];
begin
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version in ('110', '111')
  ) then
    raise exception 'Preflight requires migrations 110 and 111 to be pending.';
  end if;

  if not exists (
    select 1 from public.roles
    where role_code = 'kitchen' and status = 'active' and deleted_at is null
  ) then
    raise exception 'Preflight requires at least one active Kitchen role.';
  end if;

  select array_agg(required.permission_code order by required.permission_code)
  into missing_permissions
  from unnest(required_permissions) as required(permission_code)
  where not exists (
    select 1
    from public.permissions permission
    where permission.permission_code = required.permission_code
  );

  if missing_permissions is not null then
    raise exception 'Preflight is missing canonical permissions: %',
      array_to_string(missing_permissions, ', ');
  end if;
end;
$$;

-- 2. Every tenant Kitchen role that 110 will update is visible here.
select id, company_id, role_code, role_name, status
from public.roles
where role_code = 'kitchen'
  and status = 'active'
  and deleted_at is null
order by company_id, id;

-- 3. Confirm that every canonical permission required by migration 110 exists.
-- `stock_balances.view` is an application-only legacy alias for
-- `stock_balance.read`; it is not a database permission row.
with required(permission_code) as (
  values
    ('stock_count.read'),
    ('stock_count.create'),
    ('stock_count.update'),
    ('stock_count.post'),
    ('inventory.read'),
    ('stock.view'),
    ('stock_balance.read'),
    ('stock_transactions.read')
)
select
  required.permission_code,
  permission.id is not null as permission_exists
from required
left join public.permissions permission using (permission_code)
order by required.permission_code;

-- 4. This is informational before migration 110. Missing pre-migration grants
-- are expected because 110 owns the grant. Post-migration verification is
-- responsible for requiring every grant.
with required(permission_code) as (
  values
    ('stock_count.read'),
    ('stock_count.create'),
    ('stock_count.update'),
    ('stock_count.post'),
    ('inventory.read'),
    ('stock.view'),
    ('stock_balance.read'),
    ('stock_transactions.read')
),
kitchen as (
  select id, company_id
  from public.roles
  where role_code = 'kitchen' and status = 'active' and deleted_at is null
)
select
  kitchen.company_id,
  kitchen.id as kitchen_role_id,
  required.permission_code,
  exists (
    select 1
    from kitchen
    join public.role_permissions role_permission on role_permission.role_id = kitchen.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where permission.permission_code = required.permission_code
  ) as granted_to_kitchen
from required
cross join kitchen
order by kitchen.company_id, required.permission_code;

-- 5. Quantify legacy pending documents that must remain postable.
select status, count(*) as stock_count_count
from public.stock_counts
where deleted_at is null
  and status in ('draft', 'submitted', 'reviewed', 'approved', 'posted')
group by status
order by status;

-- 6. Inspect, rather than infer, the currently deployed posting function.
select pg_get_functiondef(procedure.oid) as deployed_function_definition
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'post_stock_count_atomic'
  and pg_get_function_identity_arguments(procedure.oid) = 'p_stock_count_id uuid';
