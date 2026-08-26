-- Close the PR -> PO handoff and align PO-send permission aliases.
-- Finance approval and PO creation now share one transaction: a conversion
-- failure rolls the approval back instead of leaving a half-finished PR.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('pr.convert_to_po', 'po.send', 'purchase_order.send')
where r.role_code = 'finance'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('po.send', 'purchase_order.send')
where r.role_code = 'purchasing'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

create or replace function public.set_purchase_request_autocount_po_no(
  target_purchase_request_id uuid,
  target_po_no text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  normalized_po_no text := nullif(trim(target_po_no), '');
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null
  for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then
    raise exception 'PR_NOT_FOUND';
  end if;
  if request_row.status::text not in ('admin_review', 'ready_to_convert')
    or not public.has_any_permission(array['pr.admin_review', 'pr.convert_to_po', 'purchase_request.convert']) then
    raise exception 'AUTOCOUNT_PO_NUMBER_NOT_EDITABLE';
  end if;
  if normalized_po_no is null or length(normalized_po_no) > 160 then
    raise exception 'PO_NUMBER_REQUIRED';
  end if;
  if exists (
    select 1 from public.purchase_orders po
    where po.company_id = actor.company_id
      and po.po_no = normalized_po_no
      and po.purchase_request_id is distinct from request_row.id
      and po.deleted_at is null
  ) then
    raise exception 'PO_NUMBER_ALREADY_USED';
  end if;

  update public.purchase_requests
  set autocount_po_no = normalized_po_no,
      updated_by = actor.id,
      updated_at = now()
  where id = request_row.id;

  if request_row.autocount_po_no is distinct from normalized_po_no then
    insert into public.activity_logs (
      company_id, entity_type, entity_id, activity_type, message, metadata, created_by
    ) values (
      actor.company_id,
      'purchase_request',
      request_row.id,
      'autocount_po_number_recorded',
      case when request_row.autocount_po_no is null
        then 'AutoCount PO Number recorded during Purchasing Review'
        else 'AutoCount PO Number corrected before PO creation'
      end,
      jsonb_build_object('from', request_row.autocount_po_no, 'to', normalized_po_no),
      actor.id
    );
  end if;
end
$$;

revoke all on function public.set_purchase_request_autocount_po_no(uuid, text) from public, anon;
grant execute on function public.set_purchase_request_autocount_po_no(uuid, text) to authenticated;

create or replace function public.finance_approve_purchase_request_to_order(
  target_purchase_request_id uuid
)
returns table (
  purchase_order_id uuid,
  purchase_order_no text,
  purchase_request_no text,
  already_existed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if not public.has_any_permission(array['pr.finance_review']) then
    raise exception 'FINANCE_REVIEW_PERMISSION_DENIED';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null
  for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then
    raise exception 'PR_NOT_FOUND';
  end if;
  if request_row.status::text <> 'finance_review' then
    raise exception 'PR_NOT_IN_FINANCE_REVIEW';
  end if;
  if nullif(trim(request_row.autocount_po_no), '') is null then
    raise exception 'PO_NUMBER_REQUIRED';
  end if;

  -- Both calls run inside this RPC transaction. Any conversion exception
  -- rolls back the finance transition and its activity trail.
  perform public.transition_purchase_request(request_row.id, 'finance_approve', null);
  return query
    select converted.purchase_order_id,
           converted.purchase_order_no,
           converted.purchase_request_no,
           converted.already_existed
    from public.convert_purchase_request_to_purchase_order(
      request_row.id,
      request_row.autocount_po_no
    ) converted;
end
$$;

revoke all on function public.finance_approve_purchase_request_to_order(uuid) from public, anon;
grant execute on function public.finance_approve_purchase_request_to_order(uuid) to authenticated;

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
    if not public.has_any_permission(array['po.submit','purchase_order.submit']) then raise exception 'Missing permission: po.submit'; end if;
  elsif p_action in ('approve','reject') then
    if not public.has_any_permission(array['po.approve','purchase_order.approve']) then raise exception 'Missing permission: po.approve'; end if;
  elsif p_action = 'send' then
    if not public.has_any_permission(array['po.send','purchase_order.send']) then raise exception 'Missing permission: po.send'; end if;
  elsif p_action = 'cancel' then
    if not public.has_any_permission(array['po.cancel','purchase_order.cancel']) then raise exception 'Missing permission: purchase_order.cancel'; end if;
  elsif p_action = 'close' then
    if not public.has_any_permission(array['po.close','purchase_order.close']) then raise exception 'Missing permission: purchase_order.close'; end if;
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
