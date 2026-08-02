-- Unposted Stock Counts are work-in-progress records, not ledger history.
-- Allow owners/operators with update access to remove any unposted status;
-- posted counts remain immutable and retain their audit history.

create or replace function public.delete_stock_count_draft_atomic(p_stock_count_id uuid)
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

  if actor.id is null or not public.has_permission('stock_count.update') then
    raise exception 'Missing permission: stock_count.update';
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

  if count_row.status = 'posted' then
    raise exception 'Posted stock counts are immutable and cannot be removed.';
  end if;

  update public.stock_counts
  set deleted_at = now(),
      updated_by = actor.id
  where id = count_row.id
    and deleted_at is null
    and status <> 'posted';

  if not found then
    raise exception 'This stock count changed state. Refresh before removing it.';
  end if;

  if count_row.document_id is not null then
    insert into public.activity_logs (
      company_id, entity_type, entity_id, activity_type, message, metadata, created_by
    ) values (
      actor.company_id,
      'document',
      count_row.document_id,
      'deleted',
      'Stock count ' || coalesce(count_row.count_no::text, count_row.id::text) || ' removed from active records',
      jsonb_build_object('stock_count_id', count_row.id, 'status', count_row.status, 'deleted_at', now()),
      actor.id
    );
  end if;

  return jsonb_build_object(
    'id', count_row.id,
    'count_no', count_row.count_no,
    'status', count_row.status,
    'deleted', true
  );
end;
$$;

revoke all on function public.delete_stock_count_draft_atomic(uuid) from public, anon;
grant execute on function public.delete_stock_count_draft_atomic(uuid) to authenticated;
