-- =========================================================
-- Seri Bako OMS
-- Milestone 2: Recipe / BOM
-- =========================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null references public.products(id) on delete restrict,
  version integer not null default 1,
  yield_qty numeric(12, 4) not null,
  yield_unit text not null,
  status public.item_status not null default 'active',
  effective_date date not null default current_date,
  remark text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recipes_version_positive check (version > 0),
  constraint recipes_yield_qty_positive check (yield_qty > 0),
  constraint recipes_yield_unit_not_empty check (length(trim(yield_unit)) > 0),
  constraint recipes_product_version_unique unique (product_id, version)
);

create index if not exists recipes_product_id_idx
on public.recipes using btree (product_id);

create index if not exists recipes_status_idx
on public.recipes using btree (status);

create index if not exists recipes_effective_date_idx
on public.recipes using btree (effective_date);

create table if not exists public.recipe_lines (
  id uuid primary key default gen_random_uuid(),

  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_item_id uuid not null references public.items(id) on delete restrict,

  qty_required numeric(12, 4) not null,
  unit text not null,
  wastage_percent numeric(7, 4) not null default 0,
  cost_per_unit numeric(12, 4) not null default 0,

  created_at timestamptz not null default now(),

  constraint recipe_lines_qty_required_positive check (qty_required > 0),
  constraint recipe_lines_unit_not_empty check (length(trim(unit)) > 0),
  constraint recipe_lines_wastage_non_negative check (wastage_percent >= 0),
  constraint recipe_lines_cost_non_negative check (cost_per_unit >= 0),
  constraint recipe_lines_unique_ingredient unique (recipe_id, ingredient_item_id)
);

create index if not exists recipe_lines_recipe_id_idx
on public.recipe_lines using btree (recipe_id);

create index if not exists recipe_lines_ingredient_item_id_idx
on public.recipe_lines using btree (ingredient_item_id);

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

alter table public.recipes enable row level security;
alter table public.recipe_lines enable row level security;

drop policy if exists "Authenticated users can read recipes" on public.recipes;
create policy "Authenticated users can read recipes"
on public.recipes
for select
to authenticated
using (true);

drop policy if exists "Admin and purchasing can insert recipes" on public.recipes;
create policy "Admin and purchasing can insert recipes"
on public.recipes
for insert
to authenticated
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can update recipes" on public.recipes;
create policy "Admin and purchasing can update recipes"
on public.recipes
for update
to authenticated
using (public.has_role(array['admin', 'purchasing']))
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin can delete recipes" on public.recipes;
create policy "Admin can delete recipes"
on public.recipes
for delete
to authenticated
using (public.has_role(array['admin']));

drop policy if exists "Authenticated users can read recipe lines" on public.recipe_lines;
create policy "Authenticated users can read recipe lines"
on public.recipe_lines
for select
to authenticated
using (true);

drop policy if exists "Admin and purchasing can insert recipe lines" on public.recipe_lines;
create policy "Admin and purchasing can insert recipe lines"
on public.recipe_lines
for insert
to authenticated
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can update recipe lines" on public.recipe_lines;
create policy "Admin and purchasing can update recipe lines"
on public.recipe_lines
for update
to authenticated
using (public.has_role(array['admin', 'purchasing']))
with check (public.has_role(array['admin', 'purchasing']));

drop policy if exists "Admin and purchasing can delete recipe lines" on public.recipe_lines;
create policy "Admin and purchasing can delete recipe lines"
on public.recipe_lines
for delete
to authenticated
using (public.has_role(array['admin', 'purchasing']));
