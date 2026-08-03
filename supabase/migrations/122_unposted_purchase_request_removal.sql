-- Sprint 8.22.0 — Allow unposted Purchase Requests to leave active work.
-- Approval-stage requests have not created stock or a purchase order yet, so
-- they can be safely removed from active work while preserving the audit trail.

create or replace function public.cancel_purchase_request_atomic(target_purchase_request_id uuid)
returns jsonb
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
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id
    and company_id = actor.company_id
    and deleted_at is null
  for update;
  if request_row.id is null then raise exception 'Purchase request not found in your company.'; end if;
  if not public.can_access_purchase_request(request_row.company_id, request_row.branch_id, request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;
  if not public.has_permission('pr.cancel') then
    raise exception 'You do not have permission to remove this purchase request.';
  end if;
  if request_row.status::text not in ('draft', 'manager_review', 'admin_review', 'finance_review', 'ready_to_convert') then
    raise exception 'Only an unposted purchase request can be removed from active work.';
  end if;

  update public.purchase_requests
  set status = 'cancelled', deleted_at = now(), updated_at = now(), updated_by = actor.id
  where id = request_row.id;

  if request_row.document_id is not null then
    update public.documents
    set status = 'cancelled', approval_status = 'cancelled', current_step = 'Cancelled', updated_by = actor.id
    where id = request_row.document_id;
  end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (
    actor.company_id,
    'purchase_request',
    request_row.id,
    'removed_from_active_work',
    'Cancelled unposted purchase request removed from active work',
    jsonb_build_object('deleted', true, 'from_status', request_row.status),
    actor.id
  );

  return jsonb_build_object(
    'id', request_row.id,
    'request_no', request_row.request_no,
    'status', 'cancelled',
    'removed_from_active_work', true
  );
end
$$;

revoke all on function public.cancel_purchase_request_atomic(uuid) from public, anon;
grant execute on function public.cancel_purchase_request_atomic(uuid) to authenticated;
