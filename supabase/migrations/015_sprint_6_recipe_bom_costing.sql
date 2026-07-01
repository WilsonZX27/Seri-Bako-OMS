-- =========================================================
-- Seri Bako OMS
-- Sprint 6: Recipe / BOM + Costing
-- =========================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'recipe_status') then
    create type public.recipe_status as enum ('draft','pending_approval','approved','active','rejected','archived');
  end if;
end $$;

alter table public.recipes
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists document_id uuid references public.documents(id),
  add column if not exists recipe_no text,
  add column if not exists approval_status public.approval_status not null default 'draft',
  add column if not exists remarks text,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists updated_by uuid references public.profiles(id),
  add column if not exists deleted_at timestamptz;

update public.recipes
set
  recipe_no = coalesce(recipe_no, 'RCP-' || lpad(version::text, 5, '0') || '-' || substring(id::text, 1, 4)),
  remarks = coalesce(remarks, remark),
  approval_status = case
    when status::text = 'active' then 'approved'::public.approval_status
    else approval_status
  end
where recipe_no is null or remarks is null;

alter table public.recipes
  alter column recipe_no set not null;

alter table public.recipes
  drop constraint if exists recipes_recipe_no_unique;

alter table public.recipes
  add constraint recipes_recipe_no_unique unique (recipe_no);

alter table public.recipes
  drop constraint if exists recipes_status_valid;

alter table public.recipes
  alter column status drop default;

alter table public.recipes
  alter column status type public.recipe_status
  using case
    when status::text = 'active' then 'active'::public.recipe_status
    when status::text = 'inactive' then 'archived'::public.recipe_status
    else 'draft'::public.recipe_status
  end;

alter table public.recipes
  alter column status set default 'draft';

create unique index if not exists recipes_one_active_per_product_idx
on public.recipes (product_id)
where status = 'active' and deleted_at is null;

create index if not exists recipes_recipe_no_idx on public.recipes using btree (recipe_no);
create index if not exists recipes_approval_status_idx on public.recipes using btree (approval_status);
create index if not exists recipes_document_id_idx on public.recipes using btree (document_id);

alter table public.recipe_lines
  add column if not exists recipe_uom text,
  add column if not exists base_uom text,
  add column if not exists conversion_factor numeric(18, 8) not null default 1,
  add column if not exists base_qty_required numeric(18, 8) not null default 0,
  add column if not exists remarks text,
  add column if not exists updated_at timestamptz not null default now();

update public.recipe_lines rl
set
  recipe_uom = coalesce(rl.recipe_uom, rl.unit),
  base_uom = coalesce(rl.base_uom, i.base_unit, rl.unit),
  conversion_factor = case when rl.conversion_factor > 0 then rl.conversion_factor else 1 end,
  base_qty_required = case when rl.base_qty_required > 0 then rl.base_qty_required else rl.qty_required * coalesce(nullif(rl.conversion_factor, 0), 1) end
from public.items i
where i.id = rl.ingredient_item_id;

alter table public.recipe_lines
  alter column recipe_uom set not null,
  alter column base_uom set not null,
  drop constraint if exists recipe_lines_conversion_factor_positive,
  drop constraint if exists recipe_lines_base_qty_required_positive;

alter table public.recipe_lines
  add constraint recipe_lines_conversion_factor_positive check (conversion_factor > 0),
  add constraint recipe_lines_base_qty_required_positive check (base_qty_required > 0);

drop trigger if exists set_recipe_lines_updated_at on public.recipe_lines;
create trigger set_recipe_lines_updated_at
before update on public.recipe_lines
for each row
execute function public.set_updated_at();

create table if not exists public.recipe_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  snapshot_no integer not null default 1,
  total_ingredient_cost numeric(14, 4) not null default 0,
  wastage_adjusted_cost numeric(14, 4) not null default 0,
  cost_per_finished_unit numeric(14, 6) not null default 0,
  cost_per_pack numeric(14, 6),
  packaging_name text,
  yield_qty numeric(14, 4) not null default 1,
  yield_uom text not null default 'pcs',
  captured_at timestamptz not null default now(),
  captured_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint recipe_cost_snapshots_snapshot_positive check (snapshot_no > 0),
  constraint recipe_cost_snapshots_cost_non_negative check (
    total_ingredient_cost >= 0
    and wastage_adjusted_cost >= 0
    and cost_per_finished_unit >= 0
    and (cost_per_pack is null or cost_per_pack >= 0)
  )
);

create index if not exists recipe_cost_snapshots_recipe_id_idx
on public.recipe_cost_snapshots using btree (recipe_id, snapshot_no desc);

alter table public.recipe_cost_snapshots enable row level security;

drop policy if exists "Authenticated users can read recipes" on public.recipes;
drop policy if exists "Admin and purchasing can insert recipes" on public.recipes;
drop policy if exists "Admin and purchasing can update recipes" on public.recipes;
drop policy if exists "Admin can delete recipes" on public.recipes;
drop policy if exists "recipes read" on public.recipes;
create policy "recipes read" on public.recipes
for select to authenticated
using (public.has_permission('recipes.read'));

drop policy if exists "recipes create" on public.recipes;
create policy "recipes create" on public.recipes
for insert to authenticated
with check (public.has_permission('recipes.create'));

drop policy if exists "recipes update" on public.recipes;
create policy "recipes update" on public.recipes
for update to authenticated
using (public.has_permission('recipes.update'))
with check (public.has_permission('recipes.update'));

drop policy if exists "Authenticated users can read recipe lines" on public.recipe_lines;
drop policy if exists "Admin and purchasing can insert recipe lines" on public.recipe_lines;
drop policy if exists "Admin and purchasing can update recipe lines" on public.recipe_lines;
drop policy if exists "Admin and purchasing can delete recipe lines" on public.recipe_lines;
drop policy if exists "recipe lines read" on public.recipe_lines;
create policy "recipe lines read" on public.recipe_lines
for select to authenticated
using (public.has_permission('recipes.read'));

drop policy if exists "recipe lines create" on public.recipe_lines;
create policy "recipe lines create" on public.recipe_lines
for insert to authenticated
with check (public.has_permission('recipes.create') or public.has_permission('recipes.update'));

drop policy if exists "recipe lines update" on public.recipe_lines;
create policy "recipe lines update" on public.recipe_lines
for update to authenticated
using (public.has_permission('recipes.update'))
with check (public.has_permission('recipes.update'));

drop policy if exists "recipe lines delete" on public.recipe_lines;
create policy "recipe lines delete" on public.recipe_lines
for delete to authenticated
using (public.has_permission('recipes.update'));

drop policy if exists "recipe cost snapshots read" on public.recipe_cost_snapshots;
create policy "recipe cost snapshots read" on public.recipe_cost_snapshots
for select to authenticated
using (public.has_permission('recipes.read'));

drop policy if exists "recipe cost snapshots create" on public.recipe_cost_snapshots;
create policy "recipe cost snapshots create" on public.recipe_cost_snapshots
for insert to authenticated
with check (public.has_permission('recipes.update') or public.has_permission('recipes.approve'));

insert into public.permissions (permission_code, module, action, description)
values
  ('recipes.read','recipes','read','Read recipe and BOM records'),
  ('recipes.create','recipes','create','Create recipe and BOM records'),
  ('recipes.update','recipes','update','Update draft recipe and BOM records'),
  ('recipes.submit','recipes','submit','Submit recipes for approval'),
  ('recipes.approve','recipes','approve','Approve, reject, and activate recipes'),
  ('recipes.archive','recipes','archive','Archive active or obsolete recipes')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'recipes'
where r.role_code in ('admin','kitchen','purchasing')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'recipes.read'
where r.role_code in ('finance','viewer')
on conflict (role_id, permission_id) do nothing;
