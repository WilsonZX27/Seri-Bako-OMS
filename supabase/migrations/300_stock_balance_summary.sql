-- One-row Stock Balance summary for list and Movement Ledger rails.
-- Security invoker preserves the existing stock_balances_summary RLS boundary.

create or replace function public.get_stock_balance_summary(
  p_branch_id uuid default null,
  p_supplier_id uuid default null,
  p_status text default null,
  p_search text default null
)
returns table(total bigint, low_stock bigint, negative bigint, inventory_value numeric)
language sql
stable
set search_path = public
as $$
  with visible as (
    select balance.*
    from public.stock_balances_summary balance
    where (p_branch_id is null or balance.branch_id = p_branch_id)
      and (p_supplier_id is null or balance.supplier_id = p_supplier_id)
      and (
        p_status is null
        or (p_status = 'negative' and balance.current_qty < 0)
        or (p_status = 'low_stock' and balance.current_qty > 0 and balance.is_low_stock)
        or (p_status = 'ok' and balance.current_qty >= 0 and (not balance.is_low_stock or balance.current_qty = 0))
      )
      and (
        nullif(btrim(p_search), '') is null
        or balance.item_code ilike '%' || btrim(p_search) || '%'
        or balance.item_name ilike '%' || btrim(p_search) || '%'
        or balance.branch_name ilike '%' || btrim(p_search) || '%'
      )
  )
  select
    count(*)::bigint,
    count(*) filter (where current_qty > 0 and is_low_stock)::bigint,
    count(*) filter (where current_qty < 0)::bigint,
    coalesce(sum(inventory_value), 0)::numeric
  from visible;
$$;

revoke all on function public.get_stock_balance_summary(uuid, uuid, text, text) from public, anon;
grant execute on function public.get_stock_balance_summary(uuid, uuid, text, text) to authenticated;
