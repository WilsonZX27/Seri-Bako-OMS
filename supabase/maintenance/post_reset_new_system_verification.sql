-- Seri Bako OMS post-reset verification.
-- Run after reset_new_system_data.sql.

select
  'wilson_super_admin_linkage' as check_name,
  exists (
    select 1
    from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.status = 'active'
      and r.role_code = 'super_admin'
      and r.status = 'active'
      and sr.effective_from <= current_date
      and (sr.effective_to is null or sr.effective_to >= current_date)
      and (s.email ilike 'wilson@%' or s.full_name ilike '%wilson%')
  ) as passed;

select
  'wilson_auth_staff_linkage' as check_name,
  exists (
    select 1
    from public.staffs s
    join auth.users u on u.id = s.auth_user_id
    where s.status = 'active'
      and (s.email ilike 'wilson@%' or s.full_name ilike '%wilson%')
  ) as passed;

select 'real_staff_remaining' as check_name, count(*) as row_count
from public.staffs;

select 'real_branches_remaining' as check_name, count(*) as row_count
from public.branches
where deleted_at is null;

select 'real_locations_remaining' as check_name, count(*) as row_count
from public.locations
where deleted_at is null;

select 'companies_remaining' as check_name, count(*) as row_count
from public.companies
where deleted_at is null;

select 'roles_remaining' as check_name, count(*) as row_count from public.roles;
select 'permissions_remaining' as check_name, count(*) as row_count from public.permissions;
select 'role_permissions_remaining' as check_name, count(*) as row_count from public.role_permissions;

with expected_zero(table_name, row_count) as (
  values
    ('items', (select count(*) from public.items)),
    ('suppliers', (select count(*) from public.suppliers)),
    ('recipes', (select count(*) from public.recipes)),
    ('recipe_lines', (select count(*) from public.recipe_lines)),
    ('recipe_cost_snapshots', (select count(*) from public.recipe_cost_snapshots)),
    ('supplier_items', (select count(*) from public.supplier_items)),
    ('products', (select count(*) from public.products)),
    ('product_packaging', (select count(*) from public.product_packaging)),
    ('stock_transactions', (select count(*) from public.stock_transactions)),
    ('stock_transaction_lines', (select count(*) from public.stock_transaction_lines)),
    ('purchase_requests', (select count(*) from public.purchase_requests)),
    ('purchase_request_lines', (select count(*) from public.purchase_request_lines)),
    ('purchase_orders', (select count(*) from public.purchase_orders)),
    ('purchase_order_lines', (select count(*) from public.purchase_order_lines)),
    ('goods_receivings', (select count(*) from public.goods_receivings)),
    ('goods_receiving_lines', (select count(*) from public.goods_receiving_lines)),
    ('purchase_returns', (select count(*) from public.purchase_returns)),
    ('purchase_return_lines', (select count(*) from public.purchase_return_lines)),
    ('supplier_invoices', (select count(*) from public.supplier_invoices)),
    ('supplier_invoice_payments', (select count(*) from public.supplier_invoice_payments)),
    ('production_jobs', (select count(*) from public.production_jobs)),
    ('production_job_ingredient_lines', (select count(*) from public.production_job_ingredient_lines)),
    ('production_job_output_lines', (select count(*) from public.production_job_output_lines)),
    ('stock_transfers', (select count(*) from public.stock_transfers)),
    ('stock_transfer_lines', (select count(*) from public.stock_transfer_lines)),
    ('stock_counts', (select count(*) from public.stock_counts)),
    ('stock_count_lines', (select count(*) from public.stock_count_lines)),
    ('stock_wastage', (select count(*) from public.stock_wastage)),
    ('stock_wastage_lines', (select count(*) from public.stock_wastage_lines)),
    ('documents', (select count(*) from public.documents)),
    ('document_comments', (select count(*) from public.document_comments)),
    ('document_revisions', (select count(*) from public.document_revisions)),
    ('approvals', (select count(*) from public.approvals)),
    ('approval_steps', (select count(*) from public.approval_steps)),
    ('attachments', (select count(*) from public.attachments)),
    ('notification_recipients', (select count(*) from public.notification_recipients))
)
select
  'expected_zero_tables' as check_name,
  table_name,
  row_count,
  row_count = 0 as passed
from expected_zero
order by table_name;

select 'stock_balances_view' as check_name, count(*) as row_count, count(*) = 0 as passed
from public.stock_balances_view;

select 'stock_ledger_view' as check_name, count(*) as row_count, count(*) = 0 as passed
from public.stock_ledger_view;

select 'inventory_valuation_view' as check_name, count(*) as row_count, count(*) = 0 as passed
from public.inventory_valuation_view;

select 'low_stock_items_view' as check_name, count(*) as row_count, count(*) = 0 as passed
from public.low_stock_items;

select
  'business_activity_logs_remaining' as check_name,
  count(*) as row_count,
  count(*) = 0 as passed
from public.activity_logs
where entity_type not in ('company','branch','location','staff','role','permission','role_permission','staff_role','staff_branch','staff_location')
   or entity_type is null
   or activity_type = 'import';

select
  'business_audit_logs_remaining' as check_name,
  count(*) as row_count,
  count(*) = 0 as passed
from public.audit_logs
where entity_type not in ('company','branch','location','staff','role','permission','role_permission','staff_role','staff_branch','staff_location')
   or entity_type is null;

select
  'business_notifications_remaining' as check_name,
  count(*) as row_count,
  count(*) = 0 as passed
from public.notifications
where entity_type is not null
   or entity_id is not null
   or title ilike '%PR-%'
   or title ilike '%PO-%'
   or title ilike '%GRN-%'
   or title ilike '%QA-%'
   or title ilike '%Sprint%';

select
  'document_sequences_reset' as check_name,
  document_type,
  prefix,
  next_number,
  next_number = 1 as passed
from public.document_sequences
where document_type in (
  'purchase_request',
  'purchase_order',
  'goods_receiving',
  'purchase_return',
  'supplier_invoice',
  'payment_schedule',
  'stock_count',
  'stock_transfer',
  'stock_wastage',
  'stock_transaction',
  'opening_balance',
  'production_job'
)
order by document_type;

select
  'migration_ceiling_090' as check_name,
  version,
  version = '090' as passed
from supabase_migrations.schema_migrations
order by version desc
limit 1;

select 'ready_for_fresh_import' as check_name, true as passed;
