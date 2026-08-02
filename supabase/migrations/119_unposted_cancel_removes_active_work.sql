-- Unposted operational work may be cancelled and removed from active work.
-- The underlying row and document activity remain available to the audit trail;
-- posted/ledger-impacting records remain immutable.

alter function public.cancel_goods_receiving_atomic(uuid) rename to cancel_goods_receiving_atomic_legacy;
create or replace function public.cancel_goods_receiving_atomic(p_goods_receiving_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb; actor_id uuid;
begin
  result := public.cancel_goods_receiving_atomic_legacy(p_goods_receiving_id);
  actor_id := public.current_staff_id();
  update public.goods_receivings set deleted_at = now(), updated_by = actor_id, updated_at = now()
   where id = p_goods_receiving_id and status = 'cancelled' and deleted_at is null;
  return result || jsonb_build_object('deleted', true);
end $$;

alter function public.cancel_purchase_return_atomic(uuid) rename to cancel_purchase_return_atomic_legacy;
create or replace function public.cancel_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb; actor_id uuid;
begin
  result := public.cancel_purchase_return_atomic_legacy(p_purchase_return_id);
  actor_id := public.current_staff_id();
  update public.purchase_returns set deleted_at = now(), updated_by = actor_id, updated_at = now()
   where id = p_purchase_return_id and status = 'cancelled' and deleted_at is null;
  return result || jsonb_build_object('deleted', true);
end $$;

alter function public.transition_production_job_atomic(uuid, text, text) rename to transition_production_job_atomic_legacy;
create or replace function public.transition_production_job_atomic(p_job_id uuid, p_action text, p_remarks text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb; actor_id uuid;
begin
  result := public.transition_production_job_atomic_legacy(p_job_id, p_action, p_remarks);
  if p_action = 'cancel' then
    actor_id := public.current_staff_id();
    update public.production_jobs set deleted_at = now(), updated_by = actor_id, updated_at = now()
     where id = p_job_id and status = 'cancelled' and deleted_at is null;
    result := result || jsonb_build_object('deleted', true);
  end if;
  return result;
end $$;

alter function public.transition_stock_transfer_terminal_atomic(uuid, text) rename to transition_stock_transfer_terminal_atomic_legacy;
create or replace function public.transition_stock_transfer_terminal_atomic(p_transfer_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb; actor_id uuid;
begin
  result := public.transition_stock_transfer_terminal_atomic_legacy(p_transfer_id, p_action);
  if p_action = 'cancel' then
    actor_id := public.current_staff_id();
    update public.stock_transfers set deleted_at = now(), updated_by = actor_id, updated_at = now()
     where id = p_transfer_id and status = 'cancelled' and deleted_at is null;
    result := result || jsonb_build_object('deleted', true);
  end if;
  return result;
end $$;

alter function public.transition_stock_wastage_terminal_atomic(uuid, text) rename to transition_stock_wastage_terminal_atomic_legacy;
create or replace function public.transition_stock_wastage_terminal_atomic(p_wastage_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare result jsonb; actor_id uuid;
begin
  result := public.transition_stock_wastage_terminal_atomic_legacy(p_wastage_id, p_action);
  if p_action = 'cancel' then
    actor_id := public.current_staff_id();
    update public.stock_wastage set deleted_at = now(), updated_by = actor_id, updated_at = now()
     where id = p_wastage_id and status = 'cancelled' and deleted_at is null;
    result := result || jsonb_build_object('deleted', true);
  end if;
  return result;
end $$;

revoke all on function public.cancel_goods_receiving_atomic_legacy(uuid), public.cancel_purchase_return_atomic_legacy(uuid), public.transition_production_job_atomic_legacy(uuid, text, text), public.transition_stock_transfer_terminal_atomic_legacy(uuid, text), public.transition_stock_wastage_terminal_atomic_legacy(uuid, text) from public, anon;
grant execute on function public.cancel_goods_receiving_atomic(uuid), public.cancel_purchase_return_atomic(uuid), public.transition_production_job_atomic(uuid, text, text), public.transition_stock_transfer_terminal_atomic(uuid, text), public.transition_stock_wastage_terminal_atomic(uuid, text) to authenticated;
