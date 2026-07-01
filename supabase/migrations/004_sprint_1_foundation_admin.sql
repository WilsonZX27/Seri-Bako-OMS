-- =========================================================
-- Seri Bako OMS Sprint 1 Foundation & Admin
-- Scope: company, branches, locations, staffs, roles, permissions,
-- role_permissions, attachments, activity_logs, audit_logs, notifications.
-- =========================================================

create extension if not exists "uuid-ossp";

do $$ begin if not exists (select 1 from pg_type where typname = 'record_status') then create type public.record_status as enum ('active','inactive','archived'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'branch_type') then create type public.branch_type as enum ('central_kitchen','outlet','event_booth','office','other'); end if; end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'location_type') then
    alter type public.location_type add value if not exists 'dry_store';
    alter type public.location_type add value if not exists 'chiller';
    alter type public.location_type add value if not exists 'freezer';
    alter type public.location_type add value if not exists 'packaging_area';
    alter type public.location_type add value if not exists 'production_floor';
    alter type public.location_type add value if not exists 'dispatch_area';
    alter type public.location_type add value if not exists 'receiving_area';
    alter type public.location_type add value if not exists 'finished_goods_store';
  else
    create type public.location_type as enum ('dry_store','chiller','freezer','packaging_area','production_floor','dispatch_area','receiving_area','finished_goods_store','other');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company_code text not null unique,
  company_name text not null,
  registration_no text,
  tax_no text,
  phone text,
  email text,
  address text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint companies_code_not_empty check (length(trim(company_code)) > 0),
  constraint companies_name_not_empty check (length(trim(company_name)) > 0)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_code text not null,
  branch_name text not null,
  branch_type public.branch_type not null default 'outlet',
  phone text,
  email text,
  address text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, branch_code)
);

alter table public.locations add column if not exists company_id uuid references public.companies(id);
alter table public.locations add column if not exists branch_id uuid references public.branches(id);
alter table public.locations add column if not exists created_by uuid;
alter table public.locations add column if not exists updated_by uuid;
alter table public.locations add column if not exists deleted_at timestamptz;

create table if not exists public.staffs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  auth_user_id uuid references auth.users(id),
  staff_code text,
  full_name text not null,
  email text,
  phone text,
  default_branch_id uuid references public.branches(id),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, staff_code),
  unique(auth_user_id)
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  role_code text not null,
  role_name text not null,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, role_code)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_code text not null unique,
  module text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(role_id, permission_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references public.staffs(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  activity_type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  staff_id uuid references public.staffs(id),
  channel text not null default 'in_app',
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists branches_company_idx on public.branches(company_id);
create index if not exists branches_type_idx on public.branches(branch_type);
create index if not exists locations_company_idx on public.locations(company_id);
create index if not exists locations_branch_idx on public.locations(branch_id);
create index if not exists staffs_company_idx on public.staffs(company_id);
create index if not exists roles_company_idx on public.roles(company_id);
create index if not exists permissions_module_idx on public.permissions(module, action);
create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id);
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);
create index if not exists audit_logs_table_record_idx on public.audit_logs(table_name, record_id);
create index if not exists notifications_staff_idx on public.notifications(staff_id, read_at);

do $$
declare r record;
begin
  for r in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
      and table_name in ('companies','branches','locations','staffs','roles')
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
  select coalesce(array_agg(r.role_code), array[]::text[])
  from public.staffs s
  left join public.roles r on r.company_id = s.company_id and r.status = 'active'
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
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
    join public.roles r on r.company_id = s.company_id and r.status = 'active'
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active'
      and (r.role_code = 'admin' or p.permission_code = permission)
  )
$$;

alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.locations enable row level security;
alter table public.staffs enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

do $$
declare t text;
begin
  foreach t in array array['companies','branches','locations','staffs','roles','permissions','role_permissions','attachments','activity_logs','audit_logs','notifications']
  loop
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

create policy "companies admin update" on public.companies for update to authenticated using (public.has_permission('company.update')) with check (public.has_permission('company.update'));
create policy "branches admin manage" on public.branches for all to authenticated using (public.has_permission('branches.update') or public.has_permission('branches.create')) with check (public.has_permission('branches.update') or public.has_permission('branches.create'));
create policy "locations admin manage" on public.locations for all to authenticated using (public.has_permission('locations.update') or public.has_permission('locations.create')) with check (public.has_permission('locations.update') or public.has_permission('locations.create'));
create policy "staffs admin manage" on public.staffs for all to authenticated using (public.has_permission('staffs.update') or public.has_permission('staffs.create')) with check (public.has_permission('staffs.update') or public.has_permission('staffs.create'));
create policy "roles admin manage" on public.roles for all to authenticated using (public.has_permission('roles.update') or public.has_permission('roles.create')) with check (public.has_permission('roles.update') or public.has_permission('roles.create'));
create policy "role permissions admin manage" on public.role_permissions for all to authenticated using (public.has_permission('roles.update')) with check (public.has_permission('roles.update'));
create policy "activity logs insert" on public.activity_logs for insert to authenticated with check (true);
create policy "attachments insert" on public.attachments for insert to authenticated with check (true);

insert into public.companies (company_code, company_name, status)
values ('SERI-BAKO', 'Seri Bako Malaysia Sdn. Bhd.', 'active')
on conflict (company_code) do nothing;

insert into public.branches (company_id, branch_code, branch_name, branch_type, status)
select id, 'CK', 'Central Kitchen', 'central_kitchen', 'active'
from public.companies where company_code = 'SERI-BAKO'
on conflict (company_id, branch_code) do nothing;

insert into public.permissions (permission_code, module, action, description)
values
  ('company.read','company','read','View company profile'),
  ('company.update','company','update','Update company profile'),
  ('branches.read','branches','read','View branches'),
  ('branches.create','branches','create','Create branches'),
  ('branches.update','branches','update','Update branches'),
  ('locations.read','locations','read','View locations'),
  ('locations.create','locations','create','Create locations'),
  ('locations.update','locations','update','Update locations'),
  ('staffs.read','staffs','read','View staffs'),
  ('staffs.create','staffs','create','Create staffs'),
  ('staffs.update','staffs','update','Update staffs'),
  ('roles.read','roles','read','View roles'),
  ('roles.create','roles','create','Create roles'),
  ('roles.update','roles','update','Update roles')
on conflict (permission_code) do nothing;

insert into public.roles (company_id, role_code, role_name, description, status)
select c.id, r.role_code, r.role_name, r.description, 'active'
from public.companies c
cross join (
  values
    ('admin','Admin','Full system administration'),
    ('kitchen','Kitchen','Kitchen stock, receiving, and production operations'),
    ('purchasing','Purchasing','Supplier and purchasing operations'),
    ('finance','Finance','Invoice and payment operations'),
    ('viewer','Viewer','Read-only access')
) as r(role_code, role_name, description)
where c.company_code = 'SERI-BAKO'
on conflict (company_id, role_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on true
where r.role_code = 'admin'
on conflict (role_id, permission_id) do nothing;
