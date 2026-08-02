-- Sprint 8.10.0 — Remove cancelled, unposted procurement work from active queues.
-- The existing transition functions remain the source of truth for permissions,
-- state validation, document updates, and the original workflow audit event.

create or replace function public.cancel_purchase_request_atomic(target_purchase_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  actor public.staffs%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  result := public.transition_purchase_request(target_purchase_request_id, 'cancel', null);

  update public.purchase_requests
  set deleted_at = now(), updated_at = now(), updated_by = actor.id
  where id = target_purchase_request_id
    and company_id = actor.company_id
    and status = 'cancelled'
    and deleted_at is null;
  if not found then raise exception 'Only an active draft purchase request can be cancelled.'; end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'purchase_request', target_purchase_request_id, 'removed_from_active_work',
    'Cancelled draft purchase request removed from active work', jsonb_build_object('deleted', true), actor.id);
  return result || jsonb_build_object('removed_from_active_work', true);
end
$$;

create or replace function public.cancel_purchase_order_atomic(p_purchase_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  po public.purchase_orders%rowtype;
  result jsonb;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;

  select * into po
  from public.purchase_orders
  where id = p_purchase_order_id and company_id = actor.company_id and deleted_at is null
  for update;
  if po.id is null then raise exception 'Purchase order not found in your company.'; end if;
  if po.status not in ('draft', 'pending_approval', 'approved') then
    raise exception 'Only an unposted purchase order can be cancelled and removed.';
  end if;

  result := public.transition_purchase_order_atomic(p_purchase_order_id, 'cancel');

  update public.purchase_orders
  set deleted_at = now(), updated_at = now(), updated_by = actor.id
  where id = p_purchase_order_id and company_id = actor.company_id and status = 'cancelled' and deleted_at is null;
  if not found then raise exception 'Purchase order cancellation did not remove the active draft.'; end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'purchase_order', p_purchase_order_id, 'removed_from_active_work',
    'Cancelled unposted purchase order removed from active work', jsonb_build_object('deleted', true, 'from_status', po.status), actor.id);
  return result || jsonb_build_object('removed_from_active_work', true);
end
$$;

revoke all on function public.cancel_purchase_request_atomic(uuid) from public, anon;
grant execute on function public.cancel_purchase_request_atomic(uuid) to authenticated;
revoke all on function public.cancel_purchase_order_atomic(uuid) from public, anon;
grant execute on function public.cancel_purchase_order_atomic(uuid) to authenticated;
