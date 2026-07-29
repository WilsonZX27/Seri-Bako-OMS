-- Sprint 7.29.1 Stock Count posting verification (read-only).
-- Replace the two values in params before running in the Supabase SQL editor.

with params as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as stock_count_id,
    'kitchen@example.com'::text as kitchen_email
)
select
  sc.id,
  sc.count_no,
  sc.company_id,
  sc.branch_id,
  b.branch_name,
  sc.status,
  to_jsonb(sc)->>'posting_reference' as posting_reference,
  sc.count_date,
  sc.posted_at
from public.stock_counts sc
join params on params.stock_count_id = sc.id
left join public.branches b on b.id = sc.branch_id;

with params as (
  select '00000000-0000-0000-0000-000000000000'::uuid as stock_count_id
)
select
  line.line_position,
  line.id as stock_count_line_id,
  line.item_id,
  item.item_code,
  item.item_name,
  item.base_unit,
  line.uom,
  line.theoretical_qty,
  line.physical_qty,
  line.variance_qty
from public.stock_count_lines line
join params on params.stock_count_id = line.stock_count_id
join public.items item on item.id = line.item_id
order by line.line_position, line.id;

with params as (
  select '00000000-0000-0000-0000-000000000000'::uuid as stock_count_id
)
select
  transaction.id,
  transaction.transaction_no,
  transaction.status,
  transaction.branch_id,
  transaction.reference_type,
  transaction.reference_id,
  transaction.posted_at,
  line.id as transaction_line_id,
  line.item_id,
  line.quantity_in,
  line.quantity_out
from public.stock_transactions transaction
left join public.stock_transaction_lines line
  on line.stock_transaction_id = transaction.id
join params
  on transaction.reference_type = 'stock_count'
 and transaction.reference_id = params.stock_count_id
order by transaction.transaction_no, line.id;

with params as (
  select '00000000-0000-0000-0000-000000000000'::uuid as stock_count_id
)
select
  balance.branch_id,
  balance.item_id,
  balance.item_code,
  balance.item_name,
  balance.current_qty,
  balance.base_unit
from public.stock_balances_view balance
join public.stock_counts count_row
  on count_row.id = (select stock_count_id from params)
 and count_row.branch_id = balance.branch_id
join public.stock_count_lines count_line
  on count_line.stock_count_id = count_row.id
 and count_line.item_id = balance.item_id
order by balance.item_code;

with params as (
  select 'kitchen@example.com'::text as kitchen_email
)
select
  staff.email,
  role.role_code,
  permission.permission_code
from public.staffs staff
join params on lower(params.kitchen_email) = lower(staff.email)
join public.staff_roles staff_role on staff_role.staff_id = staff.id
join public.roles role on role.id = staff_role.role_id
join public.role_permissions role_permission on role_permission.role_id = role.id
join public.permissions permission on permission.id = role_permission.permission_id
where permission.permission_code in (
  'inventory.read',
  'stock.view',
  'stock_balance.read',
  'stock_transactions.read',
  'stock_count.read',
  'stock_count.create',
  'stock_count.update',
  'stock_count.post'
)
order by role.role_code, permission.permission_code;

with params as (
  select 'kitchen@example.com'::text as kitchen_email
)
select
  staff.email,
  branch.id as branch_id,
  branch.branch_name
from public.staffs staff
join params on lower(params.kitchen_email) = lower(staff.email)
join public.staff_branches staff_branch on staff_branch.staff_id = staff.id
join public.branches branch on branch.id = staff_branch.branch_id
order by branch.branch_name;

with params as (
  select '00000000-0000-0000-0000-000000000000'::uuid as stock_count_id
),
integrity as (
  select
    count_row.id,
    count_row.status,
    count(*) filter (where count_line.variance_qty <> 0) as nonzero_variance_lines,
    count(distinct transaction.id) as transaction_count
  from public.stock_counts count_row
  join params on params.stock_count_id = count_row.id
  left join public.stock_count_lines count_line
    on count_line.stock_count_id = count_row.id
  left join public.stock_transactions transaction
    on transaction.reference_type = 'stock_count'
   and transaction.reference_id = count_row.id
  group by count_row.id, count_row.status
)
select
  *,
  case
    when status <> 'posted' and transaction_count = 0
      then 'Not posted: Stock Balance should not change'
    when status = 'posted' and nonzero_variance_lines = 0 and transaction_count = 0
      then 'Valid zero-variance posting'
    when status = 'posted' and nonzero_variance_lines > 0 and transaction_count = 0
      then 'INTEGRITY ERROR: non-zero posted count has no transaction'
    when status = 'posted' and transaction_count > 0
      then 'Posted inventory movements exist'
    else 'Manual investigation required'
  end as diagnosis
from integrity;

select
  to_regprocedure('public.update_stock_count_draft_atomic(uuid,jsonb)') as update_draft_rpc,
  to_regprocedure('public.post_stock_count_atomic(uuid)') as post_rpc,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_counts'
      and column_name = 'posting_reference'
  ) as has_posting_reference,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_count_lines'
      and column_name = 'line_position'
  ) as has_line_position;

-- Migration boundary: 110 must be recorded and 111 must remain absent.
select
  exists (
    select 1 from supabase_migrations.schema_migrations where version = '110'
  ) as migration_110_recorded,
  not exists (
    select 1 from supabase_migrations.schema_migrations where version = '111'
  ) as migration_111_not_recorded;

-- Kitchen must receive exactly the eight canonical Stock Count dependencies.
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

-- Global posting integrity checks. Every result count must be zero.
select
  count(*) filter (
    where count_row.status = 'posted'
      and exists (
        select 1 from public.stock_count_lines line
        where line.stock_count_id = count_row.id and line.variance_qty <> 0
      )
      and not exists (
        select 1 from public.stock_transactions transaction
        where transaction.reference_type = 'stock_count'
          and transaction.reference_id = count_row.id
      )
  ) as posted_nonzero_without_transaction,
  count(*) filter (
    where count_row.posting_reference is not null
      and duplicate_reference.duplicate_count > 1
  ) as duplicate_posting_reference_rows
from public.stock_counts count_row
left join (
  select company_id, posting_reference, count(*) as duplicate_count
  from public.stock_counts
  where posting_reference is not null and deleted_at is null
  group by company_id, posting_reference
) duplicate_reference
  on duplicate_reference.company_id = count_row.company_id
 and duplicate_reference.posting_reference = count_row.posting_reference;

select count(*) as transaction_count_branch_mismatches
from public.stock_transactions transaction
join public.stock_counts count_row
  on transaction.reference_type = 'stock_count'
 and transaction.reference_id = count_row.id
where transaction.branch_id is distinct from count_row.branch_id;

-- The read model and posted ledger must agree for every materialized row.
with ledger as (
  select branch_id, item_id, sum(quantity_in - quantity_out) as current_qty
  from public.stock_transactions
  where status = 'posted'
  group by branch_id, item_id
)
select count(*) as stock_balance_ledger_mismatches
from public.stock_balances_view balance
left join ledger
  on ledger.branch_id = balance.branch_id
 and ledger.item_id = balance.item_id
where balance.current_qty is distinct from coalesce(ledger.current_qty, 0);
