-- =========================================================
-- Seri Bako Operations Management System
-- Milestone 1: Inventory Foundation
-- =========================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_status') then
    create type public.item_status as enum ('active', 'inactive');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'supplier_status') then
    create type public.supplier_status as enum ('active', 'inactive');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'location_status') then
    create type public.location_status as enum ('active', 'inactive');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'location_type') then
    create type public.location_type as enum (
      'central_kitchen',
      'warehouse',
      'outlet',
      'event_booth',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_transaction_type') then
    create type public.stock_transaction_type as enum (
      'opening_balance',
      'purchase',
      'wastage',
      'damage',
      'missing',
      'extra',
      'correction',
      'transfer',
      'return_supplier'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('admin', 'finance', 'purchasing', 'kitchen', 'viewer')
  )
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() limit 1), 'viewer');
$$;

create or replace function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = any(allowed_roles);
$$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text unique,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  payment_terms_days integer not null default 30,
  status public.supplier_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_empty check (length(trim(name)) > 0),
  constraint suppliers_payment_terms_non_negative check (payment_terms_days >= 0)
);

create index if not exists suppliers_name_idx on public.suppliers using btree (name);
create index if not exists suppliers_status_idx on public.suppliers using btree (status);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  location_code text not null unique,
  location_name text not null,
  location_type public.location_type not null default 'central_kitchen',
  status public.location_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_code_not_empty check (length(trim(location_code)) > 0),
  constraint locations_name_not_empty check (length(trim(location_name)) > 0)
);

create index if not exists locations_location_name_idx on public.locations using btree (location_name);
create index if not exists locations_location_type_idx on public.locations using btree (location_type);
create index if not exists locations_status_idx on public.locations using btree (status);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  autocount_code text,
  item_name text not null,
  category text not null,
  purchase_unit text not null,
  base_unit text not null,
  conversion_to_base_unit numeric(12, 4) not null default 1,
  supplier_id uuid references public.suppliers(id) on delete set null,
  cost numeric(12, 4) not null default 0,
  safety_stock numeric(12, 4) not null default 0,
  lead_time_days integer not null default 0,
  moq numeric(12, 4) not null default 0,
  status public.item_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_item_code_not_empty check (length(trim(item_code)) > 0),
  constraint items_item_name_not_empty check (length(trim(item_name)) > 0),
  constraint items_category_not_empty check (length(trim(category)) > 0),
  constraint items_purchase_unit_not_empty check (length(trim(purchase_unit)) > 0),
  constraint items_base_unit_not_empty check (length(trim(base_unit)) > 0),
  constraint items_conversion_to_base_unit_positive check (conversion_to_base_unit > 0),
  constraint items_cost_non_negative check (cost >= 0),
  constraint items_safety_stock_non_negative check (safety_stock >= 0),
  constraint items_lead_time_non_negative check (lead_time_days >= 0),
  constraint items_moq_non_negative check (moq >= 0)
);

create index if not exists items_item_name_idx on public.items using btree (item_name);
create index if not exists items_category_idx on public.items using btree (category);
create index if not exists items_supplier_id_idx on public.items using btree (supplier_id);
create index if not exists items_status_idx on public.items using btree (status);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  transaction_type public.stock_transaction_type not null,
  transaction_date date not null default current_date,
  quantity_in numeric(12, 4) not null default 0,
  quantity_out numeric(12, 4) not null default 0,
  unit_cost numeric(12, 4),
  remarks text,
  reference_type text,
  reference_id uuid,
  from_location_id uuid references public.locations(id) on delete restrict,
  to_location_id uuid references public.locations(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_transactions_quantity_non_negative check (quantity_in >= 0 and quantity_out >= 0),
  constraint stock_transactions_one_direction_only check (not (quantity_in > 0 and quantity_out > 0)),
  constraint stock_transactions_has_quantity check (quantity_in > 0 or quantity_out > 0),
  constraint stock_transactions_unit_cost_non_negative check (unit_cost is null or unit_cost >= 0),
  constraint stock_transactions_transfer_location_check check (
    transaction_type <> 'transfer'
    or from_location_id is not null
    or to_location_id is not null
  )
);

create index if not exists stock_transactions_item_id_idx on public.stock_transactions using btree (item_id);
create index if not exists stock_transactions_location_id_idx on public.stock_transactions using btree (location_id);
create index if not exists stock_transactions_transaction_date_idx on public.stock_transactions using btree (transaction_date);
create index if not exists stock_transactions_transaction_type_idx on public.stock_transactions using btree (transaction_type);
create index if not exists stock_transactions_reference_idx on public.stock_transactions using btree (reference_type, reference_id);
create index if not exists stock_transactions_from_location_id_idx on public.stock_transactions using btree (from_location_id);
create index if not exists stock_transactions_to_location_id_idx on public.stock_transactions using btree (to_location_id);

alter table public.stock_transactions drop constraint if exists stock_transactions_type_direction_check;
alter table public.stock_transactions add constraint stock_transactions_type_direction_check check (
  (
    transaction_type in ('opening_balance', 'purchase', 'extra')
    and quantity_in > 0
    and quantity_out = 0
  )
  or
  (
    transaction_type in ('wastage', 'damage', 'missing', 'return_supplier')
    and quantity_out > 0
    and quantity_in = 0
  )
  or
  (
    transaction_type in ('correction', 'transfer')
    and (
      (quantity_in > 0 and quantity_out = 0)
      or
      (quantity_out > 0 and quantity_in = 0)
    )
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

drop trigger if exists set_locations_updated_at on public.locations;
create trigger set_locations_updated_at before update on public.locations for each row execute function public.set_updated_at();

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at before update on public.items for each row execute function public.set_updated_at();

create or replace view public.item_location_stock_balances as
select
  i.id as item_id,
  i.item_code,
  i.item_name,
  i.category,
  i.base_unit,
  l.id as location_id,
  l.location_code,
  l.location_name,
  l.location_type,
  coalesce(sum(st.quantity_in), 0) as total_quantity_in,
  coalesce(sum(st.quantity_out), 0) as total_quantity_out,
  coalesce(sum(st.quantity_in - st.quantity_out), 0) as current_stock
from public.items i
cross join public.locations l
left join public.stock_transactions st on st.item_id = i.id and st.location_id = l.id
group by i.id, l.id;

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.stock_transactions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated
using (id = auth.uid() or public.has_role(array['admin']));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update to authenticated
using (id = auth.uid() or public.has_role(array['admin']))
with check (id = auth.uid() or public.has_role(array['admin']));

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles" on public.profiles
for insert to authenticated
with check (public.has_role(array['admin']));

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles" on public.profiles
for delete to authenticated
using (public.has_role(array['admin']));

drop policy if exists "Authenticated users can read suppliers" on public.suppliers;
create policy "Authenticated users can read suppliers" on public.suppliers
for select to authenticated using (true);

drop policy if exists "Admin and purchasing can insert suppliers" on public.suppliers;
create policy "Admin and purchasing can insert suppliers" on public.suppliers
for insert to authenticated with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can update suppliers" on public.suppliers;
create policy "Admin and purchasing can update suppliers" on public.suppliers
for update to authenticated
using (public.has_role(array['admin', 'purchasing']))
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin can delete suppliers" on public.suppliers;
create policy "Admin can delete suppliers" on public.suppliers
for delete to authenticated using (public.has_role(array['admin']));

drop policy if exists "Authenticated users can read locations" on public.locations;
create policy "Authenticated users can read locations" on public.locations
for select to authenticated using (true);

drop policy if exists "Admin can insert locations" on public.locations;
create policy "Admin can insert locations" on public.locations
for insert to authenticated with check (public.has_role(array['admin']));

drop policy if exists "Admin can update locations" on public.locations;
create policy "Admin can update locations" on public.locations
for update to authenticated
using (public.has_role(array['admin']))
with check (public.has_role(array['admin']));

drop policy if exists "Admin can delete locations" on public.locations;
create policy "Admin can delete locations" on public.locations
for delete to authenticated using (public.has_role(array['admin']));

drop policy if exists "Authenticated users can read items" on public.items;
create policy "Authenticated users can read items" on public.items
for select to authenticated using (true);

drop policy if exists "Admin and purchasing can insert items" on public.items;
create policy "Admin and purchasing can insert items" on public.items
for insert to authenticated with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can update items" on public.items;
create policy "Admin and purchasing can update items" on public.items
for update to authenticated
using (public.has_role(array['admin', 'purchasing']))
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin can delete items" on public.items;
create policy "Admin can delete items" on public.items
for delete to authenticated using (public.has_role(array['admin']));

drop policy if exists "Authenticated users can read stock transactions" on public.stock_transactions;
create policy "Authenticated users can read stock transactions" on public.stock_transactions
for select to authenticated using (true);

drop policy if exists "Admin and kitchen can insert stock transactions" on public.stock_transactions;
create policy "Admin and kitchen can insert stock transactions" on public.stock_transactions
for insert to authenticated with check (public.has_role(array['admin', 'kitchen']));

insert into public.locations (location_code, location_name, location_type)
values ('CK', 'Central Kitchen', 'central_kitchen')
on conflict (location_code) do nothing;
