-- PO transition repair: document_status uses the document_status enum.
-- A submitted PO is pending_approval, not pending.

create or replace function public.transition_purchase_order_atomic(p_purchase_order_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  po public.purchase_orders%rowtype;
  next_status public.purchase_order_status;
  next_approval public.approval_status;
  document_status public.document_status;
  next_step text;
  activity_message text;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  if p_action = 'submit' then
    if not public.has_permission('po.submit') then raise exception 'Missing permission: po.submit'; end if;
  elsif p_action in ('approve','reject') then
    if not public.has_permission('po.approve') then raise exception 'Missing permission: po.approve'; end if;
  elsif p_action = 'send' then
    if not public.has_permission('po.send') then raise exception 'Missing permission: po.send'; end if;
  elsif p_action = 'cancel' then
    if not public.has_permission('purchase_order.cancel') then raise exception 'Missing permission: purchase_order.cancel'; end if;
  elsif p_action = 'close' then
    if not public.has_permission('purchase_order.close') then raise exception 'Missing permission: purchase_order.close'; end if;
  else raise exception 'Unknown purchase-order transition.'; end if;

  select * into po from public.purchase_orders where id = p_purchase_order_id and company_id = actor.company_id and deleted_at is null for update;
  if po.id is null then raise exception 'Purchase order not found in your company.'; end if;

  if p_action = 'submit' then
    if po.status <> 'draft' then raise exception 'Only a draft purchase order can be submitted.'; end if;
    next_status := 'pending_approval'; next_approval := 'pending'; document_status := 'pending_approval'; next_step := 'Manager approval'; activity_message := 'Purchase order submitted for approval';
  elsif p_action = 'approve' then
    if po.status <> 'pending_approval' then raise exception 'Only a pending purchase order can be approved.'; end if;
    next_status := 'approved'; next_approval := 'approved'; document_status := 'approved'; next_step := 'Approved'; activity_message := 'Purchase order approved';
  elsif p_action = 'reject' then
    if po.status <> 'pending_approval' then raise exception 'Only a pending purchase order can be rejected.'; end if;
    next_status := 'cancelled'; next_approval := 'rejected'; document_status := 'rejected'; next_step := 'Rejected'; activity_message := 'Purchase order rejected';
  elsif p_action = 'send' then
    if po.status <> 'approved' or po.approval_status <> 'approved' then raise exception 'Only an approved purchase order can be sent.'; end if;
    next_status := 'sent'; next_approval := 'approved'; document_status := 'approved'; next_step := 'Sent to supplier'; activity_message := 'Purchase order sent to supplier';
  elsif p_action = 'cancel' then
    if po.status not in ('draft','pending_approval','approved','sent') then raise exception 'Only an unreceived purchase order can be cancelled.'; end if;
    next_status := 'cancelled'; next_approval := 'cancelled'; document_status := 'cancelled'; next_step := 'Cancelled'; activity_message := 'Purchase order cancelled';
  else
    if po.status not in ('received','partial_received') then raise exception 'Only a received or partially received purchase order can be closed.'; end if;
    next_status := 'closed'; next_approval := 'approved'; document_status := 'closed'; next_step := 'Closed'; activity_message := 'Purchase order closed';
  end if;

  update public.purchase_orders set status = next_status, approval_status = next_approval, updated_by = actor.id, updated_at = now() where id = po.id;
  if po.document_id is not null then
    update public.documents set status = document_status, approval_status = next_approval, current_step = next_step, updated_by = actor.id where id = po.document_id and company_id = actor.company_id;
  end if;
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'purchase_order', po.id, p_action, activity_message, jsonb_build_object('from_status', po.status, 'to_status', next_status), actor.id);
  return jsonb_build_object('id', po.id, 'po_no', po.po_no, 'status', next_status, 'approval_status', next_approval, 'document_id', po.document_id);
end
$$;

revoke all on function public.transition_purchase_order_atomic(uuid, text) from public, anon;
grant execute on function public.transition_purchase_order_atomic(uuid, text) to authenticated;
notify pgrst, 'reload schema';
