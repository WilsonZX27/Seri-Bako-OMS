-- =========================================================
-- Seri Bako OMS
-- Milestone 1: Products Master Data
-- =========================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  product_code text not null unique,
  product_name text not null,
  category text not null,
  selling_unit text not null,

  status public.item_status not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_product_code_not_empty check (length(trim(product_code)) > 0),
  constraint products_product_name_not_empty check (length(trim(product_name)) > 0),
  constraint products_category_not_empty check (length(trim(category)) > 0),
  constraint products_selling_unit_not_empty check (length(trim(selling_unit)) > 0)
);

create index if not exists products_product_name_idx
on public.products using btree (product_name);

create index if not exists products_category_idx
on public.products using btree (category);

create index if not exists products_status_idx
on public.products using btree (status);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Authenticated users can read products" on public.products;
create policy "Authenticated users can read products"
on public.products
for select
to authenticated
using (true);

drop policy if exists "Admin and purchasing can insert products" on public.products;
create policy "Admin and purchasing can insert products"
on public.products
for insert
to authenticated
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can update products" on public.products;
create policy "Admin and purchasing can update products"
on public.products
for update
to authenticated
using (public.has_role(array['admin', 'purchasing']))
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin can delete products" on public.products;
create policy "Admin can delete products"
on public.products
for delete
to authenticated
using (public.has_role(array['admin']));
