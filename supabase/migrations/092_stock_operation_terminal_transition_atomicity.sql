-- Terminal transitions for unposted transfer and wastage documents.
-- A status label must never contradict a posted inventory effect.

create or replace function public.transition_stock_transfer_terminal_atomic(
  p_transfer_id uuid,
  p_action text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
  transfer public.stock_transfers%rowtype;
  next_status public.stock_operation_status;
  next_document_status public.document_status;
  next_approval_status public.approval_status;
  next_step text;
  revision_number integer;
begin
  actor_id := public.current_staff_id();
  if actor_id is null then raise exception 'An active staff profile is required.'; end if;

  if p_action = 'cancel' then
    if not public.has_permission('stock_transfer.cancel') then raise exception 'Missing permission: stock_transfer.cancel'; end if;
    next_status := 'cancelled';
    next_document_status := 'cancelled';
    next_approval_status := 'cancelled';
    next_step := 'Cancelled';
  elsif p_action = 'reject' then
    if not public.has_permission('stock_transfer.update') then raise exception 'Missing permission: stock_transfer.update'; end if;
    next_status := 'rejected';
    next_document_status := 'rejected';
    next_approval_status := 'rejected';
    next_step := 'Rejected';
  else
    raise exception 'Unsupported stock transfer terminal action.';
  end if;

  select * into transfer
  from public.stock_transfers
  where id = p_transfer_id and deleted_at is null
  for update;

  if transfer.id is null then raise exception 'Stock transfer was not found.'; end if;
  if transfer.status not in ('draft', 'in_transit') then
    raise exception 'Only an unposted draft or in-transit stock transfer can be cancelled or rejected.';
  end if;
  if not public.can_access_inventory_branch(
    (select company_id from public.branches where id = transfer.from_branch_id),
    transfer.from_branch_id
  ) then
    raise exception 'You do not have access to this inventory branch.';
  end if;

  update public.stock_transfers
  set status = next_status, updated_by = actor_id, updated_at = now()
  where id = transfer.id;

  if transfer.document_id is not null then
    update public.documents
    set status = next_document_status,
        approval_status = next_approval_status,
        current_step = next_step,
        revision_no = revision_no + 1,
        updated_by = actor_id,
        cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end
    where id = transfer.document_id
    returning revision_no into revision_number;

    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (transfer.document_id, revision_number, 'Stock transfer ' || lower(next_step) || '.', actor_id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (
      transfer.company_id,
      'document',
      transfer.document_id,
      lower(next_status::text),
      'Stock transfer ' || transfer.transfer_no || ' ' || lower(next_step) || '.',
      jsonb_build_object('transfer_id', transfer.id, 'from_status', transfer.status, 'to_status', next_status),
      actor_id
    );
  end if;

  return jsonb_build_object('id', transfer.id, 'status', next_status);
end;
$$;

create or replace function public.transition_stock_wastage_terminal_atomic(
  p_wastage_id uuid,
  p_action text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
  wastage public.stock_wastage%rowtype;
  next_status public.stock_operation_status;
  next_document_status public.document_status;
  next_approval_status public.approval_status;
  next_step text;
  revision_number integer;
begin
  actor_id := public.current_staff_id();
  if actor_id is null then raise exception 'An active staff profile is required.'; end if;

  if p_action = 'cancel' then
    if not public.has_permission('stock_wastage.cancel') then raise exception 'Missing permission: stock_wastage.cancel'; end if;
    next_status := 'cancelled';
    next_document_status := 'cancelled';
    next_approval_status := 'cancelled';
    next_step := 'Cancelled';
  elsif p_action = 'reject' then
    if not public.has_permission('stock_wastage.update') then raise exception 'Missing permission: stock_wastage.update'; end if;
    next_status := 'rejected';
    next_document_status := 'rejected';
    next_approval_status := 'rejected';
    next_step := 'Rejected';
  else
    raise exception 'Unsupported stock wastage terminal action.';
  end if;

  select * into wastage
  from public.stock_wastage
  where id = p_wastage_id and deleted_at is null
  for update;

  if wastage.id is null then raise exception 'Stock wastage was not found.'; end if;
  if wastage.status not in ('draft', 'approved') then
    raise exception 'Only unposted draft or approved stock wastage can be cancelled or rejected.';
  end if;
  if not public.can_access_inventory_branch(
    (select company_id from public.branches where id = wastage.branch_id),
    wastage.branch_id
  ) then
    raise exception 'You do not have access to this inventory branch.';
  end if;

  update public.stock_wastage
  set status = next_status, updated_by = actor_id, updated_at = now()
  where id = wastage.id;

  if wastage.document_id is not null then
    update public.documents
    set status = next_document_status,
        approval_status = next_approval_status,
        current_step = next_step,
        revision_no = revision_no + 1,
        updated_by = actor_id,
        cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end
    where id = wastage.document_id
    returning revision_no into revision_number;

    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (wastage.document_id, revision_number, 'Stock wastage ' || lower(next_step) || '.', actor_id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (
      wastage.company_id,
      'document',
      wastage.document_id,
      lower(next_status::text),
      'Stock wastage ' || wastage.wastage_no || ' ' || lower(next_step) || '.',
      jsonb_build_object('wastage_id', wastage.id, 'from_status', wastage.status, 'to_status', next_status),
      actor_id
    );
  end if;

  return jsonb_build_object('id', wastage.id, 'status', next_status);
end;
$$;

revoke all on function public.transition_stock_transfer_terminal_atomic(uuid, text) from public, anon;
revoke all on function public.transition_stock_wastage_terminal_atomic(uuid, text) from public, anon;
grant execute on function public.transition_stock_transfer_terminal_atomic(uuid, text) to authenticated;
grant execute on function public.transition_stock_wastage_terminal_atomic(uuid, text) to authenticated;
