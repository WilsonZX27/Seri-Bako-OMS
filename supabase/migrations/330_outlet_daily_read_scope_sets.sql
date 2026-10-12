-- Resolve the unchanged branch predicate once per SQL statement, then inherit
-- parent SELECT RLS through a set lookup. No persistent authorization cache,
-- changed grants on tables, write policy, business quantities or stock posting.
create or replace function public.outlet_daily_visible_branch_ids()
returns uuid[] language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(array_agg(b.id),'{}'::uuid[]) from public.branches b
 where public.can_access_outlet_daily_branch(b.id)
$$;
revoke all on function public.outlet_daily_visible_branch_ids() from public,anon;
grant execute on function public.outlet_daily_visible_branch_ids() to authenticated;
alter policy "tenant outlet daily records" on public.outlet_daily_records
using(branch_id=any((select public.outlet_daily_visible_branch_ids())::uuid[]) and (select public.has_permission('outlet_daily_record.view')));
alter policy "tenant outlet daily record lines" on public.outlet_daily_record_lines
using(record_id in (select r.id from public.outlet_daily_records r));

notify pgrst,'reload schema';
