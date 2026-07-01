-- Sprint 3.5: Goods Receiving / Partial Delivery
-- Adds GRN header/lines, permissions, RLS policies, and receiving document support.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'goods_receiving_status') then
    create type public.goods_receiving_status as enum ('draft', 'posted', 'cancelled');
  end if;
end $$;

create table if not exists public.goods_receivings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  document_id uuid references public.documents(id) on delete set null,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  grn_no text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  received_date date not null default current_date,
  branch_id uuid references public.branches(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  status public.goods_receiving_status not null default 'draft',
  received_by uuid references public.staffs(id) on delete set null,
  remarks text,
  posted_at timestamptz,
  posted_by uuid references public.staffs(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  deleted_at timestamptz,
  constraint goods_receivings_no_not_empty check (length(trim(grn_no)) > 0)
);

create unique index if not exists goods_receivings_company_no_active_idx
  on public.goods_receivings(company_id, grn_no)
  where deleted_at is null;
create index if not exists goods_receivings_po_idx on public.goods_receivings(purchase_order_id);
create index if not exists goods_receivings_supplier_idx on public.goods_receivings(supplier_id);
create index if not exists goods_receivings_status_idx on public.goods_receivings(status);
create index if not exists goods_receivings_document_idx on public.goods_receivings(document_id);
create index if not exists goods_receivings_location_idx on public.goods_receivings(location_id);

drop trigger if exists set_goods_receivings_updated_at on public.goods_receivings;
create trigger set_goods_receivings_updated_at before update on public.goods_receivings for each row execute function public.set_updated_at();

create table if not exists public.goods_receiving_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receiving_id uuid not null references public.goods_receivings(id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  ordered_qty numeric(14,4) not null default 0,
  previously_received_qty numeric(14,4) not null default 0,
  pending_qty numeric(14,4) not null default 0,
  received_qty numeric(14,4) not null default 0,
  rejected_qty numeric(14,4) not null default 0,
  uom text not null,
  unit_cost numeric(14,4) not null default 0,
  batch_no text,
  expiry_date date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goods_receiving_lines_qty_nonnegative check (
    ordered_qty >= 0 and previously_received_qty >= 0 and pending_qty >= 0 and received_qty >= 0 and rejected_qty >= 0
  ),
  constraint goods_receiving_lines_uom_not_empty check (length(trim(uom)) > 0),
  constraint goods_receiving_lines_unit_cost_nonnegative check (unit_cost >= 0)
);

create index if not exists goods_receiving_lines_grn_idx on public.goods_receiving_lines(goods_receiving_id);
create index if not exists goods_receiving_lines_po_line_idx on public.goods_receiving_lines(purchase_order_line_id);
create index if not exists goods_receiving_lines_item_idx on public.goods_receiving_lines(item_id);

drop trigger if exists set_goods_receiving_lines_updated_at on public.goods_receiving_lines;
create trigger set_goods_receiving_lines_updated_at before update on public.goods_receiving_lines for each row execute function public.set_updated_at();

alter table public.goods_receivings enable row level security;
alter table public.goods_receiving_lines enable row level security;

drop policy if exists "goods receiving read" on public.goods_receivings;
create policy "goods receiving read" on public.goods_receivings for select to authenticated using (public.has_permission('goods_receiving.read'));
drop policy if exists "goods receiving create" on public.goods_receivings;
create policy "goods receiving create" on public.goods_receivings for insert to authenticated with check (public.has_permission('goods_receiving.create'));
drop policy if exists "goods receiving update" on public.goods_receivings;
create policy "goods receiving update" on public.goods_receivings for update to authenticated
  using (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.post') or public.has_permission('goods_receiving.cancel'))
  with check (true);

drop policy if exists "goods receiving lines read" on public.goods_receiving_lines;
create policy "goods receiving lines read" on public.goods_receiving_lines for select to authenticated using (public.has_permission('goods_receiving.read'));
drop policy if exists "goods receiving lines manage" on public.goods_receiving_lines;
create policy "goods receiving lines manage" on public.goods_receiving_lines for all to authenticated
  using (public.has_permission('goods_receiving.update') or public.has_permission('goods_receiving.create'))
  with check (true);

insert into public.permissions (permission_code, module, action, description)
values
  ('goods_receiving.read','goods_receiving','read','Read goods receivings'),
  ('goods_receiving.create','goods_receiving','create','Create goods receivings'),
  ('goods_receiving.update','goods_receiving','update','Update draft goods receivings'),
  ('goods_receiving.post','goods_receiving','post','Post goods receivings to stock'),
  ('goods_receiving.cancel','goods_receiving','cancel','Cancel goods receivings')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'goods_receiving'
where r.role_code in ('admin','purchasing','kitchen')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'goods_receiving.read'
where r.role_code in ('finance','viewer')
on conflict do nothing;
