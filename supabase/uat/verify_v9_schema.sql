\set ON_ERROR_STOP on

do $$
declare
  latest_migration text;
  unsafe_tables text;
  unsafe_functions text;
  unsafe_views text;
  policyless_tables text;
begin
  select max(version) into latest_migration from supabase_migrations.schema_migrations;
  if latest_migration <> '226' then
    raise exception 'Expected migration 226, found %', coalesce(latest_migration, '(none)');
  end if;

  select string_agg(tablename, ', ' order by tablename) into unsafe_tables
  from pg_tables where schemaname = 'public' and not rowsecurity;
  if unsafe_tables is not null then
    raise exception 'Public tables without RLS: %', unsafe_tables;
  end if;

  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' order by p.proname) into unsafe_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    );
  if unsafe_functions is not null then
    raise exception 'SECURITY DEFINER functions without a fixed search_path: %', unsafe_functions;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into unsafe_views
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and not ('security_invoker=true' = any(coalesce(c.reloptions, array[]::text[])));
  if unsafe_views is not null then
    raise exception 'Public views without security_invoker=true: %', unsafe_views;
  end if;

  select string_agg(tablename, ', ' order by tablename) into policyless_tables
  from (
    select t.tablename
    from pg_tables t
    left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
    where t.schemaname = 'public' and t.rowsecurity
    group by t.tablename
    having count(p.policyname) = 0
      and t.tablename <> all(array[
        'purchase_request_stock_holds',
        'supplier_identity_reconciliation_audit',
        'supplier_item_merge_audit',
        'supplier_merge_audit',
        'supplier_merge_line_audit'
      ])
  ) unexpected;
  if policyless_tables is not null then
    raise exception 'Unexpected RLS tables without a policy: %', policyless_tables;
  end if;
end
$$;

do $$
declare
  missing_columns text;
begin
  with required(table_name, column_name, data_type, nullable) as (values
    ('audit_logs', 'entity_type', 'text', 'NO'),
    ('audit_logs', 'entity_id', 'uuid', 'NO'),
    ('audit_logs', 'old_values', 'jsonb', 'YES'),
    ('audit_logs', 'new_values', 'jsonb', 'YES'),
    ('audit_logs', 'created_at', 'timestamp with time zone', 'NO'),
    ('audit_logs', 'created_by', 'uuid', 'YES'),
    ('attachments', 'storage_path', 'text', 'YES'),
    ('attachments', 'file_url', 'text', 'YES'),
    ('notifications', 'message', 'text', 'NO'),
    ('notifications', 'recipient_staff_id', 'uuid', 'YES'),
    ('notifications', 'recipient_role_id', 'uuid', 'YES')
  ), failures as (
    select required.table_name || '.' || required.column_name as column_name
    from required
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = required.table_name
     and c.column_name = required.column_name
     and c.data_type = required.data_type
     and c.is_nullable = required.nullable
    where c.column_name is null
  )
  select string_agg(column_name, ', ' order by column_name) into missing_columns from failures;
  if missing_columns is not null then
    raise exception 'Critical canonical columns are missing or incompatible: %', missing_columns;
  end if;

  if to_regprocedure('public.post_stock_count_atomic(uuid)') is null
    or to_regprocedure('public.void_stock_count_atomic(uuid,text,text,uuid)') is null
    or not exists (
      select 1 from pg_enum
      where enumtypid = 'public.stock_count_status'::regtype and enumlabel = 'voided'
    ) then
    raise exception 'Stock Count posting/void contract is incomplete.';
  end if;

  if to_regprocedure('public.finance_approve_purchase_request_to_order(uuid)') is null then
    raise exception 'Finance approval to PO handoff is missing.';
  end if;
  if to_regprocedure('public.finish_legacy_purchase_request_to_order(uuid,text)') is null then
    raise exception 'Legacy PR-to-PO reconciliation is missing.';
  end if;
  if to_regprocedure('public.sync_purchase_order_attachment_to_receivings()') is null then
    raise exception 'Late PO attachment synchronization is missing.';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.roles r
    where r.role_code = 'finance' and r.status = 'active' and r.deleted_at is null
      and exists (
        select 1
        from public.permissions p
        where p.permission_code in ('supplier_items.read', 'uom_conversions.read')
          and not exists (
            select 1 from public.role_permissions rp
            where rp.role_id = r.id and rp.permission_id = p.id
          )
      )
  ) then
    raise exception 'Finance master-data read alignment is incomplete.';
  end if;

  if exists (
    select 1
    from public.roles r
    where r.role_code = 'purchasing' and r.status = 'active' and r.deleted_at is null
      and exists (
        select 1
        from public.permissions p
        where p.permission_code in ('po.send', 'purchase_order.send')
          and not exists (
            select 1 from public.role_permissions rp
            where rp.role_id = r.id and rp.permission_id = p.id
          )
      )
  ) then
    raise exception 'Purchasing PO-send permission aliases are incomplete.';
  end if;

  if exists (
    select 1
    from public.roles r
    where r.role_code = 'purchasing' and r.status = 'active' and r.deleted_at is null
      and exists (
        select 1
        from public.permissions p
        where p.permission_code = 'pr.cancel'
          and not exists (
            select 1 from public.role_permissions rp
            where rp.role_id = r.id and rp.permission_id = p.id
          )
      )
  ) then
    raise exception 'Purchasing unposted-PR cancellation permission is incomplete.';
  end if;

  if exists (
    select 1
    from public.roles r
    where r.role_code = 'finance' and r.status = 'active' and r.deleted_at is null
      and exists (
        select 1
        from public.permissions p
        where p.permission_code = 'pr.convert_to_po'
          and not exists (
            select 1 from public.role_permissions rp
            where rp.role_id = r.id and rp.permission_id = p.id
          )
      )
  ) then
    raise exception 'Finance atomic PO-conversion permission is incomplete.';
  end if;

  if exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.role_code = 'manager' and r.status = 'active' and r.deleted_at is null
      and p.permission_code in ('pr.create', 'pr.submit', 'purchase_request.create', 'purchase_request.submit')
  ) then
    raise exception 'Manager still has a Purchase Request authoring permission.';
  end if;

  if exists (
    select 1
    from public.roles r
    where r.role_code = 'manager' and r.status = 'active' and r.deleted_at is null
      and exists (
        select 1
        from public.permissions p
        where p.permission_code in ('stock_balance.read', 'stock_transactions.read')
          and not exists (
            select 1 from public.role_permissions rp
            where rp.role_id = r.id and rp.permission_id = p.id
          )
      )
  ) then
    raise exception 'Manager inventory read alignment is incomplete.';
  end if;
end
$$;

select json_build_object(
  'status', 'V9_SCHEMA_OK',
  'migration', (select max(version) from supabase_migrations.schema_migrations),
  'tables', (select count(*) from pg_tables where schemaname = 'public'),
  'views', (select count(*) from pg_views where schemaname = 'public'),
  'security_definer_functions', (
    select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  )
);
