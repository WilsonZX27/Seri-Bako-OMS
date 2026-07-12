-- Sprint 7.2.33: align supplier import writes with current permission model.

drop policy if exists "Admin and purchasing can insert suppliers" on public.suppliers;
create policy "Admin and purchasing can insert suppliers" on public.suppliers
for insert to authenticated
with check (
  public.has_permission('suppliers.create')
  or public.has_permission('suppliers.update')
);

drop policy if exists "Admin and purchasing can update suppliers" on public.suppliers;
create policy "Admin and purchasing can update suppliers" on public.suppliers
for update to authenticated
using (
  public.has_permission('suppliers.update')
  or public.has_permission('suppliers.create')
)
with check (
  public.has_permission('suppliers.update')
  or public.has_permission('suppliers.create')
);
