-- Production Go-Live full operational reset — current schema through migration 090.
-- PREPARED ONLY. Do not run until Wilson gives a separate Production GO.
-- Does not use reset_new_system_data.sql, TRUNCATE, schema/RLS/role changes, or RPC hard deletes.
-- Storage bytes are deleted separately from the attachment inventory captured by the preflight.

begin;

create temporary table go_live_removed_auth_ids (id uuid primary key) on commit drop;

do $preflight$
declare
  retained_codes constant text[] := array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN'];
  retained_count integer;
begin
  select count(*) into retained_count
  from public.staffs
  where staff_code = any(retained_codes) and deleted_at is null;
  if retained_count <> cardinality(retained_codes) then
    raise exception 'Reset blocked: retained staff preserve list mismatch (expected %, found %).', cardinality(retained_codes), retained_count;
  end if;
  if exists (
    select 1 from public.staffs where staff_code = any(retained_codes)
    group by staff_code having count(*) <> 1
  ) then
    raise exception 'Reset blocked: a retained staff code is ambiguous.';
  end if;
  if not exists (
    select 1 from public.staffs s join auth.users u on u.id = s.auth_user_id
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.staff_code = 'SUPER-ADMIN' and s.status = 'active' and r.role_code = 'super_admin'
  ) then
    raise exception 'Reset blocked: Wilson Super Admin Staff/Auth linkage is missing.';
  end if;

  raise notice 'PRESERVE staff/auth: %', (
    select jsonb_agg(jsonb_build_object('staff_id', s.id, 'staff_code', s.staff_code, 'full_name', s.full_name, 'auth_user_id', s.auth_user_id) order by s.staff_code)
    from public.staffs s where s.staff_code = any(retained_codes)
  );
  raise notice 'PRESERVE configuration counts company/branch/role/permission: %/%/%/%',
    (select count(*) from public.companies), (select count(*) from public.branches),
    (select count(*) from public.roles), (select count(*) from public.permissions);
  raise notice 'STORAGE INVENTORY (delete bytes separately): %', (
    select coalesce(jsonb_agg(jsonb_build_object('attachment_id', id, 'path', coalesce(storage_path, file_path), 'status', status) order by id), '[]'::jsonb)
    from public.attachments
  );
end $preflight$;

-- Read-only before counts. SQL Editor prints this result before any DELETE runs.
select * from (
  values
    ('purchase_request_lines', (select count(*) from public.purchase_request_lines)),
    ('purchase_requests', (select count(*) from public.purchase_requests)),
    ('purchase_order_lines', (select count(*) from public.purchase_order_lines)),
    ('purchase_orders', (select count(*) from public.purchase_orders)),
    ('goods_receiving_lines', (select count(*) from public.goods_receiving_lines)),
    ('goods_receivings', (select count(*) from public.goods_receivings)),
    ('purchase_return_lines', (select count(*) from public.purchase_return_lines)),
    ('purchase_returns', (select count(*) from public.purchase_returns)),
    ('supplier_invoice_lines', (select count(*) from public.supplier_invoice_lines)),
    ('supplier_invoices', (select count(*) from public.supplier_invoices)),
    ('supplier_invoice_payments', (select count(*) from public.supplier_invoice_payments)),
    ('stock_transactions', (select count(*) from public.stock_transactions)),
    ('documents', (select count(*) from public.documents)), ('attachments', (select count(*) from public.attachments)),
    ('items', (select count(*) from public.items)), ('products', (select count(*) from public.products)),
    ('suppliers', (select count(*) from public.suppliers)), ('recipes', (select count(*) from public.recipes))
) as before_counts(table_name, row_count)
order by table_name;

-- Current-schema FK trace: reviewable in SQL Editor before deletion begins.
select conrelid::regclass as child_table, conname as constraint_name, confrelid::regclass as parent_table, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f' and connamespace in ('public'::regnamespace, 'auth'::regnamespace)
order by conrelid::regclass::text, conname;

-- FK-derived dependency order. Each statement prints its affected-row count.
delete from public.notification_recipients;
delete from public.approval_steps;
delete from public.approvals;
delete from public.document_comments;
delete from public.document_revisions;
delete from public.attachments; -- record and delete Storage bytes separately after commit
delete from public.supplier_invoice_payments;
delete from public.supplier_invoice_lines;
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
delete from public.stock_transaction_lines;
delete from public.stock_transactions;
delete from public.outlet_daily_record_lines;
delete from public.outlet_daily_records;
delete from public.recipe_cost_snapshots;
delete from public.recipe_lines;
delete from public.recipes;
delete from public.documents;
delete from public.notifications;
delete from public.activity_logs;
delete from public.audit_logs;
delete from public.permanent_deletion_tombstones;

delete from public.product_packaging;
delete from public.uom_conversions;
delete from public.branch_supplier_items;
delete from public.supplier_items;
delete from public.products;
delete from public.items;
delete from public.suppliers;

-- Preserve retained Staff/Auth; remove only the other linked Staff/Auth identities.
insert into go_live_removed_auth_ids (id)
select distinct auth_user_id from public.staffs
where (staff_code is null or staff_code <> all(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN']))
  and auth_user_id is not null;
delete from public.staff_permission_overrides where staff_id not in (select id from public.staffs where staff_code = any(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN']));
delete from public.staff_roles where staff_id not in (select id from public.staffs where staff_code = any(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN']));
delete from public.staff_branches where staff_id not in (select id from public.staffs where staff_code = any(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN']));
delete from public.staffs where staff_code is null or staff_code <> all(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN']);
delete from public.user_preferences where user_id in (select id from go_live_removed_auth_ids);
delete from auth.users where id in (select id from go_live_removed_auth_ids)
  or (id not in (select auth_user_id from public.staffs where auth_user_id is not null) and lower(coalesce(email, '')) like 'e2e-%');

-- Leave configuration rows intact; reset the new monthly counters to 001.
delete from public.document_sequence_periods;
update public.document_sequences
set next_number = 1, padding = 3, reset_frequency = 'monthly', last_reset_at = now(), status = 'active', deleted_at = null, updated_at = now();

do $verify$
declare
  remaining bigint;
begin
  select coalesce(sum(row_count), 0) into remaining from (
    select count(*) row_count from public.purchase_requests union all select count(*) from public.purchase_orders union all
    select count(*) from public.goods_receivings union all select count(*) from public.purchase_returns union all
    select count(*) from public.supplier_invoices union all select count(*) from public.supplier_invoice_payments union all
    select count(*) from public.stock_transactions union all select count(*) from public.stock_transaction_lines union all
    select count(*) from public.stock_counts union all select count(*) from public.stock_transfers union all
    select count(*) from public.stock_wastage union all select count(*) from public.outlet_daily_records union all
    select count(*) from public.documents union all select count(*) from public.attachments union all
    select count(*) from public.items union all select count(*) from public.products union all
    select count(*) from public.suppliers union all select count(*) from public.recipes
  ) t;
  if remaining <> 0 then raise exception 'Reset verification failed: % operational/master rows remain.', remaining; end if;
  if exists (select 1 from public.stock_balances_view) or exists (select 1 from public.low_stock_items) then
    raise exception 'Reset verification failed: derived stock or low-stock data remains.';
  end if;
  if exists (select 1 from public.document_sequence_periods) then raise exception 'Reset verification failed: a monthly counter remains.'; end if;
  if exists (select 1 from public.document_sequences where next_number <> 1 or padding <> 3 or reset_frequency <> 'monthly') then
    raise exception 'Reset verification failed: monthly sequence configuration is incomplete.';
  end if;
  if not exists (select 1 from public.staffs s join auth.users u on u.id = s.auth_user_id where s.staff_code = 'SUPER-ADMIN' and s.status = 'active') then
    raise exception 'Reset verification failed: Wilson Staff/Auth linkage is missing.';
  end if;
end $verify$;

select * from (
  values
    ('operational_master_remaining', (select count(*) from public.purchase_requests) + (select count(*) from public.purchase_orders) + (select count(*) from public.goods_receivings) + (select count(*) from public.purchase_returns) + (select count(*) from public.supplier_invoices) + (select count(*) from public.items) + (select count(*) from public.products) + (select count(*) from public.suppliers) + (select count(*) from public.recipes)),
    ('attachment_metadata_remaining', (select count(*) from public.attachments)),
    ('monthly_counter_rows_remaining', (select count(*) from public.document_sequence_periods)),
    ('retained_staff_count', (select count(*) from public.staffs where staff_code = any(array['SUPER-ADMIN','ROCKY','JACK','ASHLEY','FAYADH','FIZA','AIDEN'])))
) as after_counts(check_name, row_count)
order by check_name;

commit;
