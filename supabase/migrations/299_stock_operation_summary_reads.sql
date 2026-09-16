-- Constant-size stock-operation summaries.
-- These functions remain security invoker so the existing tenant, branch,
-- and permission RLS policies stay authoritative for every count.

create or replace function public.get_stock_transfer_summary()
returns table(total bigint, draft bigint, in_transit bigint, completed bigint)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'draft')::bigint,
    count(*) filter (where status = 'in_transit')::bigint,
    count(*) filter (where status = 'completed')::bigint
  from public.stock_transfers
  where deleted_at is null;
$$;

create or replace function public.get_stock_wastage_summary()
returns table(total bigint, in_review bigint, posted bigint)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status in ('submitted', 'approved'))::bigint,
    count(*) filter (where status = 'posted')::bigint
  from public.stock_wastage
  where deleted_at is null;
$$;

revoke all on function public.get_stock_transfer_summary() from public, anon;
grant execute on function public.get_stock_transfer_summary() to authenticated;
revoke all on function public.get_stock_wastage_summary() from public, anon;
grant execute on function public.get_stock_wastage_summary() to authenticated;
