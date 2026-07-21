-- Inventory go-live hardening: branch-authoritative access and atomic ledger posting.

create or replace function public.can_access_inventory_branch(target_company_id uuid, target_branch_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;

  if actor.id is null or actor.company_id is distinct from target_company_id or target_branch_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = actor.id
      and r.role_code in ('super_admin', 'finance', 'manager', 'purchasing')
      and r.status = 'active' and r.deleted_at is null
      and sr.effective_from <= current_date
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.staff_branches sb
    where sb.staff_id = actor.id and sb.branch_id = target_branch_id
  );
end
$$;

revoke all on function public.can_access_inventory_branch(uuid, uuid) from public, anon;
grant execute on function public.can_access_inventory_branch(uuid, uuid) to authenticated;

create or replace function public.insert_inventory_movement(
  p_transaction_no text,
  p_document_id uuid,
  p_branch_id uuid,
  p_item_id uuid,
  p_location_id uuid,
  p_transaction_type public.stock_transaction_type,
  p_transaction_date date,
  p_quantity_in numeric,
  p_quantity_out numeric,
  p_unit_cost numeric,
  p_actor_id uuid,
  p_remarks text,
  p_reference_type text,
  p_reference_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_id uuid;
begin
  if p_quantity_in < 0 or p_quantity_out < 0
     or (p_quantity_in > 0 and p_quantity_out > 0)
     or (p_quantity_in = 0 and p_quantity_out = 0) then
    raise exception 'Inventory movement must contain one positive direction.';
  end if;

  insert into public.stock_transactions (
    transaction_no, document_id, branch_id, item_id, location_id, transaction_type,
    transaction_date, quantity_in, quantity_out, unit_cost, total_cost, status,
    posted_at, posted_by, remarks, reference_type, reference_id, created_by
  ) values (
    p_transaction_no, p_document_id, p_branch_id, p_item_id, p_location_id, p_transaction_type,
    p_transaction_date, p_quantity_in, p_quantity_out, coalesce(p_unit_cost, 0),
    greatest(p_quantity_in, p_quantity_out) * coalesce(p_unit_cost, 0), 'posted',
    now(), p_actor_id, p_remarks, p_reference_type, p_reference_id, p_actor_id
  ) returning id into movement_id;

  insert into public.stock_transaction_lines (
    stock_transaction_id, stock_entity_type, item_id, branch_id, location_id,
    quantity_in, quantity_out, unit_cost, reference_type, reference_id, remarks, created_by
  ) values (
    movement_id, 'item', p_item_id, p_branch_id, p_location_id,
    p_quantity_in, p_quantity_out, coalesce(p_unit_cost, 0),
    p_reference_type, p_reference_id, p_remarks, p_actor_id
  );

  return movement_id;
end
$$;

revoke all on function public.insert_inventory_movement(text, uuid, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, uuid, text, text, uuid) from public, anon, authenticated;

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
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  branch_company uuid;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_transactions.create') then
    raise exception 'Missing permission: stock_transactions.create';
  end if;
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

revoke all on function public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text) from public, anon;
grant execute on function public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text) to authenticated;

create or replace function public.post_opening_stock_batch(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row_value jsonb;
  posted_count integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Opening stock batch must contain between 1 and 500 rows.';
  end if;
  for row_value in select value from jsonb_array_elements(p_rows) loop
    perform public.post_opening_stock(
      row_value->>'transaction_no', (row_value->>'branch_id')::uuid, (row_value->>'item_id')::uuid,
      (row_value->>'location_id')::uuid, (row_value->>'transaction_date')::date,
      (row_value->>'quantity')::numeric, (row_value->>'unit_cost')::numeric, row_value->>'remarks'
    );
    posted_count := posted_count + 1;
  end loop;
  return posted_count;
end
$$;

revoke all on function public.post_opening_stock_batch(jsonb) from public, anon;
grant execute on function public.post_opening_stock_batch(jsonb) to authenticated;

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid, p_do_exception_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  line public.goods_receiving_lines%rowtype;
  po_status public.purchase_order_status;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;

  select * into grn from public.goods_receivings where id = p_goods_receiving_id and deleted_at is null for update;
  if grn.id is null then raise exception 'Goods receiving not found.'; end if;
  if not public.can_access_inventory_branch(grn.company_id, grn.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if grn.status = 'posted' then return jsonb_build_object('id', grn.id, 'already_posted', true); end if;
  if grn.status <> 'draft' then raise exception 'Only draft GRN can be posted.'; end if;
  if not exists (select 1 from public.locations where id = grn.location_id and branch_id = grn.branch_id) then raise exception 'GRN location does not belong to its trusted branch.'; end if;
  if not exists (select 1 from public.purchase_orders where id = grn.purchase_order_id and company_id = grn.company_id and branch_id = grn.branch_id and supplier_id = grn.supplier_id and status in ('approved','sent','partial_received')) then
    raise exception 'The linked purchase order is not receivable for this branch and supplier.';
  end if;
  if grn.document_id is null or not exists (
    select 1 from public.attachments where entity_type = 'document' and entity_id = grn.document_id
      and status = 'active' and deleted_at is null
  ) then
    if nullif(btrim(p_do_exception_reason), '') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if;
  end if;
  if not exists (select 1 from public.goods_receiving_lines where goods_receiving_id = grn.id and received_qty > 0) then raise exception 'Cannot post GRN without at least one received line.'; end if;

  for line in select * from public.goods_receiving_lines where goods_receiving_id = grn.id order by id for update loop
    if line.received_qty + line.rejected_qty > line.pending_qty then raise exception 'Received plus rejected quantity cannot exceed pending quantity.'; end if;
    if not exists (
      select 1 from public.purchase_order_lines pol join public.items i on i.id = pol.item_id
      where pol.id = line.purchase_order_line_id and pol.purchase_order_id = grn.purchase_order_id
        and pol.item_id = line.item_id and i.status = 'active' and i.deleted_at is null
    ) then raise exception 'GRN contains an invalid purchase-order item.'; end if;
    if line.received_qty > 0 then
      perform public.insert_inventory_movement(
        'ST-' || grn.grn_no || '-' || left(line.id::text, 4), grn.document_id, grn.branch_id,
        line.item_id, grn.location_id, 'purchase', grn.received_date, line.received_qty, 0,
        line.unit_cost, actor.id, 'Received from ' || grn.grn_no || case when line.batch_no is null then '' else ' batch ' || line.batch_no end,
        'goods_receiving', grn.id
      );
      update public.purchase_order_lines
      set qty_received = qty_received + line.received_qty
      where id = line.purchase_order_line_id;
    end if;
  end loop;

  select case when bool_and(qty_ordered - qty_received - qty_cancelled <= 0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end
  into po_status from public.purchase_order_lines where purchase_order_id = grn.purchase_order_id;
  update public.purchase_orders set status = po_status, updated_by = actor.id where id = grn.purchase_order_id;
  update public.goods_receivings set status = 'posted', posted_at = now(), posted_by = actor.id, updated_by = actor.id where id = grn.id and status = 'draft';
  if not found then raise exception 'This GRN changed state. Refresh before trying again.'; end if;
  if grn.document_id is not null then
    update public.documents set status = 'posted', current_step = 'Posted to inventory', posted_at = now(), updated_by = actor.id where id = grn.document_id;
  end if;
  return jsonb_build_object('id', grn.id, 'grn_no', grn.grn_no, 'purchase_order_id', grn.purchase_order_id, 'document_id', grn.document_id, 'already_posted', false);
end
$$;

revoke all on function public.post_goods_receiving_atomic(uuid, text) from public, anon;
grant execute on function public.post_goods_receiving_atomic(uuid, text) to authenticated;

create or replace function public.post_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  if not exists (select 1 from public.goods_receivings where id = ret.goods_receiving_id and company_id = ret.company_id and branch_id = ret.branch_id and location_id = ret.location_id and supplier_id = ret.supplier_id and status = 'posted') then
    raise exception 'Purchase return does not match a posted receiving in its trusted branch.';
  end if;
  if not exists (select 1 from public.purchase_return_lines where purchase_return_id = ret.id) then raise exception 'Cannot post an empty purchase return.'; end if;

  for line in select * from public.purchase_return_lines where purchase_return_id = ret.id order by id for update loop
    select * into grn_line from public.goods_receiving_lines where id = line.goods_receiving_line_id and goods_receiving_id = ret.goods_receiving_id for update;
    if grn_line.id is null or grn_line.item_id <> line.item_id or grn_line.purchase_order_line_id <> line.purchase_order_line_id then raise exception 'Purchase return contains an invalid receiving line.'; end if;
    if line.return_qty <= 0 or line.return_qty > grn_line.received_qty - grn_line.returned_qty then raise exception 'Return quantity cannot exceed received minus previously returned quantity.'; end if;
    select coalesce(sum(quantity_in - quantity_out), 0) into balance from public.stock_transactions
      where item_id = line.item_id and location_id = ret.location_id and status = 'posted';
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

revoke all on function public.post_purchase_return_atomic(uuid) from public, anon;
grant execute on function public.post_purchase_return_atomic(uuid) to authenticated;

create or replace function public.approve_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.approve') then raise exception 'Missing permission: stock_count.approve'; end if;
  select * into count_row from public.stock_counts where id = p_stock_count_id and deleted_at is null for update;
  if count_row.id is null then raise exception 'Stock count not found.'; end if;
  if not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if count_row.status <> 'reviewed' then raise exception 'Only reviewed stock counts can be approved.'; end if;
  if exists (select 1 from public.stock_count_lines where stock_count_id = count_row.id and abs(variance_percent) > count_row.tolerance_percent)
     and (count_row.document_id is null or not exists (select 1 from public.attachments where entity_type = 'document' and entity_id = count_row.document_id and status = 'active' and deleted_at is null)) then
    raise exception 'Attach the stock count variance report before approving this stock count.';
  end if;
  update public.stock_counts set status = 'approved', approved_at = now(), updated_by = actor.id where id = count_row.id and status = 'reviewed';
  if not found then raise exception 'This stock count changed state. Refresh before trying again.'; end if;
  if count_row.document_id is not null then update public.documents set status = 'approved', approval_status = 'approved', current_step = 'Ready to post', updated_by = actor.id where id = count_row.document_id; end if;
  return jsonb_build_object('id', count_row.id, 'count_no', count_row.count_no, 'document_id', count_row.document_id);
end
$$;

revoke all on function public.approve_stock_count_atomic(uuid) from public, anon;
grant execute on function public.approve_stock_count_atomic(uuid) to authenticated;

create or replace function public.post_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  line public.stock_count_lines%rowtype;
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
    variance := line.physical_qty - line.theoretical_qty;
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

revoke all on function public.post_stock_count_atomic(uuid) from public, anon;
grant execute on function public.post_stock_count_atomic(uuid) to authenticated;

-- Replace permission-only visibility with company + trusted branch scope.
drop policy if exists "Authenticated users can read stock transactions" on public.stock_transactions;
drop policy if exists "stock transactions scoped read" on public.stock_transactions;
create policy "stock transactions scoped read" on public.stock_transactions for select to authenticated using (
  public.has_permission('stock_transactions.read')
  and exists (select 1 from public.branches b where b.id = stock_transactions.branch_id and public.can_access_inventory_branch(b.company_id, b.id))
);

drop policy if exists "stock transaction lines read" on public.stock_transaction_lines;
create policy "stock transaction lines scoped read" on public.stock_transaction_lines for select to authenticated using (
  public.has_permission('stock_transactions.read')
  and exists (select 1 from public.stock_transactions st where st.id = stock_transaction_lines.stock_transaction_id)
);

drop policy if exists "stock counts read" on public.stock_counts;
create policy "stock counts scoped read" on public.stock_counts for select to authenticated using (
  public.has_permission('stock_count.read') and public.can_access_inventory_branch(company_id, branch_id)
);
drop policy if exists "stock count lines read" on public.stock_count_lines;
create policy "stock count lines scoped read" on public.stock_count_lines for select to authenticated using (
  public.has_permission('stock_count.read') and exists (select 1 from public.stock_counts sc where sc.id = stock_count_lines.stock_count_id)
);

drop policy if exists "goods receiving read" on public.goods_receivings;
create policy "goods receiving scoped read" on public.goods_receivings for select to authenticated using (
  public.has_permission('goods_receiving.read') and public.can_access_inventory_branch(company_id, branch_id)
);
drop policy if exists "goods receiving lines read" on public.goods_receiving_lines;
create policy "goods receiving lines scoped read" on public.goods_receiving_lines for select to authenticated using (
  public.has_permission('goods_receiving.read') and exists (select 1 from public.goods_receivings grn where grn.id = goods_receiving_lines.goods_receiving_id)
);

drop policy if exists "purchase returns read" on public.purchase_returns;
create policy "purchase returns scoped read" on public.purchase_returns for select to authenticated using (
  public.has_permission('purchase_return.view') and public.can_access_inventory_branch(company_id, branch_id)
);
drop policy if exists "purchase return lines read" on public.purchase_return_lines;
create policy "purchase return lines scoped read" on public.purchase_return_lines for select to authenticated using (
  public.has_permission('purchase_return.view') and exists (select 1 from public.purchase_returns pr where pr.id = purchase_return_lines.purchase_return_id)
);

drop policy if exists "stock counts create" on public.stock_counts;
create policy "stock counts scoped create" on public.stock_counts for insert to authenticated with check (
  public.has_permission('stock_count.create') and public.can_access_inventory_branch(company_id, branch_id)
  and exists (select 1 from public.locations l where l.id = stock_counts.location_id and l.branch_id = stock_counts.branch_id)
);
drop policy if exists "stock counts update" on public.stock_counts;
create policy "stock counts scoped update" on public.stock_counts for update to authenticated using (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('stock_count.update') or public.has_permission('stock_count.approve') or public.has_permission('stock_count.post'))
) with check (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('stock_count.update') or public.has_permission('stock_count.approve') or public.has_permission('stock_count.post'))
);
drop policy if exists "stock count lines manage" on public.stock_count_lines;
create policy "stock count lines scoped manage" on public.stock_count_lines for all to authenticated using (
  (public.has_permission('stock_count.update') or public.has_permission('stock_count.create'))
  and exists (select 1 from public.stock_counts sc where sc.id = stock_count_lines.stock_count_id)
) with check (
  (public.has_permission('stock_count.update') or public.has_permission('stock_count.create'))
  and exists (select 1 from public.stock_counts sc where sc.id = stock_count_lines.stock_count_id)
);

drop policy if exists "goods receiving create" on public.goods_receivings;
create policy "goods receiving scoped create" on public.goods_receivings for insert to authenticated with check (
  public.has_permission('goods_receiving.create') and public.can_access_inventory_branch(company_id, branch_id)
  and exists (select 1 from public.locations l where l.id = goods_receivings.location_id and l.branch_id = goods_receivings.branch_id)
);
drop policy if exists "goods receiving update" on public.goods_receivings;
create policy "goods receiving scoped update" on public.goods_receivings for update to authenticated using (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.post') or public.has_permission('goods_receiving.cancel'))
) with check (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.post') or public.has_permission('goods_receiving.cancel'))
);
drop policy if exists "goods receiving lines manage" on public.goods_receiving_lines;
create policy "goods receiving lines scoped manage" on public.goods_receiving_lines for all to authenticated using (
  (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.create'))
  and exists (select 1 from public.goods_receivings grn where grn.id = goods_receiving_lines.goods_receiving_id)
) with check (
  (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.create'))
  and exists (select 1 from public.goods_receivings grn where grn.id = goods_receiving_lines.goods_receiving_id)
);

drop policy if exists "purchase returns insert" on public.purchase_returns;
create policy "purchase returns scoped insert" on public.purchase_returns for insert to authenticated with check (
  public.has_permission('purchase_return.create') and public.can_access_inventory_branch(company_id, branch_id)
  and exists (select 1 from public.locations l where l.id = purchase_returns.location_id and l.branch_id = purchase_returns.branch_id)
);
drop policy if exists "purchase returns update" on public.purchase_returns;
create policy "purchase returns scoped update" on public.purchase_returns for update to authenticated using (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('purchase_return.create') or public.has_permission('purchase_return.post') or public.has_permission('purchase_return.cancel'))
) with check (
  public.can_access_inventory_branch(company_id, branch_id)
  and (public.has_permission('purchase_return.create') or public.has_permission('purchase_return.post') or public.has_permission('purchase_return.cancel'))
);
drop policy if exists "purchase return lines insert" on public.purchase_return_lines;
create policy "purchase return lines scoped insert" on public.purchase_return_lines for insert to authenticated with check (
  public.has_permission('purchase_return.create')
  and exists (select 1 from public.purchase_returns pr where pr.id = purchase_return_lines.purchase_return_id)
);
drop policy if exists "purchase return lines update" on public.purchase_return_lines;
create policy "purchase return lines scoped update" on public.purchase_return_lines for update to authenticated using (
  public.has_permission('purchase_return.post')
  and exists (select 1 from public.purchase_returns pr where pr.id = purchase_return_lines.purchase_return_id)
) with check (
  public.has_permission('purchase_return.post')
  and exists (select 1 from public.purchase_returns pr where pr.id = purchase_return_lines.purchase_return_id)
);
