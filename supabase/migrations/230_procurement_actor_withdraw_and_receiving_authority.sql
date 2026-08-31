-- v9.2.1 — Align Kitchen correction and receiving authority without exposing staff profiles.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('pr.cancel', 'goods_receiving.post')
where r.role_code = 'kitchen'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

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
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into request_row from public.purchase_requests
  where id = target_purchase_request_id and company_id = actor.company_id and deleted_at is null for update;
  if request_row.id is null then raise exception 'Purchase request not found in your company.'; end if;
  if not public.can_access_purchase_request(request_row.company_id, request_row.branch_id, request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;
  if not public.has_any_permission(array['pr.cancel', 'purchase_request.cancel']) then
    raise exception 'You do not have permission to cancel this purchase request.';
  end if;
  if request_row.status::text <> 'draft' then
    raise exception 'Withdraw the request to Draft before cancelling it.';
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
  values (actor.company_id, 'purchase_request', request_row.id, 'removed_from_active_work',
    'Cancelled draft purchase request removed from active work',
    jsonb_build_object('deleted', true, 'from_status', request_row.status), actor.id);
  return jsonb_build_object('id', request_row.id, 'request_no', request_row.request_no, 'status', 'cancelled', 'removed_from_active_work', true);
end
$$;

create or replace function public.withdraw_purchase_request_for_correction(
  target_purchase_request_id uuid,
  correction_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  clean_reason text := nullif(btrim(correction_reason), '');
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  if clean_reason is null or char_length(clean_reason) < 3 then
    raise exception 'Enter a short correction reason.';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id
    and company_id = actor.company_id
    and deleted_at is null
  for update;
  if request_row.id is null then raise exception 'Purchase request not found in your company.'; end if;
  if request_row.status::text <> 'manager_review' then
    raise exception 'Only a request in Manager Review can be withdrawn for correction.';
  end if;
  if not public.has_any_permission(array['pr.cancel', 'purchase_request.cancel']) then
    raise exception 'You do not have permission to withdraw this purchase request.';
  end if;
  if request_row.requested_by <> actor.id
     and not public.can_access_purchase_request(request_row.company_id, request_row.branch_id, request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;

  update public.purchase_requests
  set status = 'draft', updated_by = actor.id, updated_at = now()
  where id = request_row.id;

  if request_row.document_id is not null then
    update public.documents
    set status = 'draft', approval_status = 'draft', current_step = 'Draft', updated_by = actor.id
    where id = request_row.document_id;
  end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'purchase_request', request_row.id, 'withdrawn_for_correction',
    'Purchase request withdrawn for correction: ' || clean_reason,
    jsonb_build_object('from_status', request_row.status, 'to_status', 'draft', 'reason', clean_reason), actor.id);

  return jsonb_build_object('id', request_row.id, 'request_no', request_row.request_no, 'status', 'draft');
end
$$;

revoke all on function public.withdraw_purchase_request_for_correction(uuid, text) from public, anon;
grant execute on function public.withdraw_purchase_request_for_correction(uuid, text) to authenticated;

notify pgrst, 'reload schema';
