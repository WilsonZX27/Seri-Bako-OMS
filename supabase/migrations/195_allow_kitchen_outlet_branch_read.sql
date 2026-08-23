-- Outlet Daily form options must be able to resolve outlet names for Kitchen.
-- The tenant branches policy intentionally excludes Kitchen from generic
-- company-wide branch access. Add a narrow read policy for the existing
-- Outlet Daily visibility permission instead of broadening branch access.
drop policy if exists "tenant kitchen outlet branches read" on public.branches;
create policy "tenant kitchen outlet branches read" on public.branches
for select to authenticated
using (
  company_id = public.current_staff_company_id()
  and branch_type = 'outlet'
  and public.has_permission('outlet_daily_record.view_all')
);
