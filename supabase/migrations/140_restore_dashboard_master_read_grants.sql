-- The security-invoker dashboard snapshot reads item and supplier totals before
-- building its operational JSON. RLS still limits the rows; these table grants
-- only restore the authenticated API role's ability to execute that read path.
grant select on table public.companies to authenticated;
grant select on table public.items to authenticated;
grant select on table public.suppliers to authenticated;
