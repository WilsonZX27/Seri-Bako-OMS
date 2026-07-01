-- Sprint 5: Stock Transfer + Stock Wastage

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_operation_status') then
    create type public.stock_operation_status as enum ('draft','submitted','approved','posted','rejected','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_wastage_reason') then
    create type public.stock_wastage_reason as enum ('expired','damaged','spoiled','production_loss','missing','staff_meal','sampling','supplier_claim','other');
  end if;
end $$;

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  document_id uuid references public.documents(id) on delete set null,
  transfer_no text not null,
  transfer_date date not null default current_date,
  from_branch_id uuid references public.branches(id),
  from_location_id uuid not null references public.locations(id),
  to_branch_id uuid references public.branches(id),
  to_location_id uuid not null references public.locations(id),
  status public.stock_operation_status not null default 'draft',
  remarks text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id),
  updated_by uuid references public.staffs(id),
  deleted_at timestamptz,
  constraint stock_transfers_no_not_empty check (length(trim(transfer_no)) > 0),
  constraint stock_transfers_location_diff check (from_location_id <> to_location_id)
);

create unique index if not exists stock_transfers_company_no_active_idx on public.stock_transfers(company_id, transfer_no) where deleted_at is null;
create index if not exists stock_transfers_status_idx on public.stock_transfers(status);
create index if not exists stock_transfers_date_idx on public.stock_transfers(transfer_date);
create index if not exists stock_transfers_from_location_idx on public.stock_transfers(from_location_id);
create index if not exists stock_transfers_to_location_idx on public.stock_transfers(to_location_id);
drop trigger if exists set_stock_transfers_updated_at on public.stock_transfers;
create trigger set_stock_transfers_updated_at before update on public.stock_transfers for each row execute function public.set_updated_at();

create table if not exists public.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  stock_transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  item_id uuid not null references public.items(id),
  barcode text,
  quantity numeric(14,4) not null,
  uom text not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_transfer_lines_qty_positive check (quantity > 0),
  constraint stock_transfer_lines_uom_not_empty check (length(trim(uom)) > 0)
);
create index if not exists stock_transfer_lines_transfer_idx on public.stock_transfer_lines(stock_transfer_id);
create index if not exists stock_transfer_lines_item_idx on public.stock_transfer_lines(item_id);
drop trigger if exists set_stock_transfer_lines_updated_at on public.stock_transfer_lines;
create trigger set_stock_transfer_lines_updated_at before update on public.stock_transfer_lines for each row execute function public.set_updated_at();

create table if not exists public.stock_wastage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  document_id uuid references public.documents(id) on delete set null,
  wastage_no text not null,
  wastage_date date not null default current_date,
  branch_id uuid references public.branches(id),
  location_id uuid not null references public.locations(id),
  reason public.stock_wastage_reason not null,
  status public.stock_operation_status not null default 'draft',
  remarks text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id),
  updated_by uuid references public.staffs(id),
  deleted_at timestamptz,
  constraint stock_wastage_no_not_empty check (length(trim(wastage_no)) > 0)
);

create unique index if not exists stock_wastage_company_no_active_idx on public.stock_wastage(company_id, wastage_no) where deleted_at is null;
create index if not exists stock_wastage_status_idx on public.stock_wastage(status);
create index if not exists stock_wastage_date_idx on public.stock_wastage(wastage_date);
create index if not exists stock_wastage_location_idx on public.stock_wastage(location_id);
create index if not exists stock_wastage_reason_idx on public.stock_wastage(reason);
drop trigger if exists set_stock_wastage_updated_at on public.stock_wastage;
create trigger set_stock_wastage_updated_at before update on public.stock_wastage for each row execute function public.set_updated_at();

create table if not exists public.stock_wastage_lines (
  id uuid primary key default gen_random_uuid(),
  stock_wastage_id uuid not null references public.stock_wastage(id) on delete cascade,
  item_id uuid not null references public.items(id),
  barcode text,
  quantity numeric(14,4) not null,
  uom text not null,
  reason public.stock_wastage_reason not null,
  batch_no text,
  expiry_date date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_wastage_lines_qty_positive check (quantity > 0),
  constraint stock_wastage_lines_uom_not_empty check (length(trim(uom)) > 0)
);
create index if not exists stock_wastage_lines_wastage_idx on public.stock_wastage_lines(stock_wastage_id);
create index if not exists stock_wastage_lines_item_idx on public.stock_wastage_lines(item_id);
drop trigger if exists set_stock_wastage_lines_updated_at on public.stock_wastage_lines;
create trigger set_stock_wastage_lines_updated_at before update on public.stock_wastage_lines for each row execute function public.set_updated_at();

alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_lines enable row level security;
alter table public.stock_wastage enable row level security;
alter table public.stock_wastage_lines enable row level security;

insert into public.permissions (permission_code, module, action, description)
values
  ('stock_transfer.read','stock_transfer','read','Read stock transfers'),
  ('stock_transfer.create','stock_transfer','create','Create stock transfers'),
  ('stock_transfer.update','stock_transfer','update','Update stock transfers'),
  ('stock_transfer.post','stock_transfer','post','Post stock transfers'),
  ('stock_transfer.cancel','stock_transfer','cancel','Cancel stock transfers'),
  ('stock_wastage.read','stock_wastage','read','Read stock wastage'),
  ('stock_wastage.create','stock_wastage','create','Create stock wastage'),
  ('stock_wastage.update','stock_wastage','update','Update stock wastage'),
  ('stock_wastage.post','stock_wastage','post','Post stock wastage'),
  ('stock_wastage.cancel','stock_wastage','cancel','Cancel stock wastage')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.module in ('stock_transfer','stock_wastage')
where r.role_code in ('admin','kitchen') on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.permission_code in ('stock_transfer.read','stock_wastage.read')
where r.role_code in ('purchasing','finance','viewer') on conflict do nothing;

drop policy if exists "stock transfers read" on public.stock_transfers;
create policy "stock transfers read" on public.stock_transfers for select to authenticated using (public.has_permission('stock_transfer.read'));
drop policy if exists "stock transfers manage" on public.stock_transfers;
create policy "stock transfers manage" on public.stock_transfers for all to authenticated using (public.has_permission('stock_transfer.create') or public.has_permission('stock_transfer.update') or public.has_permission('stock_transfer.post')) with check (true);
drop policy if exists "stock transfer lines read" on public.stock_transfer_lines;
create policy "stock transfer lines read" on public.stock_transfer_lines for select to authenticated using (public.has_permission('stock_transfer.read'));
drop policy if exists "stock transfer lines manage" on public.stock_transfer_lines;
create policy "stock transfer lines manage" on public.stock_transfer_lines for all to authenticated using (public.has_permission('stock_transfer.create') or public.has_permission('stock_transfer.update')) with check (true);

drop policy if exists "stock wastage read" on public.stock_wastage;
create policy "stock wastage read" on public.stock_wastage for select to authenticated using (public.has_permission('stock_wastage.read'));
drop policy if exists "stock wastage manage" on public.stock_wastage;
create policy "stock wastage manage" on public.stock_wastage for all to authenticated using (public.has_permission('stock_wastage.create') or public.has_permission('stock_wastage.update') or public.has_permission('stock_wastage.post')) with check (true);
drop policy if exists "stock wastage lines read" on public.stock_wastage_lines;
create policy "stock wastage lines read" on public.stock_wastage_lines for select to authenticated using (public.has_permission('stock_wastage.read'));
drop policy if exists "stock wastage lines manage" on public.stock_wastage_lines;
create policy "stock wastage lines manage" on public.stock_wastage_lines for all to authenticated using (public.has_permission('stock_wastage.create') or public.has_permission('stock_wastage.update')) with check (true);
