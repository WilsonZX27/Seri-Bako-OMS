-- v8.65.1: Stock Count creation and posting must use the same inventory
-- balance authority. Header-only movements live on stock_transactions while
-- multi-line documents live on stock_transaction_lines; counting both parent
-- and child rows would double-count inventory.

create or replace function public.inventory_item_branch_balance(
  p_item_id uuid,
  p_branch_id uuid
) returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with movement_rows as (
    select st.quantity_in, st.quantity_out
    from public.stock_transactions st
    where st.status = 'posted'
      and st.item_id = p_item_id
      and st.branch_id = p_branch_id
      and not exists (
        select 1
        from public.stock_transaction_lines stl
        where stl.stock_transaction_id = st.id
      )
    union all
    select stl.quantity_in, stl.quantity_out
    from public.stock_transaction_lines stl
    join public.stock_transactions st on st.id = stl.stock_transaction_id
    where st.status = 'posted'
      and stl.item_id = p_item_id
      and coalesce(stl.branch_id, st.branch_id) = p_branch_id
  )
  select coalesce(sum(quantity_in - quantity_out), 0)::numeric
  from movement_rows
$$;

create or replace function public.post_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  line public.stock_count_lines%rowtype;
  item_row public.items%rowtype;
  current_balance numeric;
  variance numeric;
  line_count integer := 0;
  adjusted_count integer := 0;
  unchanged_count integer := 0;
  posting_ref text;
  transaction_ref text;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('stock_count.post') then
    raise exception 'Missing permission: stock_count.post';
  end if;

  select * into count_row
  from public.stock_counts
  where id = p_stock_count_id and deleted_at is null
  for update;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then
    raise exception 'Stock count is unavailable for this branch.';
  end if;
  if count_row.status = 'posted' then
    return jsonb_build_object('id', count_row.id, 'count_no', count_row.count_no, 'already_posted', true);
  end if;
  if count_row.status not in ('draft', 'submitted', 'reviewed', 'approved') then
    raise exception 'Only draft or legacy pending stock counts can be confirmed and posted.';
  end if;

  posting_ref := coalesce(count_row.posting_reference, 'SC-' || count_row.count_no);
  if exists (
    select 1 from public.stock_counts other
    where other.company_id = count_row.company_id
      and other.posting_reference = posting_ref
      and other.id <> count_row.id
      and other.deleted_at is null
  ) then
    raise exception 'Posting reference collision. Refresh and retry.';
  end if;

  for line in
    select * from public.stock_count_lines
    where stock_count_id = count_row.id
    order by line_position asc, id asc
    for update
  loop
    line_count := line_count + 1;
    select * into item_row
    from public.items item
    where item.id = line.item_id
      and item.company_id = count_row.company_id
      and item.status = 'active'
      and item.deleted_at is null;

    if line.line_position is null or line.line_position < 1
      or line.theoretical_qty < 0 or line.physical_qty < 0
      or line.physical_qty > 1000000
      or line.physical_qty <> round(line.physical_qty, 4)
      or item_row.id is null
      or item_row.base_unit <> line.uom
      or not (
        lower(trim(item_row.base_unit)) in ('kg','g','l','ml','ltr','liter','litre')
        or line.physical_qty = trunc(line.physical_qty)
      ) then
      raise exception 'Stock count line % failed item, UOM, or quantity validation.', line.line_position;
    end if;

    perform public.inventory_lock_item_branch(line.item_id, count_row.branch_id);
    current_balance := public.inventory_item_branch_balance(line.item_id, count_row.branch_id);

    if current_balance is distinct from line.theoretical_qty then
      raise exception 'STOCK_SNAPSHOT_CONFLICT|%|%|%|%',
        item_row.item_code, item_row.item_name, line.theoretical_qty, current_balance;
    end if;

    variance := line.physical_qty - line.theoretical_qty;
    if variance = 0 then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;

    transaction_ref := 'ST-' || count_row.count_no || '-' || line.line_position;
    if exists (select 1 from public.stock_transactions where transaction_no = transaction_ref) then
      raise exception 'Stock Count transaction reference already exists: %.', transaction_ref;
    end if;
    perform public.insert_inventory_movement(
      transaction_ref, count_row.document_id, count_row.branch_id, line.item_id,
      'stock_count_adjustment', count_row.count_date,
      greatest(variance, 0), greatest(-variance, 0), 0, actor.id,
      'Adjusted by Stock Count ' || count_row.count_no,
      'stock_count', count_row.id
    );
    adjusted_count := adjusted_count + 1;
  end loop;

  if line_count = 0 then raise exception 'A stock count cannot be posted without lines.'; end if;

  update public.stock_counts
  set status = 'posted', posting_reference = posting_ref, posted_at = now(), updated_by = actor.id
  where id = count_row.id and status in ('draft', 'submitted', 'reviewed', 'approved');
  if not found then raise exception 'This stock count changed state. Refresh before trying again.'; end if;

  if count_row.document_id is not null then
    update public.documents
    set status = 'posted', approval_status = 'not_required', current_step = 'Posted to stock',
        posted_at = now(), updated_by = actor.id
    where id = count_row.document_id;
  end if;

  return jsonb_build_object(
    'id', count_row.id, 'count_no', count_row.count_no,
    'document_id', count_row.document_id, 'posting_reference', posting_ref,
    'adjusted_count', adjusted_count, 'unchanged_count', unchanged_count,
    'already_posted', false
  );
end;
$$;

revoke all on function public.inventory_item_branch_balance(uuid, uuid) from public, anon, authenticated;
revoke all on function public.post_stock_count_atomic(uuid) from public, anon;
grant execute on function public.post_stock_count_atomic(uuid) to authenticated;
