\set ON_ERROR_STOP on

do $$
declare failures text[] := array[]::text[];
begin
  if current_setting('seri_bako.production_like_clone', true) is distinct from 'confirmed' then
    raise exception 'Production-like clone verification requires an explicit local-session guard.';
  end if;

  if exists (
    select 1 from public.staffs
    where auth_user_id is not null and staff_code not like 'E2E-%'
  ) then failures := array_append(failures, 'non-disposable Auth identity remains linked'); end if;

  if exists (
    select 1 from public.staffs
    where coalesce(email, '') !~* '(^$|@example\.test$)'
      or phone is not null or invite_email is not null or avatar_url is not null or avatar_path is not null
  ) then failures := array_append(failures, 'staff PII sanitisation'); end if;

  if exists (
    select 1 from public.attachments
    where file_path is not null or storage_path is not null or file_url is not null
      or file_name not like 'UAT attachment %'
  ) then failures := array_append(failures, 'attachment path sanitisation'); end if;

  if exists (
    select 1 from public.purchase_request_lines line
    left join public.purchase_requests request on request.id = line.purchase_request_id
    left join public.items item on item.id = line.item_id
    where request.id is null or item.id is null or request.company_id <> item.company_id
  ) then failures := array_append(failures, 'purchase request line ownership'); end if;

  if exists (
    select 1 from public.purchase_order_lines line
    left join public.purchase_orders purchase_order on purchase_order.id = line.purchase_order_id
    left join public.items item on item.id = line.item_id
    where purchase_order.id is null or item.id is null or purchase_order.company_id <> item.company_id
  ) then failures := array_append(failures, 'purchase order line ownership'); end if;

  if exists (
    select 1 from public.goods_receiving_lines line
    left join public.goods_receivings receiving on receiving.id = line.goods_receiving_id
    left join public.items item on item.id = line.item_id
    where receiving.id is null or item.id is null or receiving.company_id <> item.company_id
  ) then failures := array_append(failures, 'goods receiving line ownership'); end if;

  if exists (
    select 1 from public.stock_count_lines line
    left join public.stock_counts stock_count on stock_count.id = line.stock_count_id
    left join public.items item on item.id = line.item_id
    where stock_count.id is null or item.id is null or stock_count.company_id <> item.company_id
  ) then failures := array_append(failures, 'stock count line ownership'); end if;

  if exists (
    select 1 from public.stock_transactions transaction
    left join public.branches branch on branch.id = transaction.branch_id
    left join public.items item on item.id = transaction.item_id
    where branch.id is null or item.id is null or branch.company_id <> item.company_id
  ) then failures := array_append(failures, 'stock ledger tenant ownership'); end if;

  if exists (
    select 1 from public.staff_roles mapping
    join public.staffs staff on staff.id = mapping.staff_id
    join public.roles role on role.id = mapping.role_id
    where role.company_id is distinct from staff.company_id
  ) then failures := array_append(failures, 'staff role tenant ownership'); end if;

  if exists (
    select 1 from public.staff_branches mapping
    join public.staffs staff on staff.id = mapping.staff_id
    join public.branches branch on branch.id = mapping.branch_id
    where branch.company_id <> staff.company_id
  ) then failures := array_append(failures, 'staff branch tenant ownership'); end if;

  if exists (
    with ledger as (
      select item_id, branch_id, sum(quantity_in - quantity_out) quantity
      from (
        select transaction.item_id, transaction.branch_id, transaction.quantity_in, transaction.quantity_out
        from public.stock_transactions transaction
        where transaction.status = 'posted'
          and not exists (select 1 from public.stock_transaction_lines line where line.stock_transaction_id = transaction.id)
        union all
        select line.item_id, coalesce(line.branch_id, transaction.branch_id), line.quantity_in, line.quantity_out
        from public.stock_transaction_lines line
        join public.stock_transactions transaction on transaction.id = line.stock_transaction_id
        where transaction.status = 'posted'
      ) movement
      group by item_id, branch_id
    )
    select 1
    from ledger
    full join public.stock_balances_summary summary using (item_id, branch_id)
    where coalesce(ledger.quantity, 0) <> coalesce(summary.current_qty, 0)
  ) then failures := array_append(failures, 'stock balance read model reconciliation'); end if;

  if cardinality(failures) > 0 then
    raise exception 'Production-like clone failed invariants: %', array_to_string(failures, ', ');
  end if;
end
$$;

select jsonb_build_object(
  'ok', true,
  'migration_ceiling', (select max(version) from supabase_migrations.schema_migrations),
  'companies', (select count(*) from public.companies),
  'branches', (select count(*) from public.branches),
  'items', (select count(*) from public.items),
  'staff', (select count(*) from public.staffs),
  'disposable_auth_links', (select count(*) from public.staffs where auth_user_id is not null and staff_code like 'E2E-%'),
  'posted_ledger_rows', (select count(*) from public.stock_transactions where status = 'posted')
) as production_like_clone_verification;
