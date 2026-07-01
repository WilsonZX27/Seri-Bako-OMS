-- Sprint 4.5: Stock Count + Variance
-- Stock counts compare physical vs theoretical stock. Posting creates stock_count_adjustment transactions.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_count_status') then
    create type public.stock_count_status as enum ('draft','submitted','reviewed','approved','posted','rejected','cancelled');
  end if;
end $$;

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  document_id uuid references public.documents(id) on delete set null,
  count_no text not null,
  count_date date not null default current_date,
  branch_id uuid references public.branches(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  counted_by uuid references public.staffs(id) on delete set null,
  status public.stock_count_status not null default 'draft',
  tolerance_percent numeric(8,4) not null default 2,
  remarks text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  posted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  deleted_at timestamptz,
  constraint stock_counts_no_not_empty check (length(trim(count_no)) > 0)
);

create unique index if not exists stock_counts_company_no_active_idx on public.stock_counts(company_id, count_no) where deleted_at is null;
create index if not exists stock_counts_location_idx on public.stock_counts(location_id);
create index if not exists stock_counts_status_idx on public.stock_counts(status);
create index if not exists stock_counts_date_idx on public.stock_counts(count_date);
create index if not exists stock_counts_document_idx on public.stock_counts(document_id);

drop trigger if exists set_stock_counts_updated_at on public.stock_counts;
create trigger set_stock_counts_updated_at before update on public.stock_counts for each row execute function public.set_updated_at();

create table if not exists public.stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  barcode text,
  theoretical_qty numeric(14,4) not null default 0,
  physical_qty numeric(14,4) not null default 0,
  variance_qty numeric(14,4) generated always as (physical_qty - theoretical_qty) stored,
  variance_percent numeric(14,4) generated always as (
    case when theoretical_qty = 0 then case when physical_qty = 0 then 0 else 100 end
    else ((physical_qty - theoretical_qty) / theoretical_qty) * 100 end
  ) stored,
  uom text not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_count_lines_qty_nonnegative check (theoretical_qty >= 0 and physical_qty >= 0),
  constraint stock_count_lines_uom_not_empty check (length(trim(uom)) > 0)
);

create unique index if not exists stock_count_lines_count_item_idx on public.stock_count_lines(stock_count_id, item_id);
create index if not exists stock_count_lines_item_idx on public.stock_count_lines(item_id);

drop trigger if exists set_stock_count_lines_updated_at on public.stock_count_lines;
create trigger set_stock_count_lines_updated_at before update on public.stock_count_lines for each row execute function public.set_updated_at();

alter table public.stock_counts enable row level security;
alter table public.stock_count_lines enable row level security;

drop policy if exists "stock counts read" on public.stock_counts;
create policy "stock counts read" on public.stock_counts for select to authenticated using (public.has_permission('stock_count.read'));
drop policy if exists "stock counts create" on public.stock_counts;
create policy "stock counts create" on public.stock_counts for insert to authenticated with check (public.has_permission('stock_count.create'));
drop policy if exists "stock counts update" on public.stock_counts;
create policy "stock counts update" on public.stock_counts for update to authenticated
  using (public.has_permission('stock_count.update') or public.has_permission('stock_count.approve') or public.has_permission('stock_count.post'))
  with check (true);

drop policy if exists "stock count lines read" on public.stock_count_lines;
create policy "stock count lines read" on public.stock_count_lines for select to authenticated using (public.has_permission('stock_count.read'));
drop policy if exists "stock count lines manage" on public.stock_count_lines;
create policy "stock count lines manage" on public.stock_count_lines for all to authenticated
  using (public.has_permission('stock_count.update') or public.has_permission('stock_count.create'))
  with check (true);

insert into public.permissions (permission_code, module, action, description)
values
  ('stock_count.read','stock_count','read','Read stock counts'),
  ('stock_count.create','stock_count','create','Create stock counts'),
  ('stock_count.update','stock_count','update','Update draft stock counts'),
  ('stock_count.submit','stock_count','submit','Submit stock counts for review'),
  ('stock_count.review','stock_count','review','Review stock counts'),
  ('stock_count.approve','stock_count','approve','Approve stock counts'),
  ('stock_count.post','stock_count','post','Post stock count variances'),
  ('stock_count.cancel','stock_count','cancel','Cancel stock counts')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'stock_count'
where r.role_code in ('admin','kitchen')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'stock_count.read'
where r.role_code in ('purchasing','finance','viewer')
on conflict do nothing;
