-- Draft GRNs remain editable until posting. Controlled over-receipt is
-- allowed only with an explicit reason that is retained on the receiving line.
alter table public.goods_receiving_lines
  add column if not exists over_receipt_reason text;

-- The application and posting RPC use the canonical grn.post permission.
-- Keep the older goods_receiving.post alias, but ensure Kitchen receives the
-- permission actually checked by the posting path.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r
join public.permissions p on p.permission_code in ('grn.post','goods_receiving.post')
where r.role_code='kitchen' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

create or replace function public.update_goods_receiving_draft_atomic(
  p_goods_receiving_id uuid,
  p_lines jsonb
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  entry record;
  grn_line public.goods_receiving_lines%rowtype;
  po_line public.purchase_order_lines%rowtype;
  v_received_qty numeric;
  v_rejected_qty numeric;
  remaining_qty numeric;
  exception_reason text;
begin
  select * into actor from public.staffs
  where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['goods_receiving.update','grn.post']) then
    raise exception 'Missing permission: goods_receiving.update';
  end if;

  select * into grn from public.goods_receivings
  where id=p_goods_receiving_id and company_id=actor.company_id and deleted_at is null for update;
  if grn.id is null or grn.status<>'draft' or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then
    raise exception 'Only an accessible draft Goods Receiving can be edited.';
  end if;
  if jsonb_typeof(coalesce(p_lines,'null'::jsonb))<>'array' or jsonb_array_length(p_lines)=0 then
    raise exception 'At least one receiving line is required.';
  end if;

  for entry in select * from jsonb_to_recordset(p_lines) as x(
    line_id uuid, received_qty numeric, rejected_qty numeric, over_receipt_reason text
  ) loop
    select * into grn_line from public.goods_receiving_lines
    where id=entry.line_id and goods_receiving_id=grn.id for update;
    if grn_line.id is null then raise exception 'A receiving line is outside this GRN.'; end if;
    select * into po_line from public.purchase_order_lines
    where id=grn_line.purchase_order_line_id and purchase_order_id=grn.purchase_order_id for update;
    if po_line.id is null or po_line.item_id<>grn_line.item_id then raise exception 'The linked purchase-order line is unavailable.'; end if;

    v_received_qty:=coalesce(entry.received_qty,0);
    v_rejected_qty:=coalesce(entry.rejected_qty,0);
    exception_reason:=nullif(btrim(coalesce(entry.over_receipt_reason,'')),'');
    remaining_qty:=greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0);
    if v_received_qty<0 or v_rejected_qty<0 then raise exception 'Received and rejected quantities cannot be negative.'; end if;
    if v_received_qty+v_rejected_qty>remaining_qty and coalesce(char_length(exception_reason),0)<3 then
      raise exception 'Explain why the received and rejected quantity exceeds the PO balance.';
    end if;
    if v_received_qty>0 and coalesce(grn_line.conversion_to_base_uom_snapshot,0)<=0 then
      raise exception 'Confirm the Purchase-to-Base UOM conversion before receiving this item.';
    end if;

    update public.goods_receiving_lines set
      received_qty=v_received_qty,
      rejected_qty=v_rejected_qty,
      received_base_qty=case when v_received_qty>0 then v_received_qty*conversion_to_base_uom_snapshot else 0 end,
      rejected_base_qty=case when v_rejected_qty>0 then v_rejected_qty*conversion_to_base_uom_snapshot else 0 end,
      over_receipt_reason=case when v_received_qty+v_rejected_qty>remaining_qty then exception_reason else null end,
      updated_at=now()
    where id=grn_line.id;
  end loop;

  update public.goods_receivings set updated_by=actor.id,updated_at=now() where id=grn.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(grn.company_id,'goods_receiving',grn.id,'draft_receiving_updated','Received quantities updated before posting',
    jsonb_build_object('line_count',jsonb_array_length(p_lines)),actor.id);
  if grn.document_id is not null then
    insert into public.document_revisions(document_id,revision_no,change_summary,changed_by)
    select grn.document_id,coalesce(max(revision_no),0)+1,'Received quantities updated before posting.',actor.id
    from public.document_revisions where document_id=grn.document_id;
  end if;
  return jsonb_build_object('id',grn.id,'line_count',jsonb_array_length(p_lines));
end $$;

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid,p_do_exception_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; grn public.goods_receivings%rowtype; line public.goods_receiving_lines%rowtype; po_line public.purchase_order_lines%rowtype; po public.purchase_orders%rowtype; item_row public.items%rowtype; si public.supplier_items%rowtype; po_status public.purchase_order_status; base_unit_cost numeric; before_conversion numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;
  select * into grn from public.goods_receivings where id=p_goods_receiving_id and deleted_at is null for update;
  if grn.id is null or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then raise exception 'Goods receiving is unavailable for this branch.'; end if;
  if grn.status='posted' then return jsonb_build_object('id',grn.id,'already_posted',true); end if;
  if grn.status<>'draft' then raise exception 'Only draft GRN can be posted.'; end if;
  if grn.document_id is null or not exists(select 1 from public.attachments where entity_type='document' and entity_id=grn.document_id and status='active' and deleted_at is null) then if nullif(btrim(p_do_exception_reason),'') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if; end if;
  select * into po from public.purchase_orders where id=grn.purchase_order_id and company_id=actor.company_id;
  perform set_config('app.purchase_receipt_posting','on',true);
  for line in select * from public.goods_receiving_lines where goods_receiving_id=grn.id order by id for update loop
    select * into po_line from public.purchase_order_lines where id=line.purchase_order_line_id and purchase_order_id=grn.purchase_order_id for update;
    select * into item_row from public.items where id=line.item_id and company_id=grn.company_id and deleted_at is null;
    if po_line.id is null or po_line.item_id<>line.item_id then raise exception 'GRN contains an invalid purchase-order line.'; end if;
    if line.received_qty+line.rejected_qty>greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0) and coalesce(char_length(btrim(line.over_receipt_reason)),0)<3 then raise exception 'An over-received line requires an exception reason.'; end if;
    if line.received_qty>0 and (line.received_base_qty is null or line.received_base_qty<=0 or line.conversion_to_base_uom_snapshot is null or line.conversion_to_base_uom_snapshot<=0) then raise exception 'Enter the actual Base UOM quantity for every received line.'; end if;
    if line.rejected_qty>0 and (line.rejected_base_qty is null or line.rejected_base_qty<0) then raise exception 'Enter the actual Base UOM quantity for rejected stock.'; end if;
    if line.received_qty>0 then
      base_unit_cost:=line.unit_cost/line.conversion_to_base_uom_snapshot;
      perform public.inventory_lock_item_branch(line.item_id,grn.branch_id);
      perform public.insert_inventory_movement('ST-'||grn.grn_no||'-'||left(line.id::text,4),grn.document_id,grn.branch_id,line.item_id,'purchase',grn.received_date,line.received_base_qty,0,base_unit_cost,actor.id,'Received from '||grn.grn_no,'goods_receiving',grn.id);
      update public.purchase_order_lines set qty_received=qty_received+line.received_qty where id=po_line.id;
    end if;
    if line.remember_conversion then
      select * into si from public.supplier_items where company_id=grn.company_id and supplier_id=po.supplier_id and item_id=line.item_id and upper(btrim(purchase_uom))=upper(btrim(line.uom)) and status='active' and deleted_at is null order by created_at limit 1 for update;
      before_conversion:=si.conversion_to_base_uom;
      if si.id is null then
        insert into public.supplier_items(company_id,supplier_id,item_id,supplier_item_code,supplier_item_name,purchase_uom,conversion_to_base_uom,unit_cost,status,created_by,updated_by) values(grn.company_id,po.supplier_id,line.item_id,'LEARNED-'||item_row.item_code||'-'||upper(btrim(line.uom)),item_row.item_name,upper(btrim(line.uom)),line.conversion_to_base_uom_snapshot,line.unit_cost,'active',actor.id,actor.id) returning * into si;
      else update public.supplier_items set conversion_to_base_uom=line.conversion_to_base_uom_snapshot,updated_by=actor.id where id=si.id; end if;
      insert into public.supplier_uom_conversion_audit(company_id,supplier_id,item_id,purchase_uom,base_uom,before_conversion,after_conversion,goods_receiving_id,goods_receiving_line_id,changed_by) values(grn.company_id,po.supplier_id,line.item_id,line.uom,item_row.base_unit,before_conversion,line.conversion_to_base_uom_snapshot,grn.id,line.id,actor.id);
    end if;
  end loop;
  select case when bool_and(qty_ordered-qty_received-qty_cancelled<=0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end into po_status from public.purchase_order_lines where purchase_order_id=grn.purchase_order_id;
  update public.purchase_orders set status=po_status,updated_by=actor.id where id=grn.purchase_order_id;
  update public.goods_receivings set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=grn.id;
  if grn.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=grn.document_id; end if;
  return jsonb_build_object('id',grn.id,'grn_no',grn.grn_no,'purchase_order_id',grn.purchase_order_id,'document_id',grn.document_id,'already_posted',false);
end $$;

revoke all on function public.update_goods_receiving_draft_atomic(uuid,jsonb) from public,anon;
grant execute on function public.update_goods_receiving_draft_atomic(uuid,jsonb) to authenticated;
revoke all on function public.post_goods_receiving_atomic(uuid,text) from public,anon;
grant execute on function public.post_goods_receiving_atomic(uuid,text) to authenticated;
notify pgrst,'reload schema';
