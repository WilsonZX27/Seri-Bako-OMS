-- Keep unposted PO cancellation recoverable and restore legacy cancelled rows.

create or replace function public.cancel_purchase_order_atomic(p_purchase_order_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; result jsonb;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  select * into po from public.purchase_orders where id=p_purchase_order_id and company_id=actor.company_id and deleted_at is null for update;
  if po.id is null then raise exception 'Purchase order not found in your company.'; end if;
  if po.status not in ('draft','pending_approval','approved') then raise exception 'Only an unposted purchase order can be cancelled.'; end if;
  result := public.transition_purchase_order_atomic(p_purchase_order_id,'cancel');
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_order',po.id,'cancelled_recoverable','Cancelled purchase order retained for recovery',jsonb_build_object('from_status',po.status,'recoverable',true),actor.id);
  return result || jsonb_build_object('recoverable',true);
end $$;

create or replace function public.restore_cancelled_purchase_order_atomic(p_purchase_order_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; prior_status text; prior_approval text; prior_document_status text; prior_step text;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_order.cancel') then raise exception 'You do not have permission to restore this purchase order.'; end if;
  select * into po from public.purchase_orders where id=p_purchase_order_id and company_id=actor.company_id for update;
  if po.id is null or po.status <> 'cancelled' or po.approval_status <> 'cancelled' then raise exception 'Only a user-cancelled purchase order can be restored.'; end if;
  if exists(select 1 from public.goods_receivings where purchase_order_id=po.id and deleted_at is null)
    or exists(select 1 from public.supplier_invoices where purchase_order_id=po.id and deleted_at is null) then
    raise exception 'This purchase order has downstream records and cannot be restored.';
  end if;
  if po.purchase_request_id is not null and exists(select 1 from public.purchase_orders other where other.purchase_request_id=po.purchase_request_id and other.id<>po.id and other.deleted_at is null) then
    raise exception 'Another active purchase order already exists for this purchase request.';
  end if;
  select coalesce(metadata->>'from_status','approved') into prior_status from public.activity_logs
  where entity_type='purchase_order' and entity_id=po.id and activity_type in ('cancelled_recoverable','removed_from_active_work')
  order by created_at desc limit 1;
  if prior_status not in ('draft','pending_approval','approved') then prior_status := 'approved'; end if;
  prior_approval := case prior_status when 'draft' then 'draft' when 'pending_approval' then 'pending' else 'approved' end;
  prior_document_status := case prior_status when 'pending_approval' then 'pending_approval' else prior_status end;
  prior_step := case prior_status when 'draft' then 'Draft' when 'pending_approval' then 'Manager approval' else 'Approved' end;
  update public.purchase_orders set status=prior_status,approval_status=prior_approval,deleted_at=null,updated_at=now(),updated_by=actor.id where id=po.id;
  if po.document_id is not null then update public.documents set status=prior_document_status,approval_status=prior_approval,current_step=prior_step,cancelled_at=null,updated_at=now(),updated_by=actor.id where id=po.document_id and company_id=actor.company_id; end if;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_order',po.id,'restored','Cancelled purchase order restored',jsonb_build_object('restored_status',prior_status),actor.id);
  return jsonb_build_object('id',po.id,'po_no',po.po_no,'status',prior_status,'restored',true);
end $$;

-- Make legacy cancelled rows visible in the Cancelled register when restoring
-- them would not conflict with an active replacement PO for the same PR.
update public.purchase_orders po
set deleted_at = null,
    updated_at = now()
where po.status = 'cancelled'
  and po.approval_status = 'cancelled'
  and po.deleted_at is not null
  and not exists (
    select 1 from public.purchase_orders other
    where other.purchase_request_id = po.purchase_request_id
      and po.purchase_request_id is not null
      and other.id <> po.id
      and other.deleted_at is null
  );

revoke all on function public.cancel_purchase_order_atomic(uuid) from public, anon;
grant execute on function public.cancel_purchase_order_atomic(uuid) to authenticated;
revoke all on function public.restore_cancelled_purchase_order_atomic(uuid) from public, anon;
grant execute on function public.restore_cancelled_purchase_order_atomic(uuid) to authenticated;
notify pgrst, 'reload schema';
