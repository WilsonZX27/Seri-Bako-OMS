-- =========================================================
-- Seri Bako OMS Sprint 1.6 Barcode Support
-- Scope: barcode capture, lookup, and scan-first workflow support.
-- =========================================================

do $$ begin if not exists (select 1 from pg_type where typname = 'barcode_type') then create type public.barcode_type as enum ('ean13','upc','qr','internal','supplier','other'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'stock_entity_type') then create type public.stock_entity_type as enum ('item','product'); end if; end $$;

alter table public.items add column if not exists barcode text;
alter table public.items add column if not exists qr_code text;
alter table public.items add column if not exists supplier_barcode text;
alter table public.items add column if not exists internal_barcode text;
alter table public.items add column if not exists barcode_type public.barcode_type;
alter table public.items add column if not exists barcode_image_url text;

alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists qr_code text;
alter table public.products add column if not exists internal_barcode text;
alter table public.products add column if not exists barcode_type public.barcode_type;
alter table public.products add column if not exists barcode_image_url text;

create table if not exists public.barcode_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_entity_type public.stock_entity_type not null,
  item_id uuid references public.items(id),
  product_id uuid references public.products(id),
  barcode_value text not null,
  barcode_type public.barcode_type not null default 'internal',
  is_primary boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint barcode_mappings_value_not_empty check (length(trim(barcode_value)) > 0),
  constraint barcode_mappings_entity_check check (
    (stock_entity_type = 'item' and item_id is not null and product_id is null)
    or
    (stock_entity_type = 'product' and product_id is not null and item_id is null)
  )
);

create unique index if not exists barcode_mappings_company_value_active_idx
  on public.barcode_mappings(company_id, barcode_value)
  where deleted_at is null and status = 'active';

create unique index if not exists barcode_mappings_item_primary_idx
  on public.barcode_mappings(company_id, item_id)
  where stock_entity_type = 'item' and item_id is not null and is_primary = true and deleted_at is null and status = 'active';

create unique index if not exists barcode_mappings_product_primary_idx
  on public.barcode_mappings(company_id, product_id)
  where stock_entity_type = 'product' and product_id is not null and is_primary = true and deleted_at is null and status = 'active';

create index if not exists barcode_mappings_item_idx on public.barcode_mappings(item_id) where item_id is not null;
create index if not exists barcode_mappings_product_idx on public.barcode_mappings(product_id) where product_id is not null;

drop trigger if exists set_barcode_mappings_updated_at on public.barcode_mappings;
create trigger set_barcode_mappings_updated_at before update on public.barcode_mappings for each row execute function public.set_updated_at();

alter table public.barcode_mappings enable row level security;

drop policy if exists "barcode mappings read" on public.barcode_mappings;
create policy "barcode mappings read" on public.barcode_mappings for select to authenticated using (true);

drop policy if exists "barcode mappings manage" on public.barcode_mappings;
create policy "barcode mappings manage" on public.barcode_mappings
  for all to authenticated
  using (public.has_permission('items.update') or public.has_permission('products.update'))
  with check (public.has_permission('items.update') or public.has_permission('products.update'));

insert into public.permissions (permission_code, module, action, description)
values
  ('barcodes.read','barcodes','read','Lookup item and product barcodes'),
  ('barcodes.create','barcodes','create','Create barcode mappings'),
  ('barcodes.update','barcodes','update','Update barcode mappings'),
  ('barcodes.scan','barcodes','scan','Scan barcodes in operational workflows')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'barcodes'
where r.role_code in ('admin','kitchen','purchasing')
on conflict (role_id, permission_id) do nothing;
