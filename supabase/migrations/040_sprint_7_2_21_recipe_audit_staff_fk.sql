-- Sprint 7.2.21A: recipe actions use the staff identity, like production jobs.
-- Keep legacy audit values readable while enforcing the staff FK for new writes.

alter table public.recipes
  drop constraint if exists recipes_created_by_fkey,
  drop constraint if exists recipes_updated_by_fkey;

alter table public.recipes
  add constraint recipes_created_by_fkey foreign key (created_by) references public.staffs(id) on delete set null not valid,
  add constraint recipes_updated_by_fkey foreign key (updated_by) references public.staffs(id) on delete set null not valid;

alter table public.recipe_cost_snapshots
  drop constraint if exists recipe_cost_snapshots_captured_by_fkey,
  drop constraint if exists recipe_cost_snapshots_created_by_fkey;

alter table public.recipe_cost_snapshots
  add constraint recipe_cost_snapshots_captured_by_fkey foreign key (captured_by) references public.staffs(id) on delete set null not valid,
  add constraint recipe_cost_snapshots_created_by_fkey foreign key (created_by) references public.staffs(id) on delete set null not valid;
