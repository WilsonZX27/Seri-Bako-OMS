-- Keep supplier purchase quantities on PO/GRN documents, but post inventory
-- in the item's base unit. A missing non-identity conversion fails closed.

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid,p_do_exception_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  line public.goods_receiving_lines%rowtype;
  po_line public.purchase_order_lines%rowtype;
  po_status public.purchase_order_status;
  conversion numeric;
  base_received_qty numeric;
  base_unit_cost numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;
  select * into grn from public.goods_receivings where id=p_goods_receiving_id and deleted_at is null for update;
  if grn.id is null or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then raise exception 'Goods receiving is unavailable for this branch.'; end if;
  if grn.status='posted' then return jsonb_build_object('id',grn.id,'already_posted',true); end if;
  if grn.status<>'draft' then raise exception 'Only draft GRN can be posted.'; end if;
  if grn.document_id is null or not exists(select 1 from public.attachments where entity_type='document' and entity_id=grn.document_id and status='active' and deleted_at is null) then
    if nullif(btrim(p_do_exception_reason),'') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if;
  end if;
  for line in select * from public.goods_receiving_lines where goods_receiving_id=grn.id order by id for update loop
    select * into po_line from public.purchase_order_lines where id=line.purchase_order_line_id and purchase_order_id=grn.purchase_order_id for update;
    if po_line.id is null or po_line.item_id<>line.item_id or line.received_qty+line.rejected_qty>greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0) then raise exception 'GRN contains an invalid or over-received purchase-order line.'; end if;
    select coalesce(si.conversion_to_base_uom, case when upper(trim(i.base_unit))=upper(trim(po_line.uom)) then 1 else null end)
      into conversion
    from public.purchase_orders po
    join public.items i on i.id=po_line.item_id and i.company_id=po.company_id and i.deleted_at is null
    left join public.supplier_items si on si.company_id=po.company_id and si.supplier_id=po.supplier_id and si.item_id=po_line.item_id
      and upper(trim(si.purchase_uom))=upper(trim(po_line.uom)) and si.status='active' and si.deleted_at is null
    where po.id=grn.purchase_order_id and po.company_id=actor.company_id;
    if conversion is null or conversion <= 0 then raise exception 'Supplier UOM conversion is missing for item % and UOM %.', po_line.item_id, po_line.uom; end if;
    if line.received_qty>0 then
      base_received_qty := line.received_qty * conversion;
      base_unit_cost := case when conversion = 0 then line.unit_cost else line.unit_cost / conversion end;
      perform public.inventory_lock_item_branch(line.item_id,grn.branch_id);
      perform public.insert_inventory_movement('ST-'||grn.grn_no||'-'||left(line.id::text,4),grn.document_id,grn.branch_id,line.item_id,'purchase',grn.received_date,base_received_qty,0,base_unit_cost,actor.id,'Received from '||grn.grn_no,'goods_receiving',grn.id);
      update public.purchase_order_lines set qty_received=qty_received+line.received_qty where id=po_line.id;
    end if;
  end loop;
  select case when bool_and(qty_ordered-qty_received-qty_cancelled<=0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end into po_status from public.purchase_order_lines where purchase_order_id=grn.purchase_order_id;
  update public.purchase_orders set status=po_status,updated_by=actor.id where id=grn.purchase_order_id;
  update public.goods_receivings set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=grn.id;
  if grn.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=grn.document_id; end if;
  return jsonb_build_object('id',grn.id,'grn_no',grn.grn_no,'purchase_order_id',grn.purchase_order_id,'document_id',grn.document_id,'already_posted',false);
end $$;

create or replace function public.post_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype;
  ret public.purchase_returns%rowtype;
  line public.purchase_return_lines%rowtype;
  grn_line public.goods_receiving_lines%rowtype;
  movement_id uuid;
  balance numeric;
  conversion numeric;
  base_return_qty numeric;
  base_unit_cost numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_return.post') then raise exception 'Missing permission: purchase_return.post'; end if;
  select * into ret from public.purchase_returns where id=p_purchase_return_id and deleted_at is null for update;
  if ret.id is null or not public.can_access_inventory_branch(ret.company_id,ret.branch_id) then raise exception 'Purchase return is unavailable for this branch.'; end if;
  if ret.status='posted' then return jsonb_build_object('id',ret.id,'already_posted',true); end if;
  if ret.status<>'draft' then raise exception 'Only draft purchase returns can be posted.'; end if;
  for line in select * from public.purchase_return_lines where purchase_return_id=ret.id order by id for update loop
    select * into grn_line from public.goods_receiving_lines where id=line.goods_receiving_line_id and goods_receiving_id=ret.goods_receiving_id for update;
    if grn_line.id is null or line.return_qty<=0 or line.return_qty>grn_line.received_qty-grn_line.returned_qty then raise exception 'Purchase return line is invalid.'; end if;
    select coalesce(si.conversion_to_base_uom, case when upper(trim(i.base_unit))=upper(trim(po_line.uom)) then 1 else null end)
      into conversion
    from public.goods_receivings gr
    join public.purchase_orders po on po.id=gr.purchase_order_id and po.company_id=actor.company_id
    join public.purchase_order_lines po_line on po_line.id=grn_line.purchase_order_line_id and po_line.purchase_order_id=po.id
    join public.items i on i.id=po_line.item_id and i.company_id=po.company_id and i.deleted_at is null
    left join public.supplier_items si on si.company_id=po.company_id and si.supplier_id=po.supplier_id and si.item_id=po_line.item_id
      and upper(trim(si.purchase_uom))=upper(trim(po_line.uom)) and si.status='active' and si.deleted_at is null
    where gr.id=ret.goods_receiving_id;
    if conversion is null or conversion <= 0 then raise exception 'Supplier UOM conversion is missing for item % and UOM %.', line.item_id, grn_line.uom; end if;
    base_return_qty := line.return_qty * conversion;
    base_unit_cost := case when conversion = 0 then line.unit_cost else line.unit_cost / conversion end;
    perform public.inventory_lock_item_branch(line.item_id,ret.branch_id);
    select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=line.item_id and branch_id=ret.branch_id and status='posted';
    if balance<base_return_qty then raise exception 'Return would make current branch stock negative.'; end if;
    movement_id:=public.insert_inventory_movement('ST-'||ret.purchase_return_no||'-'||left(line.id::text,4),ret.document_id,ret.branch_id,line.item_id,'return_to_supplier',ret.return_date,0,base_return_qty,base_unit_cost,actor.id,'Returned to supplier from '||ret.purchase_return_no,'purchase_return',ret.id);
    update public.goods_receiving_lines set returned_qty=returned_qty+line.return_qty where id=grn_line.id;
    update public.purchase_return_lines set stock_transaction_id=movement_id where id=line.id;
  end loop;
  update public.purchase_returns set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=ret.id;
  if ret.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=ret.document_id; end if;
  return jsonb_build_object('id',ret.id,'purchase_return_no',ret.purchase_return_no,'goods_receiving_id',ret.goods_receiving_id,'document_id',ret.document_id,'already_posted',false);
end $$;

revoke all on function public.post_goods_receiving_atomic(uuid,text), public.post_purchase_return_atomic(uuid) from public, anon;
grant execute on function public.post_goods_receiving_atomic(uuid,text), public.post_purchase_return_atomic(uuid) to authenticated;
