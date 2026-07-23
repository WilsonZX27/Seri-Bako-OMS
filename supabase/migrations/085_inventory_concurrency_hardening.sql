-- Sprint 7.23.8.0 — Inventory Concurrency Hardening (F-007).
-- Serialize opening stock, receiving, returns, and count posting on the
-- business keys that determine the current inventory truth.

create unique index if not exists stock_transactions_opening_branch_item_idx
  on public.stock_transactions(branch_id, item_id)
  where status = 'posted' and transaction_type = 'opening_balance';

create or replace function public.post_opening_stock(
  p_transaction_no text,
  p_branch_id uuid,
  p_item_id uuid,
  p_location_id uuid,
  p_transaction_date date,
  p_quantity numeric,
  p_unit_cost numeric,
  p_remarks text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  branch_company uuid;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('stock_transactions.create') then
    raise exception 'Missing permission: stock_transactions.create';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('opening:' || p_branch_id::text || ':' || p_item_id::text, 0));
  select company_id into branch_company from public.branches
  where id = p_branch_id and status = 'active' and deleted_at is null;
  if not public.can_access_inventory_branch(branch_company, p_branch_id) then
    raise exception 'You do not have access to this inventory branch.';
  end if;
  if not exists (select 1 from public.locations where id = p_location_id and branch_id = p_branch_id and status = 'active' and deleted_at is null) then
    raise exception 'Opening stock location must belong to the selected branch.';
  end if;
  if not exists (select 1 from public.items where id = p_item_id and status = 'active' and deleted_at is null) then
    raise exception 'Opening stock item must be active.';
  end if;
  if p_quantity <= 0 or coalesce(p_unit_cost, 0) < 0 then
    raise exception 'Opening stock quantity and cost are invalid.';
  end if;
  if exists (
    select 1 from public.stock_transactions
    where branch_id = p_branch_id and item_id = p_item_id
      and transaction_type = 'opening_balance' and status = 'posted'
  ) then
    raise exception 'Opening stock already exists for this branch and item.';
  end if;
  return public.insert_inventory_movement(
    p_transaction_no, null, p_branch_id, p_item_id, p_location_id, 'opening_balance',
    p_transaction_date, p_quantity, 0, coalesce(p_unit_cost, 0), actor.id,
    p_remarks, 'opening_stock_import', null
  );
end
$$;

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid, p_do_exception_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  line public.goods_receiving_lines%rowtype;
  po_line public.purchase_order_lines%rowtype;
  po_status public.purchase_order_status;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;
  select * into grn from public.goods_receivings where id = p_goods_receiving_id and deleted_at is null for update;
  if grn.id is null then raise exception 'Goods receiving not found.'; end if;
  if not public.can_access_inventory_branch(grn.company_id, grn.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if grn.status = 'posted' then return jsonb_build_object('id', grn.id, 'already_posted', true); end if;
  if grn.status <> 'draft' then raise exception 'Only draft GRN can be posted.'; end if;
  if not exists (select 1 from public.locations where id = grn.location_id and branch_id = grn.branch_id) then raise exception 'GRN location does not belong to its trusted branch.'; end if;
  if not exists (select 1 from public.purchase_orders where id = grn.purchase_order_id and company_id = grn.company_id and branch_id = grn.branch_id and supplier_id = grn.supplier_id and status in ('approved','sent','partial_received')) then raise exception 'The linked purchase order is not receivable for this branch and supplier.'; end if;
  if grn.document_id is null or not exists (select 1 from public.attachments where entity_type = 'document' and entity_id = grn.document_id and status = 'active' and deleted_at is null) then
    if nullif(btrim(p_do_exception_reason), '') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if;
  end if;
  if not exists (select 1 from public.goods_receiving_lines where goods_receiving_id = grn.id and received_qty > 0) then raise exception 'Cannot post GRN without at least one received line.'; end if;

  for line in select * from public.goods_receiving_lines where goods_receiving_id = grn.id order by id for update loop
    select * into po_line from public.purchase_order_lines where id = line.purchase_order_line_id and purchase_order_id = grn.purchase_order_id for update;
    if po_line.id is null or po_line.item_id <> line.item_id then raise exception 'GRN contains an invalid purchase-order item.'; end if;
    if line.received_qty + line.rejected_qty > greatest(po_line.qty_ordered - po_line.qty_received - po_line.qty_cancelled, 0) then
      raise exception 'Received plus rejected quantity exceeds the current purchase-order balance.';
    end if;
    if not exists (select 1 from public.items where id = line.item_id and status = 'active' and deleted_at is null) then raise exception 'GRN contains an inactive or deleted item.'; end if;
    if line.received_qty > 0 then
      perform public.inventory_lock_item_location(line.item_id, grn.location_id);
      perform public.insert_inventory_movement(
        'ST-' || grn.grn_no || '-' || left(line.id::text, 4), grn.document_id, grn.branch_id,
        line.item_id, grn.location_id, 'purchase', grn.received_date, line.received_qty, 0,
        line.unit_cost, actor.id, 'Received from ' || grn.grn_no || case when line.batch_no is null then '' else ' batch ' || line.batch_no end,
        'goods_receiving', grn.id
      );
      update public.purchase_order_lines set qty_received = qty_received + line.received_qty where id = po_line.id;
    end if;
  end loop;
  select case when bool_and(qty_ordered - qty_received - qty_cancelled <= 0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end
  into po_status from public.purchase_order_lines where purchase_order_id = grn.purchase_order_id;
  update public.purchase_orders set status = po_status, updated_by = actor.id where id = grn.purchase_order_id;
  update public.goods_receivings set status = 'posted', posted_at = now(), posted_by = actor.id, updated_by = actor.id where id = grn.id and status = 'draft';
  if not found then raise exception 'This GRN changed state. Refresh before trying again.'; end if;
  if grn.document_id is not null then update public.documents set status = 'posted', current_step = 'Posted to inventory', posted_at = now(), updated_by = actor.id where id = grn.document_id; end if;
  return jsonb_build_object('id', grn.id, 'grn_no', grn.grn_no, 'purchase_order_id', grn.purchase_order_id, 'document_id', grn.document_id, 'already_posted', false);
end
$$;

create or replace function public.post_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  ret public.purchase_returns%rowtype;
  line public.purchase_return_lines%rowtype;
  grn_line public.goods_receiving_lines%rowtype;
  movement_id uuid;
  balance numeric;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_return.post') then raise exception 'Missing permission: purchase_return.post'; end if;
  select * into ret from public.purchase_returns where id = p_purchase_return_id and deleted_at is null for update;
  if ret.id is null then raise exception 'Purchase return not found.'; end if;
  if not public.can_access_inventory_branch(ret.company_id, ret.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if ret.status = 'posted' then return jsonb_build_object('id', ret.id, 'already_posted', true); end if;
  if ret.status <> 'draft' then raise exception 'Only draft purchase returns can be posted.'; end if;
  if not exists (select 1 from public.goods_receivings where id = ret.goods_receiving_id and company_id = ret.company_id and branch_id = ret.branch_id and location_id = ret.location_id and supplier_id = ret.supplier_id and status = 'posted') then raise exception 'Purchase return does not match a posted receiving in its trusted branch.'; end if;
  if not exists (select 1 from public.purchase_return_lines where purchase_return_id = ret.id) then raise exception 'Cannot post an empty purchase return.'; end if;

  for line in select * from public.purchase_return_lines where purchase_return_id = ret.id order by id for update loop
    select * into grn_line from public.goods_receiving_lines where id = line.goods_receiving_line_id and goods_receiving_id = ret.goods_receiving_id for update;
    if grn_line.id is null or grn_line.item_id <> line.item_id or grn_line.purchase_order_line_id <> line.purchase_order_line_id then raise exception 'Purchase return contains an invalid receiving line.'; end if;
    if line.return_qty <= 0 or line.return_qty > grn_line.received_qty - grn_line.returned_qty then raise exception 'Return quantity cannot exceed received minus previously returned quantity.'; end if;
    perform public.inventory_lock_item_location(line.item_id, ret.location_id);
    select coalesce(sum(quantity_in - quantity_out), 0) into balance from public.stock_transactions where item_id = line.item_id and location_id = ret.location_id and status = 'posted';
    if balance < line.return_qty then raise exception 'Return would make current branch stock negative.'; end if;
    movement_id := public.insert_inventory_movement(
      'ST-' || ret.purchase_return_no || '-' || left(line.id::text, 4), ret.document_id, ret.branch_id,
      line.item_id, ret.location_id, 'return_to_supplier', ret.return_date, 0, line.return_qty,
      line.unit_cost, actor.id, 'Returned to supplier from ' || ret.purchase_return_no,
      'purchase_return', ret.id
    );
    update public.goods_receiving_lines set returned_qty = returned_qty + line.return_qty where id = grn_line.id;
    update public.purchase_return_lines set stock_transaction_id = movement_id where id = line.id;
  end loop;
  update public.purchase_returns set status = 'posted', posted_at = now(), posted_by = actor.id, updated_by = actor.id where id = ret.id and status = 'draft';
  if not found then raise exception 'This purchase return changed state. Refresh before trying again.'; end if;
  if ret.document_id is not null then update public.documents set status = 'posted', current_step = 'Posted to inventory', posted_at = now(), updated_by = actor.id where id = ret.document_id; end if;
  return jsonb_build_object('id', ret.id, 'purchase_return_no', ret.purchase_return_no, 'goods_receiving_id', ret.goods_receiving_id, 'document_id', ret.document_id, 'already_posted', false);
end
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
  current_balance numeric;
  variance numeric;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.post') then raise exception 'Missing permission: stock_count.post'; end if;
  select * into count_row from public.stock_counts where id = p_stock_count_id and deleted_at is null for update;
  if count_row.id is null then raise exception 'Stock count not found.'; end if;
  if not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if count_row.status = 'posted' then return jsonb_build_object('id', count_row.id, 'already_posted', true); end if;
  if count_row.status <> 'approved' then raise exception 'Only approved stock counts can be posted.'; end if;
  if not exists (select 1 from public.locations where id = count_row.location_id and branch_id = count_row.branch_id) then raise exception 'Stock count location does not belong to its trusted branch.'; end if;
  if exists (select 1 from public.stock_count_lines where stock_count_id = count_row.id and abs(variance_percent) > count_row.tolerance_percent)
     and (count_row.document_id is null or not exists (select 1 from public.attachments where entity_type = 'document' and entity_id = count_row.document_id and status = 'active' and deleted_at is null)) then
    raise exception 'Attach the stock count variance report before posting this stock count.';
  end if;
  for line in select * from public.stock_count_lines where stock_count_id = count_row.id order by id for update loop
    if not exists (select 1 from public.items where id = line.item_id and status = 'active' and deleted_at is null) then raise exception 'Stock count contains an inactive or deleted item.'; end if;
    perform public.inventory_lock_item_location(line.item_id, count_row.location_id);
    select coalesce(sum(quantity_in - quantity_out), 0) into current_balance from public.stock_transactions where item_id = line.item_id and location_id = count_row.location_id and status = 'posted';
    variance := line.physical_qty - current_balance;
    if variance <> 0 then
      perform public.insert_inventory_movement(
        'ST-' || count_row.count_no || '-' || left(line.id::text, 4), count_row.document_id,
        count_row.branch_id, line.item_id, count_row.location_id, 'stock_count_adjustment',
        count_row.count_date, greatest(variance, 0), greatest(-variance, 0), 0, actor.id,
        'Adjusted after stock count ' || count_row.count_no, 'stock_count', count_row.id
      );
    end if;
  end loop;
  update public.stock_counts set status = 'posted', posted_at = now(), updated_by = actor.id where id = count_row.id and status = 'approved';
  if not found then raise exception 'This stock count changed state. Refresh before trying again.'; end if;
  if count_row.document_id is not null then update public.documents set status = 'posted', approval_status = 'approved', current_step = 'Variance posted to ledger', posted_at = now(), updated_by = actor.id where id = count_row.document_id; end if;
  return jsonb_build_object('id', count_row.id, 'count_no', count_row.count_no, 'document_id', count_row.document_id, 'already_posted', false);
end
$$;

revoke all on function public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text) from public, anon;
grant execute on function public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text) to authenticated;
revoke all on function public.post_goods_receiving_atomic(uuid, text), public.post_purchase_return_atomic(uuid), public.post_stock_count_atomic(uuid) from public, anon;
grant execute on function public.post_goods_receiving_atomic(uuid, text), public.post_purchase_return_atomic(uuid), public.post_stock_count_atomic(uuid) to authenticated;
