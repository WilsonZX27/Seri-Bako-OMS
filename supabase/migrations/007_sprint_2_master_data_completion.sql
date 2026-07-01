-- =========================================================
-- Seri Bako OMS Sprint 2 Master Data Completion
-- Scope: supplier item links, UOM conversions, packaging/pricing,
-- images for master data tables, and import permissions.
-- =========================================================

alter table public.items add column if not exists item_image_url text;
alter table public.products add column if not exists product_image_url text;

create table if not exists public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  item_id uuid not null references public.items(id),
  supplier_item_code text not null,
  supplier_item_name text not null,
  purchase_uom text not null,
  conversion_to_base_uom numeric(18,6) not null default 1,
  unit_cost numeric(18,4) not null default 0,
  moq numeric(18,4) not null default 0,
  lead_time_days integer not null default 0,
  valid_from date,
  valid_to date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint supplier_items_code_not_empty check (length(trim(supplier_item_code)) > 0),
  constraint supplier_items_name_not_empty check (length(trim(supplier_item_name)) > 0),
  constraint supplier_items_conversion_positive check (conversion_to_base_uom > 0),
  constraint supplier_items_unit_cost_nonnegative check (unit_cost >= 0),
  constraint supplier_items_moq_nonnegative check (moq >= 0),
  constraint supplier_items_lead_time_nonnegative check (lead_time_days >= 0),
  constraint supplier_items_valid_date_order check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create unique index if not exists supplier_items_supplier_item_active_idx
  on public.supplier_items(supplier_id, item_id)
  where deleted_at is null and status = 'active';

create unique index if not exists supplier_items_supplier_code_active_idx
  on public.supplier_items(supplier_id, supplier_item_code)
  where deleted_at is null and status = 'active';

create index if not exists supplier_items_item_idx on public.supplier_items(item_id);

drop trigger if exists set_supplier_items_updated_at on public.supplier_items;
create trigger set_supplier_items_updated_at before update on public.supplier_items for each row execute function public.set_updated_at();

create table if not exists public.uom_conversions (
  id uuid primary key default gen_random_uuid(),
  from_uom text not null,
  to_uom text not null,
  factor numeric(18,8) not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint uom_conversions_from_not_empty check (length(trim(from_uom)) > 0),
  constraint uom_conversions_to_not_empty check (length(trim(to_uom)) > 0),
  constraint uom_conversions_factor_positive check (factor > 0)
);

create unique index if not exists uom_conversions_pair_active_idx
  on public.uom_conversions(lower(from_uom), lower(to_uom))
  where deleted_at is null and status = 'active';

drop trigger if exists set_uom_conversions_updated_at on public.uom_conversions;
create trigger set_uom_conversions_updated_at before update on public.uom_conversions for each row execute function public.set_updated_at();

create table if not exists public.product_packaging (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  packaging_name text not null,
  selling_uom text not null,
  units_per_pack numeric(18,4) not null default 1,
  min_order_qty numeric(18,4) not null default 1,
  price numeric(18,4) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint product_packaging_name_not_empty check (length(trim(packaging_name)) > 0),
  constraint product_packaging_uom_not_empty check (length(trim(selling_uom)) > 0),
  constraint product_packaging_units_positive check (units_per_pack > 0),
  constraint product_packaging_min_order_positive check (min_order_qty > 0),
  constraint product_packaging_price_nonnegative check (price >= 0)
);

create index if not exists product_packaging_product_idx on public.product_packaging(product_id);

drop trigger if exists set_product_packaging_updated_at on public.product_packaging;
create trigger set_product_packaging_updated_at before update on public.product_packaging for each row execute function public.set_updated_at();

alter table public.supplier_items enable row level security;
alter table public.uom_conversions enable row level security;
alter table public.product_packaging enable row level security;

drop policy if exists "supplier items read" on public.supplier_items;
create policy "supplier items read" on public.supplier_items for select to authenticated using (true);
drop policy if exists "supplier items manage" on public.supplier_items;
create policy "supplier items manage" on public.supplier_items for all to authenticated
  using (public.has_permission('supplier_items.update') or public.has_permission('supplier_items.create'))
  with check (public.has_permission('supplier_items.update') or public.has_permission('supplier_items.create'));

drop policy if exists "uom conversions read" on public.uom_conversions;
create policy "uom conversions read" on public.uom_conversions for select to authenticated using (true);
drop policy if exists "uom conversions manage" on public.uom_conversions;
create policy "uom conversions manage" on public.uom_conversions for all to authenticated
  using (public.has_permission('uom_conversions.update') or public.has_permission('uom_conversions.create'))
  with check (public.has_permission('uom_conversions.update') or public.has_permission('uom_conversions.create'));

drop policy if exists "product packaging read" on public.product_packaging;
create policy "product packaging read" on public.product_packaging for select to authenticated using (true);
drop policy if exists "product packaging manage" on public.product_packaging;
create policy "product packaging manage" on public.product_packaging for all to authenticated
  using (public.has_permission('products.update'))
  with check (public.has_permission('products.update'));

insert into public.permissions (permission_code, module, action, description)
values
  ('supplier_items.read','supplier_items','read','Read supplier item assignments'),
  ('supplier_items.create','supplier_items','create','Create supplier item assignments'),
  ('supplier_items.update','supplier_items','update','Update supplier item assignments'),
  ('uom_conversions.read','uom_conversions','read','Read UOM conversions'),
  ('uom_conversions.create','uom_conversions','create','Create UOM conversions'),
  ('uom_conversions.update','uom_conversions','update','Update UOM conversions'),
  ('imports.create','imports','create','Import master data from CSV or XLSX templates')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module in ('supplier_items','uom_conversions','imports')
where r.role_code in ('admin','purchasing')
on conflict (role_id, permission_id) do nothing;
