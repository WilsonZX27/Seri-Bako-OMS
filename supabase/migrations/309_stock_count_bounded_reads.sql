-- Keep Stock Count queue reads bounded as history grows.
-- Security invoker preserves the existing stock_counts RLS scope.

create or replace function public.get_stock_count_summary()
returns table(total bigint, draft bigint, posted bigint, cancelled bigint)
language sql
stable
set search_path = public
as $$
  select
    count(*) filter (where status in ('draft', 'submitted', 'reviewed', 'approved', 'posted', 'cancelled'))::bigint,
    count(*) filter (where status in ('draft', 'submitted', 'reviewed', 'approved'))::bigint,
    count(*) filter (where status = 'posted')::bigint,
    count(*) filter (where status = 'cancelled')::bigint
  from public.stock_counts
  where deleted_at is null;
$$;

revoke all on function public.get_stock_count_summary() from public, anon;
grant execute on function public.get_stock_count_summary() to authenticated;

notify pgrst, 'reload schema';
