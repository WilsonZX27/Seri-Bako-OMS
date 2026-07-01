-- =========================================================
-- Seri Bako OMS Sprint 3 Procurement Core
-- Scope: Purchase Request and Purchase Order only.
-- Excludes goods receiving, invoices, payment, finance, production.
-- =========================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_request_status') then
    create type public.purchase_request_status as enum (
      'draft','submitted','admin_review','purchasing_review','pending_approval','approved','rejected','converted','cancelled'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'purchase_order_status') then
    create type public.purchase_order_status as enum (
      'draft','pending_approval','approved','sent','partial_received','received','cancelled','closed'
    );
  end if;
end $$;

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  document_id uuid references public.documents(id),
  request_no text not null,
  requested_by uuid,
  request_date date not null default current_date,
  required_date date,
  branch_id uuid references public.branches(id),
  location_id uuid references public.locations(id),
  status public.purchase_request_status not null default 'draft',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint purchase_requests_no_not_empty check (length(trim(request_no)) > 0)
);

create unique index if not exists purchase_requests_company_no_active_idx
  on public.purchase_requests(company_id, request_no)
  where deleted_at is null;
create index if not exists purchase_requests_status_idx on public.purchase_requests(status);
create index if not exists purchase_requests_document_idx on public.purchase_requests(document_id);

drop trigger if exists set_purchase_requests_updated_at on public.purchase_requests;
create trigger set_purchase_requests_updated_at before update on public.purchase_requests for each row execute function public.set_updated_at();

create table if not exists public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  item_id uuid not null references public.items(id),
  qty numeric(18,4) not null,
  uom text not null,
  estimated_unit_cost numeric(18,4) not null default 0,
  suggested_supplier_id uuid references public.suppliers(id),
  reason text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_request_lines_qty_positive check (qty > 0),
  constraint purchase_request_lines_uom_not_empty check (length(trim(uom)) > 0),
  constraint purchase_request_lines_cost_nonnegative check (estimated_unit_cost >= 0)
);

create index if not exists purchase_request_lines_pr_idx on public.purchase_request_lines(purchase_request_id);
create index if not exists purchase_request_lines_item_idx on public.purchase_request_lines(item_id);

drop trigger if exists set_purchase_request_lines_updated_at on public.purchase_request_lines;
create trigger set_purchase_request_lines_updated_at before update on public.purchase_request_lines for each row execute function public.set_updated_at();

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  document_id uuid references public.documents(id),
  purchase_request_id uuid references public.purchase_requests(id),
  po_no text not null,
  supplier_id uuid not null references public.suppliers(id),
  order_date date not null default current_date,
  expected_delivery_date date,
  status public.purchase_order_status not null default 'draft',
  approval_status public.approval_status not null default 'draft',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint purchase_orders_no_not_empty check (length(trim(po_no)) > 0)
);

create unique index if not exists purchase_orders_company_no_active_idx
  on public.purchase_orders(company_id, po_no)
  where deleted_at is null;
create index if not exists purchase_orders_status_idx on public.purchase_orders(status);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders(supplier_id);
create index if not exists purchase_orders_document_idx on public.purchase_orders(document_id);

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid not null references public.items(id),
  qty_ordered numeric(18,4) not null,
  qty_received numeric(18,4) not null default 0,
  qty_cancelled numeric(18,4) not null default 0,
  uom text not null,
  unit_price numeric(18,4) not null default 0,
  line_total numeric(18,4) generated always as (qty_ordered * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_order_lines_qty_positive check (qty_ordered > 0),
  constraint purchase_order_lines_received_nonnegative check (qty_received >= 0),
  constraint purchase_order_lines_cancelled_nonnegative check (qty_cancelled >= 0),
  constraint purchase_order_lines_uom_not_empty check (length(trim(uom)) > 0),
  constraint purchase_order_lines_unit_price_nonnegative check (unit_price >= 0)
);

create index if not exists purchase_order_lines_po_idx on public.purchase_order_lines(purchase_order_id);
create index if not exists purchase_order_lines_item_idx on public.purchase_order_lines(item_id);

drop trigger if exists set_purchase_order_lines_updated_at on public.purchase_order_lines;
create trigger set_purchase_order_lines_updated_at before update on public.purchase_order_lines for each row execute function public.set_updated_at();

alter table public.purchase_requests enable row level security;
alter table public.purchase_request_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

drop policy if exists "purchase requests read" on public.purchase_requests;
create policy "purchase requests read" on public.purchase_requests for select to authenticated using (public.has_permission('purchase_request.read'));
drop policy if exists "purchase requests create" on public.purchase_requests;
create policy "purchase requests create" on public.purchase_requests for insert to authenticated with check (public.has_permission('purchase_request.create'));
drop policy if exists "purchase requests update" on public.purchase_requests;
create policy "purchase requests update" on public.purchase_requests for update to authenticated using (public.has_permission('purchase_request.update') or public.has_permission('purchase_request.review') or public.has_permission('purchase_request.approve') or public.has_permission('purchase_request.convert')) with check (true);

drop policy if exists "purchase request lines read" on public.purchase_request_lines;
create policy "purchase request lines read" on public.purchase_request_lines for select to authenticated using (public.has_permission('purchase_request.read'));
drop policy if exists "purchase request lines manage" on public.purchase_request_lines;
create policy "purchase request lines manage" on public.purchase_request_lines for all to authenticated using (public.has_permission('purchase_request.update') or public.has_permission('purchase_request.create')) with check (true);

drop policy if exists "purchase orders read" on public.purchase_orders;
create policy "purchase orders read" on public.purchase_orders for select to authenticated using (public.has_permission('purchase_order.read'));
drop policy if exists "purchase orders create" on public.purchase_orders;
create policy "purchase orders create" on public.purchase_orders for insert to authenticated with check (public.has_permission('purchase_order.create'));
drop policy if exists "purchase orders update" on public.purchase_orders;
create policy "purchase orders update" on public.purchase_orders for update to authenticated using (public.has_permission('purchase_order.update') or public.has_permission('purchase_order.approve') or public.has_permission('purchase_order.send') or public.has_permission('purchase_order.cancel') or public.has_permission('purchase_order.close')) with check (true);

drop policy if exists "purchase order lines read" on public.purchase_order_lines;
create policy "purchase order lines read" on public.purchase_order_lines for select to authenticated using (public.has_permission('purchase_order.read'));
drop policy if exists "purchase order lines manage" on public.purchase_order_lines;
create policy "purchase order lines manage" on public.purchase_order_lines for all to authenticated using (public.has_permission('purchase_order.update') or public.has_permission('purchase_order.create')) with check (true);

insert into public.permissions (permission_code, module, action, description)
values
  ('purchase_request.read','purchase_request','read','Read purchase requests'),
  ('purchase_request.create','purchase_request','create','Create purchase requests'),
  ('purchase_request.update','purchase_request','update','Update purchase requests'),
  ('purchase_request.submit','purchase_request','submit','Submit purchase requests'),
  ('purchase_request.review','purchase_request','review','Review purchase requests'),
  ('purchase_request.approve','purchase_request','approve','Approve purchase requests'),
  ('purchase_request.convert','purchase_request','convert','Convert purchase requests to purchase orders'),
  ('purchase_order.read','purchase_order','read','Read purchase orders'),
  ('purchase_order.create','purchase_order','create','Create purchase orders'),
  ('purchase_order.update','purchase_order','update','Update purchase orders'),
  ('purchase_order.submit','purchase_order','submit','Submit purchase orders'),
  ('purchase_order.approve','purchase_order','approve','Approve purchase orders'),
  ('purchase_order.send','purchase_order','send','Send purchase orders'),
  ('purchase_order.cancel','purchase_order','cancel','Cancel purchase orders'),
  ('purchase_order.close','purchase_order','close','Close purchase orders')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module in ('purchase_request','purchase_order')
where r.role_code in ('admin','purchasing')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('purchase_request.read','purchase_request.create','purchase_request.update','purchase_request.submit')
where r.role_code = 'kitchen'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('purchase_request.read','purchase_order.read')
where r.role_code in ('finance','viewer')
on conflict (role_id, permission_id) do nothing;
