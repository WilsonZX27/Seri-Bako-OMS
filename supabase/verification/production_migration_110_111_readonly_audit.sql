-- Production migration 110/111 read-only audit
-- Run manually in Supabase Dashboard > SQL Editor.
-- This file intentionally contains no DDL, DML, business RPC invocation, or secrets.
-- Every executable section is isolated so a failure does not abort later sections.

-- ============================================================================
-- 01. Connection identity and read-only proof
-- ============================================================================
begin transaction read only;

select
  current_database() as database_name,
  current_user as database_user,
  inet_server_addr() as server_address,
  inet_server_port() as server_port,
  current_setting('server_version') as postgres_version,
  current_setting('transaction_read_only') as transaction_read_only;

select
  exists (
    select 1
    from information_schema.schemata
    where schema_name = 'supabase_migrations'
  ) as migration_schema_exists;

rollback;

-- ============================================================================
-- 02. Migration history from 107 onward (statements deliberately excluded)
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  to_jsonb(migration) - 'statements' as migration_metadata
from supabase_migrations.schema_migrations migration
where migration.version >= '107'
order by migration.version;

select
  count(*) filter (where version = '110') as migration_110_rows,
  count(*) filter (where version = '111') as migration_111_rows,
  count(*) filter (where version >= '112') as migration_112_or_later_rows,
  count(*) - count(distinct version) as duplicate_version_rows
from supabase_migrations.schema_migrations
where version >= '107';

rollback;

-- ============================================================================
-- 03. Migration 110 schema discovery
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  expected.object_name,
  case expected.object_kind
    when 'column' then exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = expected.schema_name
        and column_info.table_name = expected.parent_name
        and column_info.column_name = expected.object_name
    )
    when 'procedure' then exists (
      select 1
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = expected.schema_name
        and procedure.proname = expected.object_name
    )
    when 'index' then exists (
      select 1
      from pg_indexes index_info
      where index_info.schemaname = expected.schema_name
        and index_info.indexname = expected.object_name
    )
  end as object_exists,
  expected.object_kind,
  expected.parent_name
from (
  values
    ('public', 'stock_counts', 'posting_reference', 'column'),
    ('public', 'stock_count_lines', 'line_position', 'column'),
    ('public', null, 'update_stock_count_draft_atomic', 'procedure'),
    ('public', null, 'post_stock_count_atomic', 'procedure'),
    ('public', 'stock_counts', 'stock_counts_company_posting_reference_idx', 'index'),
    ('public', 'stock_count_lines', 'stock_count_lines_count_position_idx', 'index')
) as expected(schema_name, parent_name, object_name, object_kind)
order by expected.object_kind, expected.object_name;

select
  index_info.schemaname,
  index_info.tablename,
  index_info.indexname,
  index_info.indexdef
from pg_indexes index_info
where index_info.schemaname = 'public'
  and index_info.tablename in ('stock_counts', 'stock_count_lines')
  and (
    index_info.indexname in (
      'stock_counts_company_posting_reference_idx',
      'stock_count_lines_count_position_idx'
    )
    or index_info.indexdef ilike '%posting_reference%'
    or index_info.indexdef ilike '%line_position%'
  )
order by index_info.tablename, index_info.indexname;

select
  constraint_info.conname as constraint_name,
  constraint_info.contype as constraint_type,
  constraint_info.conrelid::regclass as relation_name,
  pg_get_constraintdef(constraint_info.oid) as definition
from pg_constraint constraint_info
where constraint_info.connamespace = 'public'::regnamespace
  and constraint_info.conrelid in (
    to_regclass('public.stock_counts'),
    to_regclass('public.stock_count_lines')
  )
  and (
    pg_get_constraintdef(constraint_info.oid) ilike '%posting_reference%'
    or pg_get_constraintdef(constraint_info.oid) ilike '%line_position%'
  )
order by
  constraint_info.conrelid::regclass::text,
  constraint_info.conname;

rollback;

-- ============================================================================
-- 04. Migration 110 function definitions
-- Compare these exported definitions with canonical migration 110 locally.
-- This query does not invoke either business function.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  procedure.oid::regprocedure as signature,
  pg_get_functiondef(procedure.oid) as definition
from pg_proc procedure
join pg_namespace namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname in (
    'update_stock_count_draft_atomic',
    'post_stock_count_atomic'
  )
order by procedure.proname, procedure.oid::regprocedure::text;

rollback;

-- ============================================================================
-- 05. Canonical permission rows and accidental legacy alias
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

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
  (permission.id is not null) as permission_row_exists
from required
left join public.permissions permission
  on permission.permission_code = required.permission_code
order by required.permission_code;

select
  exists (
    select 1
    from public.permissions
    where permission_code = 'stock_balances.view'
  ) as legacy_stock_balances_view_row_exists,
  (
    select count(*)
    from public.role_permissions role_permission
    join public.permissions permission
      on permission.id = role_permission.permission_id
    where permission.permission_code = 'stock_balances.view'
  ) as legacy_stock_balances_view_grant_count;

rollback;

-- ============================================================================
-- 06. Active Kitchen roles and canonical grants by tenant/company
-- No staff identity or personal data is returned.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

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
kitchen_roles as (
  select role.id, role.company_id, role.role_code, role.status
  from public.roles role
  where role.role_code = 'kitchen'
    and role.status = 'active'
    and role.deleted_at is null
),
grants as (
  select
    role.id as role_id,
    permission.permission_code
  from kitchen_roles role
  join public.role_permissions role_permission
    on role_permission.role_id = role.id
  join public.permissions permission
    on permission.id = role_permission.permission_id
)
select
  role.company_id,
  role.id as role_id,
  role.role_code,
  role.status,
  count(grant_row.permission_code) as canonical_grant_count,
  array_agg(required.permission_code order by required.permission_code)
    filter (where grant_row.permission_code is null) as missing_permissions,
  array_agg(grant_row.permission_code order by grant_row.permission_code)
    filter (where grant_row.permission_code is not null) as granted_permissions
from kitchen_roles role
cross join required
left join grants grant_row
  on grant_row.role_id = role.id
 and grant_row.permission_code = required.permission_code
group by role.company_id, role.id, role.role_code, role.status
order by role.company_id, role.id;

select
  role.company_id,
  role.id as role_id,
  count(distinct staff_role.staff_id) as assigned_staff_count,
  count(distinct staff_branch.branch_id) as assigned_branch_count
from public.roles role
left join public.staff_roles staff_role
  on staff_role.role_id = role.id
 and staff_role.effective_from <= current_date
 and (staff_role.effective_to is null or staff_role.effective_to >= current_date)
left join public.staff_branches staff_branch
  on staff_branch.staff_id = staff_role.staff_id
where role.role_code = 'kitchen'
  and role.status = 'active'
  and role.deleted_at is null
group by role.company_id, role.id
order by role.company_id, role.id;

select
  role.company_id,
  role.id as role_id,
  array_agg(permission.permission_code order by permission.permission_code)
    as potentially_purchasing_only_grants
from public.roles role
join public.role_permissions role_permission
  on role_permission.role_id = role.id
join public.permissions permission
  on permission.id = role_permission.permission_id
where role.role_code = 'kitchen'
  and role.status = 'active'
  and role.deleted_at is null
  and (
    permission.permission_code like 'purchase_order.%'
    or permission.permission_code like 'purchase_request.%'
    or permission.permission_code like 'supplier.%'
    or permission.permission_code like 'purchasing.%'
  )
group by role.company_id, role.id
order by role.company_id, role.id;

rollback;

-- ============================================================================
-- 07. Migration 111 object, index, constraint, grant, and safe data discovery
-- Exact stock-hold row counts require the optional section at the end.
-- reltuples/n_live_tup below are catalog/statistics estimates, not exact counts.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  to_regclass('public.purchase_request_stock_holds') is not null
    as stock_holds_table_exists,
  exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'create_central_kitchen_purchase_request_atomic'
  ) as central_kitchen_pr_function_exists;

select
  table_info.schemaname,
  table_info.relname as table_name,
  table_info.n_live_tup as estimated_live_rows,
  table_info.last_analyze,
  table_info.last_autoanalyze
from pg_stat_user_tables table_info
where table_info.schemaname = 'public'
  and table_info.relname = 'purchase_request_stock_holds';

select
  index_info.schemaname,
  index_info.tablename,
  index_info.indexname,
  index_info.indexdef
from pg_indexes index_info
where index_info.schemaname = 'public'
  and index_info.tablename = 'purchase_request_stock_holds'
order by index_info.indexname;

select
  constraint_info.conname as constraint_name,
  constraint_info.contype as constraint_type,
  pg_get_constraintdef(constraint_info.oid) as definition
from pg_constraint constraint_info
where constraint_info.conrelid = to_regclass('public.purchase_request_stock_holds')
order by constraint_info.conname;

select
  procedure.oid::regprocedure as signature,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    as authenticated_can_execute,
  has_function_privilege('anon', procedure.oid, 'EXECUTE')
    as anon_can_execute,
  has_function_privilege('public', procedure.oid, 'EXECUTE')
    as public_can_execute
from pg_proc procedure
join pg_namespace namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'create_central_kitchen_purchase_request_atomic'
order by procedure.oid::regprocedure::text;

select
  count(*) as central_kitchen_pr_activity_log_count
from public.activity_logs activity
where activity.entity_type = 'purchase_request'
  and (
    activity.message = 'Central kitchen purchase request created'
    or activity.activity_type = 'central_kitchen_purchase_request_created'
  );

rollback;

-- ============================================================================
-- 08. Stock Count status and posting-reference integrity
-- to_jsonb keeps this compatible when posting_reference has not been added.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  stock_count.status::text as status,
  count(*) as stock_count_count
from public.stock_counts stock_count
where stock_count.deleted_at is null
  and stock_count.status::text in (
    'draft', 'submitted', 'reviewed', 'approved', 'posted'
  )
group by stock_count.status::text
order by stock_count.status::text;

select
  count(*) filter (
    where stock_count.status::text = 'posted'
      and nullif(to_jsonb(stock_count) ->> 'posting_reference', '') is null
  ) as posted_without_posting_reference,
  count(*) filter (
    where stock_count.status::text = 'posted'
      and nullif(to_jsonb(stock_count) ->> 'posting_reference', '') is not null
  ) as posted_with_posting_reference
from public.stock_counts stock_count
where stock_count.deleted_at is null;

select
  stock_count.company_id,
  to_jsonb(stock_count) ->> 'posting_reference' as posting_reference,
  count(*) as duplicate_count,
  array_agg(left(stock_count.id::text, 8) order by stock_count.id)
    as stock_count_id_prefixes
from public.stock_counts stock_count
where stock_count.deleted_at is null
  and nullif(to_jsonb(stock_count) ->> 'posting_reference', '') is not null
group by
  stock_count.company_id,
  to_jsonb(stock_count) ->> 'posting_reference'
having count(*) > 1
order by stock_count.company_id, posting_reference;

rollback;

-- ============================================================================
-- 09. Stock Count movement integrity
-- One stock_count_adjustment movement is expected per non-zero variance line.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

with count_lines as (
  select
    stock_count.id as stock_count_id,
    stock_count.count_no,
    stock_count.branch_id,
    stock_count.status::text as count_status,
    count(*) filter (
      where stock_count_line.physical_qty <> stock_count_line.theoretical_qty
    ) as non_zero_line_count,
    count(*) filter (
      where stock_count_line.physical_qty = stock_count_line.theoretical_qty
    ) as zero_line_count
  from public.stock_counts stock_count
  join public.stock_count_lines stock_count_line
    on stock_count_line.stock_count_id = stock_count.id
  where stock_count.deleted_at is null
  group by
    stock_count.id,
    stock_count.count_no,
    stock_count.branch_id,
    stock_count.status::text
),
movements as (
  select
    stock_transaction.reference_id as stock_count_id,
    count(*) as movement_count,
    count(distinct stock_transaction.transaction_no) as distinct_reference_count,
    count(*) filter (
      where stock_transaction.branch_id is distinct from stock_count.branch_id
    ) as branch_mismatch_count
  from public.stock_transactions stock_transaction
  join public.stock_counts stock_count
    on stock_count.id = stock_transaction.reference_id
  where stock_transaction.reference_type = 'stock_count'
    and stock_transaction.transaction_type::text = 'stock_count_adjustment'
    and stock_transaction.status::text = 'posted'
  group by stock_transaction.reference_id
)
select
  count(*) filter (
    where count_line.count_status = 'posted'
      and count_line.non_zero_line_count > 0
      and coalesce(movement.movement_count, 0) = 0
  ) as posted_non_zero_without_movement,
  count(*) filter (
    where count_line.count_status = 'posted'
      and count_line.non_zero_line_count = 0
      and coalesce(movement.movement_count, 0) > 0
  ) as zero_variance_with_movement,
  count(*) filter (
    where coalesce(movement.movement_count, 0) > count_line.non_zero_line_count
  ) as counts_with_excess_movements,
  count(*) filter (
    where coalesce(movement.movement_count, 0)
      <> coalesce(movement.distinct_reference_count, 0)
  ) as counts_with_duplicate_transaction_reference,
  count(*) filter (
    where coalesce(movement.branch_mismatch_count, 0) > 0
  ) as counts_with_branch_mismatch
from count_lines count_line
left join movements movement
  on movement.stock_count_id = count_line.stock_count_id;

select
  stock_count.count_no,
  left(stock_count.id::text, 8) as stock_count_id_prefix,
  stock_count.status::text as status,
  stock_count.branch_id,
  count(stock_transaction.id) as posted_movement_count,
  count(distinct stock_transaction.transaction_no)
    as distinct_transaction_reference_count
from public.stock_counts stock_count
left join public.stock_transactions stock_transaction
  on stock_transaction.reference_type = 'stock_count'
 and stock_transaction.reference_id = stock_count.id
 and stock_transaction.transaction_type::text = 'stock_count_adjustment'
 and stock_transaction.status::text = 'posted'
where stock_count.deleted_at is null
  and stock_count.status::text = 'posted'
group by stock_count.id, stock_count.count_no, stock_count.status::text, stock_count.branch_id
having count(stock_transaction.id)
  <> count(distinct stock_transaction.transaction_no)
order by stock_count.count_no;

rollback;

-- ============================================================================
-- 10. Transaction-line direction, UOM, and branch integrity
-- UOM is compared with the Stock Count snapshot UOM through the related item.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  count(*) filter (
    where stock_transaction.quantity_in < 0
       or stock_transaction.quantity_out < 0
       or (
         stock_transaction.quantity_in > 0
         and stock_transaction.quantity_out > 0
       )
       or (
         stock_transaction.quantity_in = 0
         and stock_transaction.quantity_out = 0
       )
  ) as invalid_transaction_direction_count,
  count(*) filter (
    where stock_transaction.branch_id is distinct from stock_count.branch_id
  ) as transaction_branch_mismatch_count,
  count(*) filter (
    where transaction_line.branch_id is distinct from stock_count.branch_id
  ) as transaction_line_branch_mismatch_count,
  count(*) filter (
    where transaction_line.item_id is null
  ) as movement_line_without_item_count,
  count(*) filter (
    where item.base_unit is distinct from stock_count_line.uom
  ) as count_line_uom_mismatch_count
from public.stock_transactions stock_transaction
join public.stock_counts stock_count
  on stock_count.id = stock_transaction.reference_id
left join public.stock_transaction_lines transaction_line
  on transaction_line.stock_transaction_id = stock_transaction.id
left join public.stock_count_lines stock_count_line
  on stock_count_line.stock_count_id = stock_count.id
 and stock_count_line.item_id = coalesce(transaction_line.item_id, stock_transaction.item_id)
left join public.items item
  on item.id = stock_count_line.item_id
where stock_transaction.reference_type = 'stock_count'
  and stock_transaction.transaction_type::text = 'stock_count_adjustment'
  and stock_transaction.status::text = 'posted';

rollback;

-- ============================================================================
-- 11. Posted ledger versus stock_balances_view
-- A zero-row result means no mismatch was found.
-- ============================================================================
begin transaction read only;

select current_database() as database_name, current_user as database_user,
  inet_server_addr() as server_address, inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

with ledger_balance as (
  select
    item.company_id,
    stock_transaction.branch_id,
    stock_transaction.item_id,
    sum(stock_transaction.quantity_in - stock_transaction.quantity_out) as ledger_qty
  from public.stock_transactions stock_transaction
  join public.items item
    on item.id = stock_transaction.item_id
  where stock_transaction.status::text = 'posted'
  group by
    item.company_id,
    stock_transaction.branch_id,
    stock_transaction.item_id
),
view_balance as (
  select
    item.company_id,
    balance.branch_id,
    balance.item_id,
    balance.current_stock as view_qty
  from public.stock_balances_view balance
  join public.items item on item.id = balance.item_id
)
select
  coalesce(ledger.company_id, view_row.company_id) as company_id,
  coalesce(ledger.branch_id, view_row.branch_id) as branch_id,
  left(coalesce(ledger.item_id, view_row.item_id)::text, 8) as item_id_prefix,
  coalesce(ledger.ledger_qty, 0) as ledger_qty,
  coalesce(view_row.view_qty, 0) as stock_balance_qty,
  coalesce(ledger.ledger_qty, 0) - coalesce(view_row.view_qty, 0) as difference
from ledger_balance ledger
full join view_balance view_row
  on view_row.company_id = ledger.company_id
 and view_row.branch_id = ledger.branch_id
 and view_row.item_id = ledger.item_id
where coalesce(ledger.ledger_qty, 0) is distinct from coalesce(view_row.view_qty, 0)
order by company_id, branch_id, item_id_prefix;

rollback;

-- ============================================================================
-- OPTIONAL 111 EXACT COUNTS
-- Run this section separately only if section 07 reports that
-- public.purchase_request_stock_holds exists. Keep the transaction wrapper.
-- It remains commented so the complete audit is safe when migration 111 is absent.
-- ============================================================================
-- begin transaction read only;
--
-- select
--   current_database() as database_name,
--   current_user as database_user,
--   inet_server_addr() as server_address,
--   inet_server_port() as server_port,
--   current_setting('transaction_read_only') as transaction_read_only;
--
-- select count(*) as stock_hold_row_count
-- from public.purchase_request_stock_holds;
--
-- select count(distinct purchase_request_id) as purchase_requests_with_stock_holds
-- from public.purchase_request_stock_holds;
--
-- select status, count(*) as stock_hold_count
-- from public.purchase_request_stock_holds
-- group by status
-- order by status;
--
-- rollback;
