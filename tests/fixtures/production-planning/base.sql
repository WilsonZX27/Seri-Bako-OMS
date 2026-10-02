-- Disposable PostgreSQL fixture: existing tables only; new schema/functions are loaded verbatim.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
grant usage on schema public,auth to authenticated,service_role;
grant execute on all functions in schema auth to authenticated,service_role;
create type public.record_status as enum('active','inactive');
create type public.outlet_daily_record_status as enum('draft','morning_recorded','evening_completed','reviewed','void');
create type public.outlet_daily_wastage_reason as enum('unsold','damaged','expired','quality_issue','staff_meal','other');
create table public.companies(id uuid primary key, company_name text);
create table public.branches(id uuid primary key,company_id uuid references companies(id),branch_type text,branch_name text,status text default 'active',deleted_at timestamptz);
create table public.staffs(id uuid primary key,company_id uuid references companies(id),auth_user_id uuid,default_branch_id uuid,status text default 'active',deleted_at timestamptz);
create table public.roles(id uuid primary key,company_id uuid references companies(id),role_code text,status text default 'active',deleted_at timestamptz);
create table public.staff_roles(staff_id uuid references staffs(id),role_id uuid references roles(id),is_primary boolean default true,effective_from date default '2020-01-01',effective_to date);
create table public.staff_branches(staff_id uuid references staffs(id),branch_id uuid references branches(id));
create table public.permissions(id uuid primary key default gen_random_uuid(),permission_code text unique,module text,action text,description text);
create table public.role_permissions(role_id uuid references roles(id),permission_id uuid references permissions(id),primary key(role_id,permission_id));
create function public.has_permission(code text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from staffs s join staff_roles sr on sr.staff_id=s.id join roles r on r.id=sr.role_id
 left join role_permissions rp on rp.role_id=r.id left join permissions p on p.id=rp.permission_id
 where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and sr.is_primary
 and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date) and (r.role_code='super_admin' or p.permission_code=code)) $$;
create table public.products(id uuid primary key,company_id uuid references companies(id),product_code text,product_name text,category text default 'STEAMED CAKE',selling_unit text default 'PCS',display_order integer default 1,status text default 'active',deleted_at timestamptz);
create table public.production_jobs(id uuid primary key);
create table public.branch_supply_routes(id uuid primary key default gen_random_uuid(),company_id uuid,source_branch_id uuid,destination_branch_id uuid,is_primary boolean default true,status text default 'active',effective_from date default '2020-01-01',effective_to date);
create function public.can_access_outlet_daily_branch(b uuid) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.staffs s where s.auth_user_id=auth.uid() and s.status='active' and (public.has_permission('outlet_daily_record.view_all') or s.default_branch_id=b)) $$;
create table public.outlet_daily_records(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies(id),branch_id uuid not null references branches(id),source_branch_id uuid,record_date date not null,status public.outlet_daily_record_status default 'draft',submitted_by uuid,reviewed_by uuid,reviewed_at timestamptz,void_reason text,voided_by uuid,voided_at timestamptz,notes text,created_by uuid,updated_by uuid,created_at timestamptz default now(),updated_at timestamptz default now(),pos_total_sales numeric,sales_variance_reason text,sales_review_status text default 'not_required');
create unique index outlet_daily_active_branch_date_idx on outlet_daily_records(company_id,branch_id,record_date) where status<>'void';
create table public.outlet_daily_record_lines(id uuid primary key default gen_random_uuid(),record_id uuid references outlet_daily_records(id),product_id uuid references products(id),qty_sent numeric default 0,qty_sent_estimated numeric,qty_sent_confirmed boolean default false,qty_sent_source text default 'unavailable',morning_received_qty numeric default 0,morning_received_provided boolean default false,evening_leftover_qty numeric default 0,wastage_qty numeric default 0,wastage_reason public.outlet_daily_wastage_reason,notes text,created_at timestamptz default now(),updated_at timestamptz default now(),unique(record_id,product_id));
create table public.outlet_daily_sales_breakdowns(id uuid primary key default gen_random_uuid(),record_id uuid references outlet_daily_records(id),channel text,amount numeric,created_at timestamptz default now(),updated_at timestamptz default now(),unique(record_id,channel));
create table public.notifications(id uuid primary key default gen_random_uuid(),company_id uuid,recipient_role_id uuid,branch_id uuid,title text,message text,action_url text,entity_type text,entity_id uuid,created_by uuid);
