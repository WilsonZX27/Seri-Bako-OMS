-- Direct Purchase Orders are historical AutoCount records. They use the exact
-- external number and bypass the Purchase Request approval workflow.

do $$
declare
  old_po public.purchase_orders%rowtype;
begin
  select * into old_po
  from public.purchase_orders
  where po_no = 'PO/SEP26/001' and deleted_at is null;

  if old_po.id is not null then
    if exists (
      select 1 from public.purchase_orders
      where company_id = old_po.company_id and po_no = 'PO - 000207'
        and id <> old_po.id and deleted_at is null
    ) or exists (
      select 1 from public.documents
      where company_id = old_po.company_id and document_no = 'PO - 000207'
        and id <> old_po.document_id and deleted_at is null
    ) then
      raise exception 'Cannot rename PO/SEP26/001: PO - 000207 already exists.';
    end if;

    update public.purchase_orders
    set po_no = 'PO - 000207',
        status = case when status in ('draft','pending_approval') then 'approved' else status end,
        approval_status = case when status in ('draft','pending_approval') then 'not_required' else approval_status end,
        updated_at = now()
    where id = old_po.id;

    if old_po.document_id is not null then
      update public.documents
      set document_no = 'PO - 000207', title = 'Purchase Order PO - 000207',
          status = case when status in ('draft','pending_approval') then 'approved' else status end,
          approval_status = case when status in ('draft','pending_approval') then 'not_required' else approval_status end,
          current_step = case when status in ('draft','pending_approval') then 'Ready to send supplier' else current_step end
      where id = old_po.document_id and company_id = old_po.company_id;
      insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
      select old_po.document_id, coalesce(max(revision_no), 0) + 1,
        'Corrected AutoCount PO number from PO/SEP26/001 to PO - 000207; direct PO approval is not required.', old_po.updated_by
      from public.document_revisions where document_id = old_po.document_id;
    end if;

    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values(old_po.company_id, 'purchase_order', old_po.id, 'corrected',
      'AutoCount PO number corrected to PO - 000207',
      jsonb_build_object('from_po_no','PO/SEP26/001','to_po_no','PO - 000207','approval_required',false), old_po.updated_by);
  end if;
end $$;

create or replace function public.create_purchase_order_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype; existing public.purchase_orders%rowtype; order_id uuid; document_id uuid;
  po_no text := nullif(trim(p_payload->>'po_no'),''); branch_id uuid := nullif(p_payload->>'branch_id','')::uuid;
  supplier_id uuid := nullif(p_payload->>'supplier_id','')::uuid; idem uuid := nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_order.create') then raise exception 'You do not have permission to create a purchase order.'; end if;
  if po_no is null or supplier_id is null or jsonb_array_length(lines)=0 then raise exception 'AutoCount PO number, supplier, and at least one line are required.'; end if;
  if not exists (select 1 from public.branches b where b.id=branch_id and b.company_id=actor.company_id and b.deleted_at is null) then raise exception 'Branch is outside your company.'; end if;
  if not exists (select 1 from public.suppliers s where s.id=supplier_id and s.company_id=actor.company_id and s.status='active' and s.deleted_at is null) then raise exception 'Supplier is outside your company or inactive.'; end if;
  select * into existing from public.purchase_orders where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'po_no',existing.po_no,'document_id',existing.document_id); end if;
  if exists (select 1 from public.purchase_orders p where p.company_id=actor.company_id and p.po_no=po_no and p.deleted_at is null) then raise exception 'This AutoCount PO number already exists.'; end if;
  order_id := gen_random_uuid(); document_id := gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(document_id,actor.company_id,po_no,'purchase_order','Purchase Order '||po_no,'approved','not_required','Ready to send supplier','purchase_order',order_id,actor.id,actor.id);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Direct AutoCount purchase order created; approval not required.',actor.id);
  insert into public.purchase_orders(id,company_id,document_id,branch_id,po_no,supplier_id,order_date,expected_delivery_date,status,approval_status,remarks,created_by,updated_by,idempotency_key)
  values(order_id,actor.company_id,document_id,branch_id,po_no,supplier_id,coalesce(nullif(p_payload->>'order_date','')::date,current_date),nullif(p_payload->>'expected_delivery_date','')::date,'approved','not_required',p_payload->>'remarks',actor.id,actor.id,idem);
  insert into public.purchase_order_lines(purchase_order_id,item_id,qty_ordered,qty_received,qty_cancelled,uom,unit_price,remarks)
  select order_id,x.item_id::uuid,x.qty_ordered::numeric,coalesce(x.qty_received::numeric,0),coalesce(x.qty_cancelled::numeric,0),x.uom,coalesce(x.unit_price::numeric,0),nullif(btrim(x.remarks),'')
  from jsonb_to_recordset(lines) as x(item_id text,qty_ordered text,qty_received text,qty_cancelled text,uom text,unit_price text,remarks text);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'document',document_id,'created','Purchase order '||po_no||' created',jsonb_build_object('source','autocount','approval_required',false),actor.id);
  return jsonb_build_object('id',order_id,'po_no',po_no,'document_id',document_id);
end $$;

revoke all on function public.create_purchase_order_atomic(jsonb) from public, anon;
grant execute on function public.create_purchase_order_atomic(jsonb) to authenticated;

create or replace function public.transition_purchase_order_atomic(p_purchase_order_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype; po public.purchase_orders%rowtype; next_status public.purchase_order_status;
  next_approval public.approval_status; document_status public.document_status; next_step text; activity_message text;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  if p_action in ('submit','approve','reject') then raise exception 'Direct purchase orders do not use a manager approval workflow.';
  elsif p_action='send' then if not public.has_any_permission(array['po.send','purchase_order.send']) then raise exception 'Missing permission: po.send'; end if;
  elsif p_action='cancel' then if not public.has_any_permission(array['po.cancel','purchase_order.cancel']) then raise exception 'Missing permission: purchase_order.cancel'; end if;
  elsif p_action='close' then if not public.has_any_permission(array['po.close','purchase_order.close']) then raise exception 'Missing permission: purchase_order.close'; end if;
  else raise exception 'Unknown purchase-order transition.'; end if;
  select * into po from public.purchase_orders where id=p_purchase_order_id and company_id=actor.company_id and deleted_at is null for update;
  if po.id is null then raise exception 'Purchase order not found in your company.'; end if;
  next_approval := po.approval_status;
  if p_action='send' then
    if po.status<>'approved' or po.approval_status not in ('approved','not_required') then raise exception 'Only a ready purchase order can be sent.'; end if;
    next_status:='sent'; document_status:='approved'; next_step:='Sent to supplier'; activity_message:='Purchase order sent to supplier';
  elsif p_action='cancel' then
    if po.status not in ('approved','sent') then raise exception 'Only an unreceived purchase order can be cancelled.'; end if;
    next_status:='cancelled'; next_approval:='cancelled'; document_status:='cancelled'; next_step:='Cancelled'; activity_message:='Purchase order cancelled';
  else
    if po.status not in ('received','partial_received') then raise exception 'Only a received or partially received purchase order can be closed.'; end if;
    next_status:='closed'; document_status:='closed'; next_step:='Closed'; activity_message:='Purchase order closed';
  end if;
  update public.purchase_orders set status=next_status, approval_status=next_approval, updated_by=actor.id, updated_at=now() where id=po.id;
  if po.document_id is not null then update public.documents set status=document_status, approval_status=next_approval, current_step=next_step, updated_by=actor.id where id=po.document_id and company_id=actor.company_id; end if;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_order',po.id,p_action,activity_message,jsonb_build_object('from_status',po.status,'to_status',next_status),actor.id);
  return jsonb_build_object('id',po.id,'po_no',po.po_no,'status',next_status,'approval_status',next_approval,'document_id',po.document_id);
end $$;

revoke all on function public.transition_purchase_order_atomic(uuid,text) from public, anon;
grant execute on function public.transition_purchase_order_atomic(uuid,text) to authenticated;

delete from public.role_permissions rp using public.permissions p
where rp.permission_id=p.id and p.permission_code in ('po.submit','purchase_order.submit','po.approve','purchase_order.approve');

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p
  on p.permission_code in ('po.receive','grn.create','goods_receiving.create','grn.post','goods_receiving.post')
where r.role_code='kitchen' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

notify pgrst, 'reload schema';
