begin transaction read only;

select
  current_database() as database_name,
  current_user as database_user,
  inet_server_addr() as server_address,
  inet_server_port() as server_port,
  current_setting('transaction_read_only') as transaction_read_only;

select
  count(*) filter (where version = '110') as migration_110_rows,
  count(*) filter (where version = '111') as migration_111_rows,
  count(*) filter (where version = '112') as migration_112_rows,
  count(*) filter (where version >= '113') as migration_113_or_later_rows
from supabase_migrations.schema_migrations
where version >= '110';

select
  to_regclass('public.purchase_request_stock_holds') is not null
    as stock_holds_table_exists,
  to_regprocedure(
    'public.create_central_kitchen_purchase_request_atomic(jsonb)'
  ) is not null as central_kitchen_pr_rpc_exists,
  has_function_privilege(
    'anon',
    'public.create_central_kitchen_purchase_request_atomic(jsonb)',
    'execute'
  ) as anon_can_execute_before,
  has_function_privilege(
    'authenticated',
    'public.create_central_kitchen_purchase_request_atomic(jsonb)',
    'execute'
  ) as authenticated_can_execute_before;

select
  count(*) as stock_hold_row_count,
  count(distinct purchase_request_id) as purchase_requests_with_holds
from public.purchase_request_stock_holds;

select count(*) as central_kitchen_pr_activity_log_count
from public.activity_logs
where entity_type = 'purchase_request'
  and (
    message = 'Central kitchen purchase request created'
    or activity_type = 'central_kitchen_purchase_request_created'
  );

rollback;
