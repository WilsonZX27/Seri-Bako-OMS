-- Cancelling an unposted Stock Count discards it from active work while
-- retaining the count/document activity log as the audit trail.
-- Posted counts remain immutable and are never soft-deleted by this action.

create or replace function public.cancel_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or not public.has_permission('stock_count.cancel') then
    raise exception 'Missing permission: stock_count.cancel';
  end if;

  select * into count_row
  from public.stock_counts
  where id = p_stock_count_id
    and deleted_at is null
  for update;

  if count_row.id is null
    or not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then
    raise exception 'Stock count is unavailable for this branch.';
  end if;

  if count_row.status <> 'draft' then
    raise exception 'Only a draft stock count can be cancelled.';
  end if;

  update public.stock_counts
  set status = 'cancelled',
      cancelled_at = now(),
      deleted_at = now(),
      updated_by = actor.id
  where id = count_row.id
    and status = 'draft'
    and deleted_at is null;

  if not found then
    raise exception 'This stock count changed state. Refresh before cancelling.';
  end if;

  if count_row.document_id is not null then
    update public.documents
    set status = 'cancelled',
        approval_status = 'not_required',
        current_step = 'Cancelled',
        updated_by = actor.id
    where id = count_row.document_id;

    insert into public.activity_logs (
      company_id, entity_type, entity_id, activity_type, message, metadata, created_by
    ) values (
      actor.company_id,
      'document',
      count_row.document_id,
      'cancelled',
      'Stock count ' || coalesce(count_row.count_no::text, count_row.id::text) || ' cancelled and removed from active work',
      jsonb_build_object('from_status', 'draft', 'to_status', 'cancelled', 'stock_count_id', count_row.id, 'deleted_at', now()),
      actor.id
    );
  end if;

  return jsonb_build_object(
    'id', count_row.id,
    'count_no', count_row.count_no,
    'document_id', count_row.document_id,
    'status', 'cancelled',
    'deleted', true
  );
end;
$$;

revoke all on function public.cancel_stock_count_atomic(uuid) from public, anon;
grant execute on function public.cancel_stock_count_atomic(uuid) to authenticated;
