-- =========================================================
-- Seri Bako OMS Sprint 1.5
-- Staff role/access mapping and Document Sequences module
-- =========================================================

do $$ begin if not exists (select 1 from pg_type where typname = 'staff_access_level') then create type public.staff_access_level as enum ('full','manage','read_only'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'reset_frequency') then create type public.reset_frequency as enum ('never','yearly','monthly','daily'); end if; end $$;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staffs(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  branch_id uuid references public.branches(id),
  is_primary boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(staff_id, role_id, branch_id),
  constraint staff_roles_date_check check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.staff_branches (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staffs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  access_level public.staff_access_level not null default 'read_only',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(staff_id, branch_id)
);

create table if not exists public.staff_locations (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staffs(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(staff_id, location_id)
);

create table if not exists public.document_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  document_type text not null,
  prefix text not null,
  next_number integer not null default 1,
  padding integer not null default 5,
  reset_frequency public.reset_frequency not null default 'yearly',
  last_reset_at timestamptz,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, document_type),
  constraint document_sequences_next_positive check (next_number > 0),
  constraint document_sequences_padding_positive check (padding > 0)
);

create unique index if not exists staff_roles_one_primary_idx on public.staff_roles(staff_id) where is_primary = true;
create unique index if not exists staff_branches_one_default_idx on public.staff_branches(staff_id) where is_default = true;
create index if not exists staff_roles_staff_idx on public.staff_roles(staff_id);
create index if not exists staff_roles_role_idx on public.staff_roles(role_id);
create index if not exists staff_branches_staff_idx on public.staff_branches(staff_id);
create index if not exists staff_locations_staff_idx on public.staff_locations(staff_id);
create index if not exists document_sequences_company_type_idx on public.document_sequences(company_id, document_type);

do $$
declare r record;
begin
  for r in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
      and table_name in ('staff_roles','staff_branches','document_sequences')
  loop
    execute format('drop trigger if exists set_%I_updated_at on %I.%I', r.table_name, r.table_schema, r.table_name);
    execute format('create trigger set_%I_updated_at before update on %I.%I for each row execute function public.set_updated_at()', r.table_name, r.table_schema, r.table_name);
  end loop;
end $$;

create or replace function public.current_staff_role_codes()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct r.role_code), array[]::text[])
  from public.staffs s
  join public.staff_roles sr on sr.staff_id = s.id
  join public.roles r on r.id = sr.role_id
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and r.status = 'active'
    and sr.effective_from <= current_date
    and (sr.effective_to is null or sr.effective_to >= current_date)
$$;

create or replace function public.has_permission(permission text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id and r.status = 'active'
    left join public.role_permissions rp on rp.role_id = r.id
    left join public.permissions p on p.id = rp.permission_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active'
      and sr.effective_from <= current_date
      and (sr.effective_to is null or sr.effective_to >= current_date)
      and (r.role_code = 'admin' or p.permission_code = permission)
  )
$$;

alter table public.staff_roles enable row level security;
alter table public.staff_branches enable row level security;
alter table public.staff_locations enable row level security;
alter table public.document_sequences enable row level security;

do $$
declare t text;
begin
  foreach t in array array['staff_roles','staff_branches','staff_locations','document_sequences']
  loop
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

create policy "staff roles admin manage" on public.staff_roles for all to authenticated using (public.has_permission('staffs.update') or public.has_permission('roles.update')) with check (public.has_permission('staffs.update') or public.has_permission('roles.update'));
create policy "staff branches admin manage" on public.staff_branches for all to authenticated using (public.has_permission('staffs.update')) with check (public.has_permission('staffs.update'));
create policy "staff locations admin manage" on public.staff_locations for all to authenticated using (public.has_permission('staffs.update')) with check (public.has_permission('staffs.update'));
create policy "document sequences admin manage" on public.document_sequences for all to authenticated using (public.has_permission('document_sequences.update') or public.has_permission('document_sequences.create')) with check (public.has_permission('document_sequences.update') or public.has_permission('document_sequences.create'));

insert into public.permissions (permission_code, module, action, description)
values
  ('document_sequences.read','document_sequences','read','View document sequences'),
  ('document_sequences.create','document_sequences','create','Create document sequences'),
  ('document_sequences.update','document_sequences','update','Update document sequences')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on true
where r.role_code = 'admin'
on conflict (role_id, permission_id) do nothing;

insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
select c.id, s.document_type, s.prefix, 1, 5, 'yearly', 'active'
from public.companies c
cross join (
  values
    ('purchase_order','PO'),
    ('goods_receiving','GRN'),
    ('supplier_invoice','INV'),
    ('stock_count','SC'),
    ('production_job','PJ'),
    ('payment_schedule','PAY')
) as s(document_type, prefix)
where c.company_code = 'SERI-BAKO'
on conflict (company_id, document_type) do nothing;
