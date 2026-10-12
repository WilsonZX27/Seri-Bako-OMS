-- Evaluate the request-constant permission once, keeping the same branch gate.
-- Lines inherit that gate through the parent table's SELECT RLS. Repeating both
-- helpers inside the child EXISTS causes a second branch check for every parent.
-- No roles, grants, write policies or business records are changed.
alter policy "tenant outlet daily records" on public.outlet_daily_records
  using (
    public.can_access_outlet_daily_branch(branch_id)
    and (select public.has_permission('outlet_daily_record.view'))
  );

alter policy "tenant outlet daily record lines" on public.outlet_daily_record_lines
  using (
    exists (
      select 1 from public.outlet_daily_records r
      where r.id = outlet_daily_record_lines.record_id
    )
  );
