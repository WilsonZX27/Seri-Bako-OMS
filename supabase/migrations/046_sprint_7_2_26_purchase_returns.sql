-- Sprint 7.2.26: core purchase return document and stock-out workflow.

alter table public.goods_receiving_lines
  add column if not exists returned_qty numeric(14,4) not null default 0;

create table if not exists public.purchase_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  purchase_return_no text not null,
  goods_receiving_id uuid not null references public.goods_receivings(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  return_date date not null default current_date,
  status text not null default 'draft',
  reason text,
  remarks text,
  posted_at timestamptz,
  posted_by uuid references public.staffs(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  deleted_at timestamptz,
  constraint purchase_returns_status_check check (status in ('draft','posted','cancelled'))
);

create unique index if not exists purchase_returns_company_no_idx
  on public.purchase_returns(company_id, purchase_return_no)
  where deleted_at is null;
create index if not exists purchase_returns_grn_idx on public.purchase_returns(goods_receiving_id);
create index if not exists purchase_returns_status_idx on public.purchase_returns(status);

create table if not exists public.purchase_return_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_return_id uuid not null references public.purchase_returns(id) on delete cascade,
  goods_receiving_line_id uuid not null references public.goods_receiving_lines(id) on delete restrict,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  received_qty numeric(14,4) not null default 0,
  previously_returned_qty numeric(14,4) not null default 0,
  return_qty numeric(14,4) not null,
  uom text not null,
  unit_cost numeric(14,4) not null default 0,
  line_total numeric(14,4) generated always as (return_qty * unit_cost) stored,
  reason text,
  stock_transaction_id uuid references public.stock_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_return_lines_qty_positive check (return_qty > 0),
  constraint purchase_return_lines_qty_cap check (return_qty <= received_qty - previously_returned_qty)
);

create index if not exists purchase_return_lines_return_idx on public.purchase_return_lines(purchase_return_id);
create index if not exists purchase_return_lines_grn_line_idx on public.purchase_return_lines(goods_receiving_line_id);

drop trigger if exists set_purchase_returns_updated_at on public.purchase_returns;
create trigger set_purchase_returns_updated_at
before update on public.purchase_returns
for each row execute function public.set_updated_at();

insert into public.permissions (permission_code, module, action, description)
values
  ('purchase_return.view','purchase_return','view','View purchase returns'),
  ('purchase_return.create','purchase_return','create','Create purchase returns'),
  ('purchase_return.post','purchase_return','post','Post purchase returns to stock'),
  ('purchase_return.cancel','purchase_return','cancel','Cancel draft purchase returns')
on conflict (permission_code) do nothing;

insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
select c.id, 'purchase_return', 'PRT', 1, 5, 'never', 'active'
from public.companies c
where not exists (
  select 1 from public.document_sequences ds
  where ds.company_id = c.id and ds.document_type = 'purchase_return' and ds.deleted_at is null
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('purchase_return.view','purchase_return.create','purchase_return.post','purchase_return.cancel')
where r.role_code in ('super_admin','admin','operations_admin','purchasing')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'purchase_return.view'
where r.role_code in ('manager','finance','viewer')
on conflict (role_id, permission_id) do nothing;

alter table public.purchase_returns enable row level security;
alter table public.purchase_return_lines enable row level security;

drop policy if exists "purchase returns read" on public.purchase_returns;
create policy "purchase returns read" on public.purchase_returns
for select to authenticated using (public.has_permission('purchase_return.view'));

drop policy if exists "purchase returns insert" on public.purchase_returns;
create policy "purchase returns insert" on public.purchase_returns
for insert to authenticated with check (public.has_permission('purchase_return.create'));

drop policy if exists "purchase returns update" on public.purchase_returns;
create policy "purchase returns update" on public.purchase_returns
for update to authenticated
using (public.has_permission('purchase_return.create') or public.has_permission('purchase_return.post') or public.has_permission('purchase_return.cancel'))
with check (public.has_permission('purchase_return.create') or public.has_permission('purchase_return.post') or public.has_permission('purchase_return.cancel'));

drop policy if exists "purchase return lines read" on public.purchase_return_lines;
create policy "purchase return lines read" on public.purchase_return_lines
for select to authenticated using (public.has_permission('purchase_return.view'));

drop policy if exists "purchase return lines insert" on public.purchase_return_lines;
create policy "purchase return lines insert" on public.purchase_return_lines
for insert to authenticated with check (public.has_permission('purchase_return.create'));

drop policy if exists "purchase return lines update" on public.purchase_return_lines;
create policy "purchase return lines update" on public.purchase_return_lines
for update to authenticated using (public.has_permission('purchase_return.post'))
with check (public.has_permission('purchase_return.post'));

grant select, insert, update on table public.purchase_returns to authenticated;
grant select, insert, update on table public.purchase_return_lines to authenticated;
