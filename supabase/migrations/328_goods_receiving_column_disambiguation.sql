-- Fix the Kitchen GRN creation failure caused by a PL/pgSQL variable sharing
-- the purchase_order_lines.purchase_order_id column name. Preserve RPC ACLs,
-- transaction boundaries, tenant/branch checks and quantity validation.
CREATE OR REPLACE FUNCTION public.create_goods_receiving_atomic(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  actor public.staffs%rowtype;
  po public.purchase_orders%rowtype;
  existing public.goods_receivings%rowtype;
  po_line public.purchase_order_lines%rowtype;
  entry record;
  grn_id uuid;
  document_id uuid;
  grn_no text:=nullif(trim(p_payload->>'grn_no'),'');
  branch_id uuid:=nullif(p_payload->>'branch_id','')::uuid;
  supplier_id uuid:=nullif(p_payload->>'supplier_id','')::uuid;
  v_purchase_order_id uuid:=nullif(p_payload->>'purchase_order_id','')::uuid;
  idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb);
  remaining_qty numeric;
  entered_qty numeric;
  exception_reason text;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('goods_receiving.create') then raise exception 'Missing permission: goods_receiving.create'; end if;
  if grn_no is null or v_purchase_order_id is null or supplier_id is null or branch_id is null or jsonb_typeof(lines)<>'array' or jsonb_array_length(lines)=0 then raise exception 'GRN number, purchase order, supplier, branch, and lines are required.'; end if;
  select * into po from public.purchase_orders where id=v_purchase_order_id and company_id=actor.company_id and deleted_at is null for update;
  if po.id is null or po.supplier_id is distinct from supplier_id or po.branch_id is distinct from branch_id or po.status not in ('approved','sent','partial_received') then raise exception 'Purchase order is unavailable for receiving.'; end if;
  if not public.can_access_inventory_branch(actor.company_id,branch_id) then raise exception 'GRN branch is unavailable.'; end if;
  select * into existing from public.goods_receivings where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'grn_no',existing.grn_no,'document_id',existing.document_id,'idempotent',true); end if;

  for entry in select * from jsonb_to_recordset(lines) as x(
    purchase_order_line_id text,item_id text,received_qty text,rejected_qty text,over_receipt_reason text,
    conversion_to_base_uom_snapshot text,received_base_qty text,rejected_base_qty text
  ) loop
    select pol.* into po_line from public.purchase_order_lines pol
    where pol.id=entry.purchase_order_line_id::uuid and pol.purchase_order_id=po.id for update;
    if po_line.id is null or po_line.item_id<>entry.item_id::uuid then raise exception 'A receiving line does not belong to the selected purchase order.'; end if;
    entered_qty:=coalesce(nullif(entry.received_qty,'')::numeric,0)+coalesce(nullif(entry.rejected_qty,'')::numeric,0);
    remaining_qty:=greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0);
    exception_reason:=nullif(btrim(coalesce(entry.over_receipt_reason,'')),'');
    if coalesce(nullif(entry.received_qty,'')::numeric,0)<0 or coalesce(nullif(entry.rejected_qty,'')::numeric,0)<0 then raise exception 'Received and rejected quantities cannot be negative.'; end if;
    if entered_qty>remaining_qty and coalesce(char_length(exception_reason),0)<3 then raise exception 'Explain why the received and rejected quantity exceeds the PO balance.'; end if;
    if coalesce(char_length(exception_reason),0)>1000 then raise exception 'Over-receipt reason is too long.'; end if;
    if coalesce(nullif(entry.received_qty,'')::numeric,0)>0 and coalesce(nullif(entry.conversion_to_base_uom_snapshot,'')::numeric,0)<=0 then raise exception 'Confirm the Purchase-to-Base UOM conversion before receiving this item.'; end if;
    if coalesce(nullif(entry.received_qty,'')::numeric,0)>0 and coalesce(nullif(entry.received_base_qty,'')::numeric,0)<=0 then raise exception 'Enter the actual Base UOM quantity for every received line.'; end if;
    if coalesce(nullif(entry.rejected_qty,'')::numeric,0)>0 and coalesce(nullif(entry.rejected_base_qty,'')::numeric,0)<0 then raise exception 'Enter the actual Base UOM quantity for rejected stock.'; end if;
  end loop;

  grn_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,grn_no,'goods_receiving','Goods Receiving '||grn_no,'draft','not_required','Draft receiving','goods_receiving',grn_id,actor.id,actor.id);
  insert into public.goods_receivings(id,company_id,document_id,purchase_order_id,grn_no,supplier_id,received_date,branch_id,status,received_by,remarks,created_by,updated_by,idempotency_key) values(grn_id,actor.company_id,document_id,po.id,grn_no,supplier_id,coalesce(nullif(p_payload->>'received_date','')::date,current_date),branch_id,'draft',actor.id,nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.goods_receiving_lines(goods_receiving_id,purchase_order_line_id,item_id,ordered_qty,previously_received_qty,pending_qty,received_qty,rejected_qty,uom,unit_cost,batch_no,expiry_date,remarks,received_base_qty,rejected_base_qty,conversion_to_base_uom_snapshot,conversion_source,conversion_confirmed_by,conversion_confirmed_at,remember_conversion,over_receipt_reason)
  select grn_id,x.purchase_order_line_id::uuid,x.item_id::uuid,x.ordered_qty::numeric,x.previously_received_qty::numeric,x.pending_qty::numeric,x.received_qty::numeric,x.rejected_qty::numeric,upper(btrim(x.uom)),x.unit_cost::numeric,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),''),x.received_base_qty::numeric,x.rejected_base_qty::numeric,x.conversion_to_base_uom_snapshot::numeric,coalesce(nullif(x.conversion_source,''),'receiving_confirmed'),actor.id,now(),coalesce(x.remember_conversion,false),case when x.received_qty::numeric+x.rejected_qty::numeric>greatest(x.pending_qty::numeric,0) then nullif(btrim(x.over_receipt_reason),'') else null end
  from jsonb_to_recordset(lines) as x(purchase_order_line_id text,item_id text,ordered_qty text,previously_received_qty text,pending_qty text,received_qty text,rejected_qty text,uom text,unit_cost text,batch_no text,expiry_date text,remarks text,received_base_qty text,rejected_base_qty text,conversion_to_base_uom_snapshot text,conversion_source text,remember_conversion boolean,over_receipt_reason text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial goods receiving created with Purchase/Base UOM snapshots.',actor.id);
  return jsonb_build_object('id',grn_id,'grn_no',grn_no,'document_id',document_id,'idempotent',false);
end $function$
;

notify pgrst, 'reload schema';
