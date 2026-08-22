-- Kitchen dispatch ownership must also reach the outlet-day rows it is
-- authorised to confirm. The tenant closure policy used the generic branch
-- helper, whose company-wide role allow-list intentionally excludes Kitchen.
-- Keep that helper unchanged for other tables and scope this exception to the
-- two outlet-daily relations only.

drop policy if exists "tenant outlet daily records" on public.outlet_daily_records;
create policy "tenant outlet daily records" on public.outlet_daily_records
for select to authenticated
using (
  public.can_access_outlet_daily_branch(branch_id)
  and public.has_permission('outlet_daily_record.view')
);

drop policy if exists "tenant outlet daily record lines" on public.outlet_daily_record_lines;
create policy "tenant outlet daily record lines" on public.outlet_daily_record_lines
for select to authenticated
using (
  exists (
    select 1
    from public.outlet_daily_records r
    where r.id = outlet_daily_record_lines.record_id
      and public.can_access_outlet_daily_branch(r.branch_id)
      and public.has_permission('outlet_daily_record.view')
  )
);

notify pgrst, 'reload schema';
