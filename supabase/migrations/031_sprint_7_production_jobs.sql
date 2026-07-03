-- Sprint 7: Production Jobs and Recipe-Based Stock Movement
-- Adds production job workflow tables, permissions, sequence, and safe RLS policies.

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  production_job_no text not null,
  production_date date not null,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  output_item_id uuid references public.items(id) on delete set null,
  planned_output_qty numeric(14,4) not null,
  actual_output_qty numeric(14,4),
  output_uom text,
  status text not null default 'draft',
  priority text default 'normal',
  remarks text,
  document_id uuid references public.documents(id) on delete set null,
  stock_transaction_id uuid references public.stock_transactions(id) on delete set null,
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  posted_by uuid references public.staffs(id) on delete set null,
  posted_at timestamptz,
  cancelled_by uuid references public.staffs(id) on delete set null,
  cancelled_at timestamptz,
  rejected_by uuid references public.staffs(id) on delete set null,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint production_jobs_status_check check (status in ('draft','submitted','approved','posted','cancelled','rejected')),
  constraint production_jobs_planned_qty_positive check (planned_output_qty > 0),
  constraint production_jobs_actual_qty_positive check (actual_output_qty is null or actual_output_qty > 0)
);

create unique index if not exists production_jobs_company_no_idx
  on public.production_jobs(company_id, production_job_no)
  where deleted_at is null;
create index if not exists production_jobs_branch_idx on public.production_jobs(branch_id);
create index if not exists production_jobs_recipe_idx on public.production_jobs(recipe_id);
create index if not exists production_jobs_status_idx on public.production_jobs(status);
create index if not exists production_jobs_date_idx on public.production_jobs(production_date);

create table if not exists public.production_job_ingredient_lines (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  item_code text,
  item_name text,
  required_qty numeric(14,4) not null,
  actual_qty numeric(14,4),
  uom text,
  unit_cost numeric(14,4) default 0,
  line_cost numeric(14,4) default 0,
  stock_available_qty numeric(14,4),
  variance_qty numeric(14,4),
  remarks text,
  created_at timestamptz not null default now(),
  constraint production_job_ingredient_required_positive check (required_qty > 0),
  constraint production_job_ingredient_actual_positive check (actual_qty is null or actual_qty >= 0)
);

create index if not exists production_job_ingredient_job_idx on public.production_job_ingredient_lines(production_job_id);
create index if not exists production_job_ingredient_item_idx on public.production_job_ingredient_lines(item_id);

create table if not exists public.production_job_output_lines (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  output_code text,
  output_name text,
  planned_qty numeric(14,4) not null,
  actual_qty numeric(14,4),
  uom text,
  unit_cost numeric(14,4) default 0,
  line_cost numeric(14,4) default 0,
  remarks text,
  created_at timestamptz not null default now(),
  constraint production_job_output_planned_positive check (planned_qty > 0),
  constraint production_job_output_actual_positive check (actual_qty is null or actual_qty >= 0)
);

create index if not exists production_job_output_job_idx on public.production_job_output_lines(production_job_id);
create index if not exists production_job_output_product_idx on public.production_job_output_lines(product_id);
create index if not exists production_job_output_item_idx on public.production_job_output_lines(item_id);

drop trigger if exists set_production_jobs_updated_at on public.production_jobs;
create trigger set_production_jobs_updated_at
before update on public.production_jobs
for each row execute function public.set_updated_at();

insert into public.permissions (permission_code, module, action, description)
values
  ('production.view','production','view','View production jobs'),
  ('production.create','production','create','Create production jobs'),
  ('production.submit','production','submit','Submit production jobs'),
  ('production.approve','production','approve','Approve production jobs'),
  ('production.post','production','post','Post production stock movements'),
  ('production.cancel','production','cancel','Cancel production jobs'),
  ('production.reject','production','reject','Reject production jobs'),
  ('production.override_negative_stock','production','override_negative_stock','Allow production posting with insufficient ingredient stock')
on conflict (permission_code) do nothing;

insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
select c.id, 'production_job', 'PROD', 1, 5, 'never', 'active'
from public.companies c
where not exists (
  select 1
  from public.document_sequences ds
  where ds.company_id = c.id
    and ds.document_type = 'production_job'
    and ds.deleted_at is null
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'production.view','production.create','production.submit','production.approve','production.post','production.cancel','production.reject','production.override_negative_stock'
)
where r.role_code in ('super_admin','admin','operations_admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('production.view','production.approve','production.reject')
where r.role_code = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('production.view','production.create','production.submit','production.cancel')
where r.role_code in ('kitchen','kitchen_staff')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'production.view'
where r.role_code in ('purchasing','finance','viewer')
on conflict (role_id, permission_id) do nothing;

alter table public.production_jobs enable row level security;
alter table public.production_job_ingredient_lines enable row level security;
alter table public.production_job_output_lines enable row level security;

drop policy if exists "production jobs read" on public.production_jobs;
create policy "production jobs read" on public.production_jobs
for select to authenticated using (public.has_permission('production.view'));

drop policy if exists "production jobs insert" on public.production_jobs;
create policy "production jobs insert" on public.production_jobs
for insert to authenticated with check (public.has_permission('production.create'));

drop policy if exists "production jobs update" on public.production_jobs;
create policy "production jobs update" on public.production_jobs
for update to authenticated using (
  public.has_permission('production.create')
  or public.has_permission('production.submit')
  or public.has_permission('production.approve')
  or public.has_permission('production.post')
  or public.has_permission('production.cancel')
  or public.has_permission('production.reject')
) with check (
  public.has_permission('production.create')
  or public.has_permission('production.submit')
  or public.has_permission('production.approve')
  or public.has_permission('production.post')
  or public.has_permission('production.cancel')
  or public.has_permission('production.reject')
);

drop policy if exists "production ingredient lines read" on public.production_job_ingredient_lines;
create policy "production ingredient lines read" on public.production_job_ingredient_lines
for select to authenticated using (public.has_permission('production.view'));

drop policy if exists "production ingredient lines insert" on public.production_job_ingredient_lines;
create policy "production ingredient lines insert" on public.production_job_ingredient_lines
for insert to authenticated with check (public.has_permission('production.create'));

drop policy if exists "production ingredient lines update" on public.production_job_ingredient_lines;
create policy "production ingredient lines update" on public.production_job_ingredient_lines
for update to authenticated using (public.has_permission('production.create') or public.has_permission('production.post'))
with check (public.has_permission('production.create') or public.has_permission('production.post'));

drop policy if exists "production output lines read" on public.production_job_output_lines;
create policy "production output lines read" on public.production_job_output_lines
for select to authenticated using (public.has_permission('production.view'));

drop policy if exists "production output lines insert" on public.production_job_output_lines;
create policy "production output lines insert" on public.production_job_output_lines
for insert to authenticated with check (public.has_permission('production.create'));

drop policy if exists "production output lines update" on public.production_job_output_lines;
create policy "production output lines update" on public.production_job_output_lines
for update to authenticated using (public.has_permission('production.create') or public.has_permission('production.post'))
with check (public.has_permission('production.create') or public.has_permission('production.post'));

grant select, insert, update on table public.production_jobs to authenticated;
grant select, insert, update on table public.production_job_ingredient_lines to authenticated;
grant select, insert, update on table public.production_job_output_lines to authenticated;
