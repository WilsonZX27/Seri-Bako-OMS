-- Unposted work deletion policy.
-- Draft / approval-stage work may leave active queues when the user deletes
-- or cancels it. The row and audit trail remain available for history. Once a
-- record has posted inventory or accounting impact, it remains immutable.

create or replace function public.cancel_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  removal_time timestamptz := now();
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.cancel') then
    raise exception 'Missing permission: stock_count.cancel';
  end if;

  select * into count_row from public.stock_counts
  where id = p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then
    raise exception 'Stock count is unavailable for this branch.';
  end if;
  if count_row.status <> 'draft' then
    raise exception 'Only an unposted draft stock count can be cancelled.';
  end if;

  update public.stock_counts
  set status = 'cancelled', cancelled_at = removal_time, deleted_at = removal_time,
      updated_by = actor.id, updated_at = removal_time
  where id = count_row.id and status = 'draft' and deleted_at is null;
  if not found then raise exception 'This stock count changed state. Refresh before removing it.'; end if;

  if count_row.document_id is not null then
    update public.documents
    set status = 'cancelled', approval_status = 'not_required', current_step = 'Cancelled',
        updated_by = actor.id, updated_at = removal_time
    where id = count_row.document_id;
    insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (
      actor.company_id, 'document', count_row.document_id, 'cancelled',
      'Stock count ' || coalesce(count_row.count_no::text, count_row.id::text) || ' cancelled and removed from active work',
      jsonb_build_object('from_status', 'draft', 'to_status', 'cancelled', 'stock_count_id', count_row.id, 'deleted', true, 'deleted_at', removal_time),
      actor.id
    );
  end if;

  return jsonb_build_object('id', count_row.id, 'count_no', count_row.count_no,
    'document_id', count_row.document_id, 'status', 'cancelled', 'deleted', true);
end;
$$;

revoke all on function public.cancel_stock_count_atomic(uuid) from public, anon;
grant execute on function public.cancel_stock_count_atomic(uuid) to authenticated;

-- Repair only cancelled, unposted rows that an earlier migration left visible.
update public.stock_counts
set deleted_at = coalesce(deleted_at, cancelled_at, updated_at, now())
where status = 'cancelled' and deleted_at is null;
