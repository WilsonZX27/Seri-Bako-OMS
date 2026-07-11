-- Sprint 7.2.21A: align product and item writes with the staff permission model.

drop policy if exists "Admin and purchasing can insert items" on public.items;
create policy "Permission holders can insert items" on public.items
for insert to authenticated
with check (public.has_permission('items.create'));

drop policy if exists "Admin and purchasing can update items" on public.items;
create policy "Permission holders can update items" on public.items
for update to authenticated
using (public.has_permission('items.update') or public.has_permission('items.create'))
with check (public.has_permission('items.update') or public.has_permission('items.create'));

drop policy if exists "Admin can delete items" on public.items;
create policy "Permission holders can delete items" on public.items
for delete to authenticated
using (public.has_permission('items.update'));

drop policy if exists "Admin and purchasing can insert products" on public.products;
create policy "Item master permission holders can insert products" on public.products
for insert to authenticated
with check (public.has_permission('items.create'));

drop policy if exists "Admin and purchasing can update products" on public.products;
create policy "Item master permission holders can update products" on public.products
for update to authenticated
using (public.has_permission('items.update') or public.has_permission('items.create'))
with check (public.has_permission('items.update') or public.has_permission('items.create'));

drop policy if exists "Admin can delete products" on public.products;
create policy "Item master permission holders can delete products" on public.products
for delete to authenticated
using (public.has_permission('items.update'));

drop policy if exists "product packaging manage" on public.product_packaging;
create policy "product packaging manage" on public.product_packaging
for all to authenticated
using (public.has_permission('items.update') or public.has_permission('items.create'))
with check (public.has_permission('items.update') or public.has_permission('items.create'));

grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_packaging to authenticated;
