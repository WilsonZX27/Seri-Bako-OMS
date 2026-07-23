-- Sprint 7.23.8.4: production-job drafts are one database-owned aggregate.
alter table public.production_jobs add column if not exists idempotency_key uuid;
create unique index if not exists production_jobs_idempotency_key_idx
  on public.production_jobs(company_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

create or replace function public.create_production_job_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  existing public.production_jobs%rowtype;
  recipe record;
  ingredient record;
  job_id uuid;
  document_id uuid;
  output_item_id uuid;
  job_no text := nullif(trim(p_payload->>'production_job_no'), '');
  branch_id uuid := nullif(p_payload->>'branch_id', '')::uuid;
  location_id uuid := nullif(p_payload->>'location_id', '')::uuid;
  recipe_id uuid := nullif(p_payload->>'recipe_id', '')::uuid;
  production_date date := coalesce(nullif(p_payload->>'production_date', '')::date, current_date);
  planned_qty numeric := nullif(p_payload->>'planned_output_qty', '')::numeric;
  output_uom text := nullif(trim(p_payload->>'output_uom'), '');
  priority text := coalesce(nullif(trim(p_payload->>'priority'), ''), 'normal');
  idem uuid := nullif(p_payload->>'idempotency_key', '')::uuid;
  factor numeric;
  total_cost numeric := 0;
  line_qty numeric;
  line_cost numeric;
  unit_cost numeric;
  available_qty numeric;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('production.create') then
    raise exception 'Missing permission: production.create';
  end if;
  if job_no is null or branch_id is null or location_id is null or recipe_id is null
    or planned_qty is null or planned_qty <= 0 or output_uom is null then
    raise exception 'Production number, branch, location, recipe, positive output quantity, and UOM are required.';
  end if;
  if priority not in ('low', 'normal', 'urgent', 'critical') then
    raise exception 'Invalid production priority.';
  end if;
  if not public.can_access_inventory_branch(actor.company_id, branch_id)
    or not exists (
      select 1 from public.branches b
      where b.id = branch_id and b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null
    )
    or not exists (
      select 1 from public.locations l
      where l.id = location_id and l.company_id = actor.company_id and l.branch_id = branch_id
        and l.status = 'active' and l.deleted_at is null
    ) then
    raise exception 'Production branch or location is outside your active company scope.';
  end if;

  select * into existing
  from public.production_jobs
  where company_id = actor.company_id and idempotency_key = idem and idem is not null and deleted_at is null
  for update;
  if existing.id is not null then
    return jsonb_build_object('id', existing.id, 'production_job_no', existing.production_job_no, 'document_id', existing.document_id, 'idempotent', true);
  end if;

  select r.id, r.recipe_no, r.product_id, r.yield_qty, r.yield_unit,
         p.product_code, p.product_name, p.category as product_category
  into recipe
  from public.recipes r
  join public.products p on p.id = r.product_id and p.company_id = actor.company_id and p.status = 'active' and p.deleted_at is null
  where r.id = recipe_id and r.company_id = actor.company_id and r.status = 'active' and r.deleted_at is null
  for update of r;
  if recipe.id is null or recipe.yield_qty is null or recipe.yield_qty <= 0 then
    raise exception 'An active company recipe with a positive yield is required.';
  end if;
  if not exists (
    select 1
    from public.recipe_lines rl
    join public.items i on i.id = rl.ingredient_item_id and i.company_id = actor.company_id and i.status = 'active' and i.deleted_at is null
    where rl.recipe_id = recipe.id
  ) then
    raise exception 'The selected recipe must contain active company ingredients.';
  end if;
  if exists (
    select 1
    from public.recipe_lines rl
    left join public.items i on i.id = rl.ingredient_item_id
    where rl.recipe_id = recipe.id
      and (i.id is null or i.company_id <> actor.company_id or i.status <> 'active' or i.deleted_at is not null
        or coalesce(rl.base_qty_required, 0) <= 0 or coalesce(nullif(trim(coalesce(rl.base_uom, rl.recipe_uom, rl.unit)), ''), '') = '')
  ) then
    raise exception 'Every recipe line must use an active company item with a positive quantity and UOM.';
  end if;

  factor := planned_qty / recipe.yield_qty;
  for ingredient in
    select rl.ingredient_item_id, rl.base_qty_required, coalesce(rl.base_uom, rl.recipe_uom, rl.unit) as uom,
           coalesce(rl.cost_per_unit, 0) as unit_cost, i.item_code, i.item_name
    from public.recipe_lines rl
    join public.items i on i.id = rl.ingredient_item_id
    where rl.recipe_id = recipe.id
    order by i.item_code, rl.id
  loop
    total_cost := total_cost + (ingredient.base_qty_required * factor * ingredient.unit_cost);
  end loop;
  unit_cost := total_cost / planned_qty;

  select id into output_item_id
  from public.items
  where company_id = actor.company_id and item_code = recipe.product_code and deleted_at is null
  for update;
  if output_item_id is null then
    insert into public.items (company_id, item_code, item_name, category, purchase_unit, base_unit, conversion_to_base_unit, cost, status)
    values (actor.company_id, recipe.product_code, recipe.product_name, coalesce(recipe.product_category, 'Finished Goods'), output_uom, output_uom, 1, unit_cost, 'active')
    returning id into output_item_id;
  end if;

  job_id := gen_random_uuid();
  document_id := gen_random_uuid();
  insert into public.documents (id, company_id, document_no, document_type, title, status, approval_status, current_step, related_entity_type, related_entity_id, created_by, updated_by)
  values (document_id, actor.company_id, job_no, 'production_job', 'Production Job ' || job_no || ' - ' || recipe.product_name,
    'draft', 'draft', 'Draft production job', 'production_job', job_id, actor.id, actor.id);
  insert into public.production_jobs (id, company_id, branch_id, location_id, production_job_no, production_date, recipe_id, product_id, output_item_id, planned_output_qty, output_uom, priority, remarks, document_id, created_by, updated_by, idempotency_key)
  values (job_id, actor.company_id, branch_id, location_id, job_no, production_date, recipe.id, recipe.product_id, output_item_id,
    planned_qty, output_uom, priority, nullif(trim(p_payload->>'remarks'), ''), document_id, actor.id, actor.id, idem);
  for ingredient in
    select rl.ingredient_item_id, rl.base_qty_required, coalesce(rl.base_uom, rl.recipe_uom, rl.unit) as uom,
           coalesce(rl.cost_per_unit, 0) as unit_cost, i.item_code, i.item_name
    from public.recipe_lines rl
    join public.items i on i.id = rl.ingredient_item_id
    where rl.recipe_id = recipe.id
    order by i.item_code, rl.id
  loop
    line_qty := ingredient.base_qty_required * factor;
    line_cost := line_qty * ingredient.unit_cost;
    select coalesce(sum(st.quantity_in - st.quantity_out), 0) into available_qty
    from public.stock_transactions st
    where st.item_id = ingredient.ingredient_item_id and st.location_id = location_id and st.status = 'posted';
    insert into public.production_job_ingredient_lines (production_job_id, item_id, item_code, item_name, required_qty, actual_qty, uom, unit_cost, line_cost, stock_available_qty, variance_qty)
    values (job_id, ingredient.ingredient_item_id, ingredient.item_code, ingredient.item_name, line_qty, line_qty, ingredient.uom,
      ingredient.unit_cost, line_cost, available_qty, available_qty - line_qty);
  end loop;
  insert into public.production_job_output_lines (production_job_id, product_id, item_id, output_code, output_name, planned_qty, actual_qty, uom, unit_cost, line_cost)
  values (job_id, recipe.product_id, output_item_id, recipe.product_code, recipe.product_name, planned_qty, planned_qty, output_uom, unit_cost, total_cost);
  insert into public.document_revisions (document_id, revision_no, change_summary, changed_by)
  values (document_id, 1, 'Initial production job created.', actor.id);
  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'production_job', job_id, 'created', 'Production Job ' || job_no || ' created from ' || recipe.recipe_no,
    jsonb_build_object('document_id', document_id, 'recipe_id', recipe.id), actor.id);
  return jsonb_build_object('id', job_id, 'production_job_no', job_no, 'document_id', document_id, 'idempotent', false);
end $$;

revoke all on function public.create_production_job_atomic(jsonb) from public, anon;
grant execute on function public.create_production_job_atomic(jsonb) to authenticated;
