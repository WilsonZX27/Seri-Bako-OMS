-- =========================================================
-- Seri Bako OMS Database Schema v1.0
-- Supabase PostgreSQL migration review draft
-- =========================================================

create extension if not exists "uuid-ossp";

do $$ begin if not exists (select 1 from pg_type where typname = 'record_status') then create type public.record_status as enum ('active','inactive','archived'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'approval_status') then create type public.approval_status as enum ('draft','pending_approval','approved','rejected','cancelled'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'document_status') then create type public.document_status as enum ('draft','submitted','approved','rejected','cancelled','closed'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'location_type') then create type public.location_type as enum ('central_kitchen','warehouse','outlet','event_booth','office','supplier','customer','other'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'stock_transaction_type_v1') then create type public.stock_transaction_type_v1 as enum ('opening_balance','purchase','production_usage','production_output','wastage','damage','missing','extra','correction','transfer','return_supplier','stock_count_adjustment'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'po_status') then create type public.po_status as enum ('draft','pending_approval','approved','sent','partial_received','received','cancelled','closed'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'receiving_status') then create type public.receiving_status as enum ('draft','posted','cancelled'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'invoice_status') then create type public.invoice_status as enum ('draft','pending_matching','pending_approval','approved','rejected','scheduled','paid','cancelled'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'payment_status') then create type public.payment_status as enum ('pending','scheduled','partially_paid','paid','overdue','cancelled'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'production_status') then create type public.production_status as enum ('planned','released','in_progress','completed','cancelled'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'count_status') then create type public.count_status as enum ('draft','submitted','approved','posted','cancelled'); end if; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- A. Admin & Company
-- =========================================================

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
create index if not exists companies_status_idx on public.companies(status);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_code text not null,
  branch_name text not null,
  branch_type public.location_type not null default 'outlet',
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
create index if not exists branches_company_idx on public.branches(company_id);
create index if not exists branches_type_idx on public.branches(branch_type);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid references public.branches(id),
  location_code text not null,
  location_name text not null,
  location_type public.location_type not null default 'warehouse',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, location_code)
);
create index if not exists locations_company_idx on public.locations(company_id);
create index if not exists locations_branch_idx on public.locations(branch_id);

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
create index if not exists staffs_company_idx on public.staffs(company_id);
create index if not exists staffs_auth_user_idx on public.staffs(auth_user_id);

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
  created_by uuid,
  unique(role_id, permission_id)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  tag_name text not null,
  tag_type text not null default 'general',
  color text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, tag_type, tag_name)
);

create table if not exists public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique(tag_id, entity_type, entity_id)
);

-- =========================================================
-- B. Master Data
-- =========================================================

create table if not exists public.item_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  category_code text not null,
  category_name text not null,
  parent_id uuid references public.item_categories(id),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, category_code)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  item_code text not null,
  autocount_code text,
  item_name text not null,
  category_id uuid references public.item_categories(id),
  base_uom text not null,
  purchase_uom text not null,
  conversion_to_base_uom numeric(18,6) not null default 1,
  cost numeric(18,6) not null default 0,
  safety_stock numeric(18,6) not null default 0,
  lead_time_days integer not null default 0,
  moq numeric(18,6) not null default 0,
  stock_control boolean not null default true,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, item_code),
  constraint items_conversion_positive check (conversion_to_base_uom > 0),
  constraint items_cost_non_negative check (cost >= 0),
  constraint items_safety_non_negative check (safety_stock >= 0)
);
create index if not exists items_company_idx on public.items(company_id);
create index if not exists items_autocount_idx on public.items(autocount_code);
create index if not exists items_category_idx on public.items(category_id);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  supplier_code text not null,
  autocount_code text,
  supplier_name text not null,
  payment_terms_days integer not null default 30,
  tax_no text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, supplier_code)
);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  contact_name text,
  phone text,
  email text,
  is_primary boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id),
  item_id uuid not null references public.items(id),
  supplier_item_code text,
  supplier_item_name text,
  purchase_uom text not null,
  conversion_to_base_uom numeric(18,6) not null default 1,
  unit_cost numeric(18,6) not null default 0,
  moq numeric(18,6) not null default 0,
  lead_time_days integer not null default 0,
  valid_from date,
  valid_to date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(supplier_id, item_id, purchase_uom),
  constraint supplier_items_cost_non_negative check (unit_cost >= 0)
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  category_code text not null,
  category_name text not null,
  parent_id uuid references public.product_categories(id),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, category_code)
);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  tax_code text not null,
  tax_name text not null,
  rate_percent numeric(7,4) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, tax_code)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  product_code text not null,
  autocount_code text,
  product_name text not null,
  category_id uuid references public.product_categories(id),
  base_uom text not null,
  selling_uom text not null,
  tax_rate_id uuid references public.tax_rates(id),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, product_code)
);

create table if not exists public.product_packaging (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  packaging_name text not null,
  packaging_uom text not null,
  qty_per_pack numeric(18,6) not null default 1,
  price numeric(18,6) not null default 0,
  min_order_qty numeric(18,6) not null default 1,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.uom_conversions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  from_uom text not null,
  to_uom text not null,
  factor numeric(18,6) not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, from_uom, to_uom),
  constraint uom_factor_positive check (factor > 0)
);

-- =========================================================
-- C. Recipe / BOM
-- =========================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  product_id uuid not null references public.products(id),
  recipe_code text,
  version integer not null default 1,
  yield_qty numeric(18,6) not null,
  yield_uom text not null,
  status public.record_status not null default 'active',
  approval_status public.approval_status not null default 'draft',
  effective_date date not null default current_date,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(product_id, version),
  constraint recipes_yield_positive check (yield_qty > 0)
);

create table if not exists public.recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_item_id uuid not null references public.items(id),
  qty_required numeric(18,6) not null,
  uom text not null,
  wastage_percent numeric(9,4) not null default 0,
  cost_per_unit numeric(18,6) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(recipe_id, ingredient_item_id),
  constraint recipe_lines_qty_positive check (qty_required > 0),
  constraint recipe_lines_wastage_non_negative check (wastage_percent >= 0)
);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version integer not null,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.recipe_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  snapshot_date date not null default current_date,
  total_cost numeric(18,6) not null default 0,
  cost_per_unit numeric(18,6) not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  created_by uuid
);

-- =========================================================
-- D. Inventory
-- =========================================================

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid references public.branches(id),
  location_id uuid references public.locations(id),
  transaction_no text not null,
  transaction_type public.stock_transaction_type_v1 not null,
  transaction_date date not null default current_date,
  reference_type text,
  reference_id uuid,
  status public.document_status not null default 'draft',
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, transaction_no)
);
create index if not exists stock_transactions_company_date_idx on public.stock_transactions(company_id, transaction_date);
create index if not exists stock_transactions_reference_idx on public.stock_transactions(reference_type, reference_id);

create table if not exists public.stock_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  stock_transaction_id uuid not null references public.stock_transactions(id) on delete cascade,
  item_id uuid not null references public.items(id),
  location_id uuid not null references public.locations(id),
  batch_no text,
  expiry_date date,
  quantity_in numeric(18,6) not null default 0,
  quantity_out numeric(18,6) not null default 0,
  unit_cost numeric(18,6) not null default 0,
  uom text not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint stl_qty_non_negative check (quantity_in >= 0 and quantity_out >= 0),
  constraint stl_one_direction check (not (quantity_in > 0 and quantity_out > 0)),
  constraint stl_has_qty check (quantity_in > 0 or quantity_out > 0)
);
create index if not exists stl_item_location_idx on public.stock_transaction_lines(item_id, location_id);
create index if not exists stl_batch_idx on public.stock_transaction_lines(batch_no);

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  location_id uuid not null references public.locations(id),
  count_no text not null,
  count_date date not null default current_date,
  status public.count_status not null default 'draft',
  submitted_at timestamptz,
  posted_stock_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, count_no)
);

create table if not exists public.stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  item_id uuid not null references public.items(id),
  theoretical_qty numeric(18,6) not null default 0,
  physical_qty numeric(18,6) not null default 0,
  variance_qty numeric(18,6) generated always as (physical_qty - theoretical_qty) stored,
  variance_percent numeric(18,6) generated always as (case when theoretical_qty = 0 then 0 else ((physical_qty - theoretical_qty) / theoretical_qty) * 100 end) stored,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(stock_count_id, item_id)
);

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  adjustment_no text not null,
  location_id uuid not null references public.locations(id),
  reason text not null,
  status public.approval_status not null default 'draft',
  posted_stock_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, adjustment_no)
);

create table if not exists public.stock_wastage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  wastage_no text not null,
  location_id uuid not null references public.locations(id),
  wastage_date date not null default current_date,
  reason text,
  status public.document_status not null default 'draft',
  posted_stock_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, wastage_no)
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  transfer_no text not null,
  from_location_id uuid not null references public.locations(id),
  to_location_id uuid not null references public.locations(id),
  transfer_date date not null default current_date,
  status public.document_status not null default 'draft',
  posted_stock_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, transfer_no),
  constraint transfer_different_locations check (from_location_id <> to_location_id)
);

create table if not exists public.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  stock_transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(18,6) not null,
  uom text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  constraint transfer_qty_positive check (quantity > 0)
);

create table if not exists public.inventory_variances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  source_type text not null,
  source_id uuid not null,
  item_id uuid not null references public.items(id),
  location_id uuid not null references public.locations(id),
  theoretical_qty numeric(18,6) not null default 0,
  actual_qty numeric(18,6) not null default 0,
  variance_qty numeric(18,6) generated always as (actual_qty - theoretical_qty) stored,
  status public.document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- =========================================================
-- E. Production
-- =========================================================

create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  plan_no text not null,
  plan_date date not null,
  location_id uuid references public.locations(id),
  status public.production_status not null default 'planned',
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, plan_no)
);

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  production_plan_id uuid references public.production_plans(id),
  job_no text not null,
  product_id uuid not null references public.products(id),
  recipe_id uuid references public.recipes(id),
  location_id uuid not null references public.locations(id),
  planned_qty numeric(18,6) not null,
  actual_output_qty numeric(18,6) not null default 0,
  uom text not null,
  status public.production_status not null default 'planned',
  posted_usage_transaction_id uuid references public.stock_transactions(id),
  posted_output_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, job_no)
);

create table if not exists public.production_job_lines (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  item_id uuid not null references public.items(id),
  planned_qty numeric(18,6) not null,
  actual_qty numeric(18,6) not null default 0,
  uom text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.production_outputs (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  product_id uuid not null references public.products(id),
  output_qty numeric(18,6) not null,
  uom text not null,
  batch_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.production_wastage (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  item_id uuid references public.items(id),
  product_id uuid references public.products(id),
  quantity numeric(18,6) not null,
  uom text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.production_variances (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  item_id uuid references public.items(id),
  planned_qty numeric(18,6) not null default 0,
  actual_qty numeric(18,6) not null default 0,
  variance_qty numeric(18,6) generated always as (actual_qty - planned_qty) stored,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- =========================================================
-- F. Purchasing
-- =========================================================

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  request_no text not null,
  requested_by uuid references public.staffs(id),
  request_date date not null default current_date,
  required_date date,
  status public.approval_status not null default 'draft',
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, request_no)
);

create table if not exists public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  item_id uuid not null references public.items(id),
  requested_qty numeric(18,6) not null,
  uom text not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  supplier_id uuid not null references public.suppliers(id),
  po_no text not null,
  order_date date not null default current_date,
  expected_delivery_date date,
  status public.po_status not null default 'draft',
  sent_at timestamptz,
  external_ref text,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, po_no)
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid not null references public.items(id),
  ordered_qty numeric(18,6) not null,
  received_qty numeric(18,6) not null default 0,
  pending_qty numeric(18,6) generated always as (ordered_qty - received_qty) stored,
  uom text not null,
  unit_cost numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.goods_receivings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  purchase_order_id uuid references public.purchase_orders(id),
  supplier_id uuid not null references public.suppliers(id),
  grn_no text not null,
  received_date date not null default current_date,
  location_id uuid not null references public.locations(id),
  status public.receiving_status not null default 'draft',
  posted_stock_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, grn_no)
);

create table if not exists public.goods_receiving_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receiving_id uuid not null references public.goods_receivings(id) on delete cascade,
  purchase_order_line_id uuid references public.purchase_order_lines(id),
  item_id uuid not null references public.items(id),
  received_qty numeric(18,6) not null,
  uom text not null,
  unit_cost numeric(18,6) not null default 0,
  batch_no text,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- =========================================================
-- G. Finance
-- =========================================================

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  supplier_id uuid not null references public.suppliers(id),
  purchase_order_id uuid references public.purchase_orders(id),
  invoice_no text not null,
  invoice_date date not null,
  due_date date not null,
  status public.invoice_status not null default 'draft',
  total_amount numeric(18,2) not null default 0,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(supplier_id, invoice_no)
);

create table if not exists public.supplier_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  supplier_invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  purchase_order_line_id uuid references public.purchase_order_lines(id),
  goods_receiving_line_id uuid references public.goods_receiving_lines(id),
  item_id uuid not null references public.items(id),
  invoice_qty numeric(18,6) not null,
  uom text not null,
  unit_cost numeric(18,6) not null default 0,
  line_amount numeric(18,2) generated always as (invoice_qty * unit_cost) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.supplier_credit_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  supplier_id uuid not null references public.suppliers(id),
  supplier_invoice_id uuid references public.supplier_invoices(id),
  credit_note_no text not null,
  credit_note_date date not null,
  amount numeric(18,2) not null,
  reason text,
  status public.document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(supplier_id, credit_note_no)
);

create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  schedule_no text not null,
  week_start date not null,
  week_end date not null,
  status public.payment_status not null default 'pending',
  total_amount numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique(company_id, schedule_no)
);

create table if not exists public.payment_schedule_lines (
  id uuid primary key default gen_random_uuid(),
  payment_schedule_id uuid not null references public.payment_schedules(id) on delete cascade,
  supplier_invoice_id uuid not null references public.supplier_invoices(id),
  supplier_id uuid not null references public.suppliers(id),
  due_date date not null,
  amount numeric(18,2) not null,
  paid_amount numeric(18,2) not null default 0,
  status public.payment_status not null default 'pending',
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.three_way_matches (
  id uuid primary key default gen_random_uuid(),
  supplier_invoice_line_id uuid not null references public.supplier_invoice_lines(id) on delete cascade,
  purchase_order_line_id uuid references public.purchase_order_lines(id),
  goods_receiving_line_id uuid references public.goods_receiving_lines(id),
  po_qty numeric(18,6) not null default 0,
  received_qty numeric(18,6) not null default 0,
  invoice_qty numeric(18,6) not null default 0,
  is_matched boolean generated always as (invoice_qty <= received_qty) stored,
  status public.document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- =========================================================
-- H. System
-- =========================================================

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  status public.approval_status not null default 'pending_approval',
  requested_by uuid references public.staffs(id),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
create index if not exists approvals_entity_idx on public.approvals(entity_type, entity_id);

create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.approvals(id) on delete cascade,
  step_no integer not null,
  approver_staff_id uuid references public.staffs(id),
  approver_role_id uuid references public.roles(id),
  status public.approval_status not null default 'pending_approval',
  decision_at timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
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
create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id);

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
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);

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
create index if not exists audit_logs_table_record_idx on public.audit_logs(table_name, record_id);

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

-- =========================================================
-- Triggers
-- =========================================================

do $$
declare r record;
begin
  for r in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_%I_updated_at on %I.%I', r.table_name, r.table_schema, r.table_name);
    execute format('create trigger set_%I_updated_at before update on %I.%I for each row execute function public.set_updated_at()', r.table_name, r.table_schema, r.table_name);
  end loop;
end $$;

-- =========================================================
-- Views
-- =========================================================

create or replace view public.stock_balances_view as
select
  i.company_id,
  stl.item_id,
  i.item_code,
  i.item_name,
  stl.location_id,
  l.location_code,
  l.location_name,
  i.base_uom,
  coalesce(sum(stl.quantity_in), 0) as total_quantity_in,
  coalesce(sum(stl.quantity_out), 0) as total_quantity_out,
  coalesce(sum(stl.quantity_in - stl.quantity_out), 0) as current_stock,
  i.safety_stock,
  coalesce(sum(stl.quantity_in - stl.quantity_out), 0) < i.safety_stock as is_low_stock
from public.items i
left join public.stock_transaction_lines stl on stl.item_id = i.id and stl.deleted_at is null
left join public.locations l on l.id = stl.location_id
group by i.company_id, stl.item_id, i.item_code, i.item_name, stl.location_id, l.location_code, l.location_name, i.base_uom, i.safety_stock;

create or replace view public.stock_card_view as
select
  st.company_id,
  st.transaction_date,
  st.transaction_no,
  st.transaction_type,
  st.reference_type,
  st.reference_id,
  stl.item_id,
  i.item_code,
  i.item_name,
  stl.location_id,
  l.location_code,
  stl.quantity_in,
  stl.quantity_out,
  stl.unit_cost,
  stl.batch_no,
  stl.expiry_date,
  st.created_at
from public.stock_transactions st
join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
join public.items i on i.id = stl.item_id
join public.locations l on l.id = stl.location_id
where st.deleted_at is null and stl.deleted_at is null;

create or replace view public.supplier_outstanding_view as
select
  si.company_id,
  si.supplier_id,
  s.supplier_code,
  s.supplier_name,
  sum(si.total_amount) as invoice_amount,
  coalesce(sum(psl.paid_amount), 0) as paid_amount,
  sum(si.total_amount) - coalesce(sum(psl.paid_amount), 0) as outstanding_amount
from public.supplier_invoices si
join public.suppliers s on s.id = si.supplier_id
left join public.payment_schedule_lines psl on psl.supplier_invoice_id = si.id and psl.deleted_at is null
where si.status in ('approved','scheduled','paid') and si.deleted_at is null
group by si.company_id, si.supplier_id, s.supplier_code, s.supplier_name;

create or replace view public.weekly_cash_required_view as
select
  ps.company_id,
  ps.week_start,
  ps.week_end,
  psl.supplier_id,
  s.supplier_name,
  sum(psl.amount - psl.paid_amount) as cash_required
from public.payment_schedules ps
join public.payment_schedule_lines psl on psl.payment_schedule_id = ps.id
join public.suppliers s on s.id = psl.supplier_id
where ps.deleted_at is null
  and psl.deleted_at is null
  and psl.status in ('pending','scheduled','partially_paid','overdue')
group by ps.company_id, ps.week_start, ps.week_end, psl.supplier_id, s.supplier_name;

create or replace view public.low_stock_view as
select *
from public.stock_balances_view
where is_low_stock = true;

-- =========================================================
-- Seed Data Examples
-- =========================================================

insert into public.companies (company_code, company_name, registration_no, status)
values ('SERI-BAKO', 'Seri Bako Malaysia Sdn. Bhd.', null, 'active')
on conflict (company_code) do nothing;

insert into public.branches (company_id, branch_code, branch_name, branch_type, status)
select id, 'CK', 'Central Kitchen', 'central_kitchen', 'active'
from public.companies where company_code = 'SERI-BAKO'
on conflict (company_id, branch_code) do nothing;

insert into public.locations (company_id, branch_id, location_code, location_name, location_type, status)
select c.id, b.id, 'CK-STORE', 'Central Kitchen Store', 'central_kitchen', 'active'
from public.companies c
join public.branches b on b.company_id = c.id and b.branch_code = 'CK'
where c.company_code = 'SERI-BAKO'
on conflict (company_id, location_code) do nothing;

insert into public.roles (company_id, role_code, role_name)
select id, role_code, role_name
from public.companies
cross join (values
  ('admin', 'Admin'),
  ('operations_manager', 'Operations Manager'),
  ('kitchen_manager', 'Kitchen Manager'),
  ('inventory_controller', 'Inventory Controller'),
  ('purchasing_manager', 'Purchasing Manager'),
  ('finance_manager', 'Finance Manager'),
  ('viewer', 'Viewer')
) as r(role_code, role_name)
where company_code = 'SERI-BAKO'
on conflict (company_id, role_code) do nothing;

