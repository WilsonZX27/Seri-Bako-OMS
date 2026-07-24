-- Seri Bako OMS new-system data reset.
-- Destructive business-data cleanup. Review preflight_new_system_reset.sql first.
-- Do not run casually. No schema/RLS/function changes; no auth deletes; no TRUNCATE CASCADE.

begin;

do $$
declare
  v_wilson_staff_id uuid;
  v_wilson_auth_id uuid;
  v_company_count integer;
  v_role_count integer;
  v_permission_count integer;
  v_migration_ceiling text;
begin
  select s.id, s.auth_user_id
  into v_wilson_staff_id, v_wilson_auth_id
  from public.staffs s
  join public.staff_roles sr on sr.staff_id = s.id
  join public.roles r on r.id = sr.role_id
  where s.status = 'active'
    and r.role_code = 'super_admin'
    and r.status = 'active'
    and sr.effective_from <= current_date
    and (sr.effective_to is null or sr.effective_to >= current_date)
    and (s.email ilike 'wilson@%' or s.full_name ilike '%wilson%')
  limit 1;

  if v_wilson_staff_id is null then
    raise exception 'Reset blocked: Wilson active Super Admin staff linkage not found.';
  end if;

  if v_wilson_auth_id is null or not exists (select 1 from auth.users u where u.id = v_wilson_auth_id) then
    raise exception 'Reset blocked: Wilson auth user is missing.';
  end if;

  select count(*) into v_company_count from public.companies where deleted_at is null;
  if v_company_count < 1 then
    raise exception 'Reset blocked: no active company row found.';
  end if;

  select count(*) into v_role_count from public.roles;
  select count(*) into v_permission_count from public.permissions;
  if v_role_count < 1 or v_permission_count < 1 then
    raise exception 'Reset blocked: roles or permissions are missing.';
  end if;

  select version into v_migration_ceiling
  from supabase_migrations.schema_migrations
  order by version desc
  limit 1;

  if v_migration_ceiling is distinct from '103' then
    raise exception 'Reset blocked: expected migration ceiling 103, found %.', v_migration_ceiling;
  end if;
end $$;

-- Document support and operational side records.
delete from public.notification_recipients;
delete from public.notifications
where entity_type is not null
   or entity_id is not null
   or title ilike '%PR-%'
   or title ilike '%PO-%'
   or title ilike '%GRN-%'
   or title ilike '%QA-%'
   or title ilike '%Sprint%';
delete from public.approval_steps;
delete from public.approvals;
delete from public.document_comments;
delete from public.document_revisions;
delete from public.attachments;
delete from public.audit_logs
where entity_type not in ('company','branch','staff','role','permission','role_permission','staff_role','staff_branch')
   or entity_type is null;
delete from public.activity_logs
where entity_type not in ('company','branch','staff','role','permission','role_permission','staff_role','staff_branch')
   or entity_type is null
   or activity_type = 'import';

-- Operational child rows before headers.
delete from public.supplier_invoice_payments;
delete from public.supplier_invoices;
delete from public.purchase_return_lines;
delete from public.purchase_returns;
delete from public.production_job_ingredient_lines;
delete from public.production_job_output_lines;
delete from public.production_jobs;
delete from public.stock_wastage_lines;
delete from public.stock_wastage;
delete from public.stock_transfer_lines;
delete from public.stock_transfers;
delete from public.stock_count_lines;
delete from public.stock_counts;
delete from public.goods_receiving_lines;
delete from public.goods_receivings;
delete from public.purchase_order_lines;
delete from public.purchase_orders;
delete from public.purchase_request_lines;
delete from public.purchase_requests;

-- Inventory ledger before item/product/supplier master data.
delete from public.stock_transaction_lines;
delete from public.stock_transactions;

-- Master-data children before master headers.
delete from public.recipe_cost_snapshots;
delete from public.recipe_lines;
delete from public.recipes;
delete from public.product_packaging;
delete from public.branch_supplier_items;
delete from public.supplier_items;
delete from public.products;
delete from public.items;
delete from public.suppliers;

-- Universal documents after business rows are gone.
delete from public.documents;

-- Reset operational document numbering only. Preserve sequence rows and company linkage.
update public.document_sequences
set next_number = 1,
    last_reset_at = now(),
    status = 'active',
    deleted_at = null,
    updated_at = now()
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
);

do $$
declare
  v_business_rows bigint;
  v_wilson_ok boolean;
  v_wilson_auth_ok boolean;
  v_company_count integer;
  v_role_count integer;
  v_permission_count integer;
begin
  select coalesce(sum(row_count), 0)
  into v_business_rows
  from (
    select count(*) as row_count from public.items
    union all select count(*) from public.suppliers
    union all select count(*) from public.recipes
    union all select count(*) from public.stock_transactions
    union all select count(*) from public.stock_transaction_lines
    union all select count(*) from public.purchase_requests
    union all select count(*) from public.purchase_orders
    union all select count(*) from public.goods_receivings
    union all select count(*) from public.purchase_returns
    union all select count(*) from public.supplier_invoices
    union all select count(*) from public.production_jobs
    union all select count(*) from public.stock_transfers
    union all select count(*) from public.stock_counts
    union all select count(*) from public.stock_wastage
    union all select count(*) from public.documents
    union all select count(*) from public.attachments
    union all select count(*) from public.approvals
    union all select count(*) from public.approval_steps
    union all select count(*) from public.document_comments
    union all select count(*) from public.document_revisions
  ) counts;

  if v_business_rows <> 0 then
    raise exception 'Reset verification failed: % business/support rows remain.', v_business_rows;
  end if;

  select exists (
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
  ) into v_wilson_ok;

  if not v_wilson_ok then
    raise exception 'Reset verification failed: Wilson Super Admin linkage missing after cleanup.';
  end if;

  select exists (
    select 1
    from public.staffs s
    join auth.users u on u.id = s.auth_user_id
    where s.status = 'active'
      and (s.email ilike 'wilson@%' or s.full_name ilike '%wilson%')
  ) into v_wilson_auth_ok;

  if not v_wilson_auth_ok then
    raise exception 'Reset verification failed: Wilson auth user linkage missing after cleanup.';
  end if;

  select count(*) into v_company_count from public.companies where deleted_at is null;
  select count(*) into v_role_count from public.roles;
  select count(*) into v_permission_count from public.permissions;
  if v_company_count < 1 or v_role_count < 1 or v_permission_count < 1 then
    raise exception 'Reset verification failed: preserved system tables are incomplete.';
  end if;
end $$;

commit;
