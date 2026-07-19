-- Sprint 7.23.5.1: daily dispatch fields, recipe boundary, and canonical product ordering.

alter table public.products add column if not exists display_order integer not null default 9999;
alter table public.products drop constraint if exists products_display_order_positive;
alter table public.products add constraint products_display_order_positive check (display_order > 0);
create index if not exists products_operational_order_idx on public.products (category, display_order, product_code);

update public.products
set display_order = substring(product_code from '[0-9]+$')::integer
where product_code ~ '^(SC(0[1-9]|1[0-6])|RB0[1-4]|SRR0[1-4]|BI0[1-7]|RT0[1-5]|BB0[1-8]|PKG0[1-6])$';

alter table public.outlet_daily_record_lines add column if not exists qty_sent numeric(18,4) not null default 0;
alter table public.outlet_daily_record_lines drop constraint if exists outlet_daily_qty_sent_nonnegative;
alter table public.outlet_daily_record_lines add constraint outlet_daily_qty_sent_nonnegative check (qty_sent >= 0);

insert into public.permissions (permission_code, module, action, description)
values ('outlet_daily_record.qty_sent', 'outlet_daily_record', 'qty_sent', 'Record Central Kitchen quantities sent to assigned outlets')
on conflict (permission_code) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.role_code = 'kitchen' and r.status = 'active' and r.deleted_at is null
  and p.permission_code in ('outlet_daily_record.view', 'outlet_daily_record.create', 'outlet_daily_record.qty_sent')
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code = 'kitchen' and p.permission_code = 'outlet_daily_record.update';

-- Recipe/BOM master data is visible only to Owner and Finance. Owner remains
-- protected by its wildcard resolution; Finance receives read-only access.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and p.module = 'recipes' and r.role_code not in ('super_admin', 'finance');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.role_code = 'finance' and r.status = 'active' and r.deleted_at is null
  and p.permission_code = 'recipes.read'
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code = 'finance' and p.module = 'recipes' and p.permission_code <> 'recipes.read';

delete from public.staff_permission_overrides spo
using public.permissions p
where spo.permission_id = p.id and p.module = 'recipes' and spo.effect = 'allow'
  and not exists (
    select 1 from public.staff_roles sr join public.roles r on r.id = sr.role_id
    where sr.staff_id = spo.staff_id and r.role_code in ('super_admin', 'finance')
      and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  );

-- Production users get only the active recipe snapshot required to prepare a
-- production job. Direct recipe tables remain protected by recipe RLS.
create or replace function public.get_production_recipe_options()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select s.company_id from public.staffs s
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
      and public.has_permission('production.view')
    limit 1
  ), options as (
    select r.id, r.recipe_no, r.product_id, p.product_code, p.product_name, p.display_order,
      r.yield_qty, r.yield_unit,
      coalesce((select rcs.cost_per_finished_unit from public.recipe_cost_snapshots rcs
        where rcs.recipe_id = r.id order by rcs.snapshot_no desc limit 1), 0) as unit_cost,
      coalesce((select jsonb_agg(jsonb_build_object(
        'item_id', rl.ingredient_item_id,
        'item_code', i.item_code,
        'item_name', i.item_name,
        'qty_per_yield', rl.base_qty_required,
        'uom', coalesce(rl.base_uom, rl.recipe_uom, rl.unit),
        'unit_cost', rl.cost_per_unit
      ) order by i.item_code)
      from public.recipe_lines rl join public.items i on i.id = rl.ingredient_item_id
      where rl.recipe_id = r.id), '[]'::jsonb) as lines
    from actor a
    join public.recipes r on r.status = 'active' and r.deleted_at is null
      and (r.company_id = a.company_id or r.company_id is null)
    join public.products p on p.id = r.product_id and p.status = 'active'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'recipe_no', recipe_no, 'product_id', product_id,
    'product_code', product_code, 'product_name', product_name,
    'yield_qty', yield_qty, 'yield_unit', yield_unit,
    'cost_per_finished_unit', unit_cost, 'lines', lines
  ) order by
    case
      when product_code ~ '^SC' then 1 when product_code ~ '^RB' then 2
      when product_code ~ '^SRR' then 3 when product_code ~ '^BI' then 4
      when product_code ~ '^RT' then 5 when product_code ~ '^BB' then 6
      when product_code ~ '^PKG' then 7 else 99 end,
    display_order, product_code), '[]'::jsonb)
  from options
$$;

create or replace function public.save_outlet_daily_record(
  p_record_id uuid,
  p_branch_id uuid,
  p_record_date date,
  p_notes text,
  p_lines jsonb,
  p_target_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  existing public.outlet_daily_records%rowtype;
  saved_id uuid;
  line jsonb;
  line_product_id uuid;
  sent_qty numeric;
  received_qty numeric;
  line_wastage_qty numeric;
  line_reason text;
  line_notes text;
  can_edit_outlet boolean := public.has_permission('outlet_daily_record.update');
  can_edit_sent boolean := public.has_permission('outlet_daily_record.qty_sent');
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  if p_record_id is null and not public.has_permission('outlet_daily_record.create') then
    raise exception 'Missing permission: outlet_daily_record.create';
  elsif p_record_id is not null and not can_edit_outlet and not can_edit_sent then
    raise exception 'Missing permission to update this outlet daily record.';
  end if;
  if p_target_status not in ('draft','morning_recorded','evening_completed') then
    raise exception 'Invalid outlet daily record status.';
  end if;
  if p_record_date is null then raise exception 'Record date is required.'; end if;
  if not exists (select 1 from public.branches b where b.id = p_branch_id and b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null) then
    raise exception 'Active outlet or branch was not found in your company.';
  end if;
  if not public.can_access_outlet_daily_branch(p_branch_id) then raise exception 'Permission denied for this outlet or branch.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'At least one product line is required.'; end if;

  if p_record_id is not null then
    select * into existing from public.outlet_daily_records where id = p_record_id and company_id = actor.company_id for update;
    if existing.id is null then raise exception 'Outlet daily record was not found in your company.'; end if;
    if not public.can_access_outlet_daily_branch(existing.branch_id) then raise exception 'Permission denied for this outlet or branch.'; end if;
    if existing.status in ('reviewed','void') then raise exception 'Reviewed or void records are locked.'; end if;
    if can_edit_sent and not can_edit_outlet then
      p_branch_id := existing.branch_id;
      p_record_date := existing.record_date;
      p_target_status := existing.status::text;
    elsif existing.status = 'morning_recorded' and p_target_status = 'draft' then
      raise exception 'A confirmed entry cannot return to draft.';
    elsif existing.status = 'evening_completed' and p_target_status <> 'evening_completed' then
      raise exception 'A completed entry cannot return to an earlier status.';
    end if;
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    line_product_id := (line ->> 'product_id')::uuid;
    sent_qty := coalesce(nullif(line ->> 'qty_sent', '')::numeric, 0);
    received_qty := coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0);
    line_wastage_qty := coalesce(nullif(line ->> 'wastage_qty', '')::numeric, 0);
    line_reason := nullif(trim(coalesce(line ->> 'wastage_reason', '')), '');
    line_notes := nullif(trim(coalesce(line ->> 'notes', '')), '');
    if not exists (select 1 from public.products p where p.id = line_product_id) then raise exception 'A selected product was not found.'; end if;
    if sent_qty < 0 or received_qty < 0 or line_wastage_qty < 0 then raise exception 'Quantities must be non-negative.'; end if;
    if line_wastage_qty > 0 and line_reason not in ('unsold','damaged','expired','quality_issue','staff_meal','other') then
      raise exception 'A valid wastage reason is required.';
    end if;
    if can_edit_outlet and line_wastage_qty > received_qty and line_notes is null then
      raise exception 'A line remark is required when wastage exceeds the received quantity.';
    end if;
  end loop;

  if p_record_id is null then
    insert into public.outlet_daily_records (company_id, branch_id, record_date, status, submitted_by, notes, created_by, updated_by)
    values (actor.company_id, p_branch_id, p_record_date,
      (case when can_edit_outlet then p_target_status else 'draft' end)::public.outlet_daily_record_status,
      case when can_edit_outlet and p_target_status <> 'draft' then actor.id else null end,
      case when can_edit_outlet then nullif(trim(coalesce(p_notes, '')), '') else null end,
      actor.id, actor.id)
    returning id into saved_id;
  else
    update public.outlet_daily_records set
      branch_id = case when can_edit_outlet then p_branch_id else branch_id end,
      record_date = case when can_edit_outlet then p_record_date else record_date end,
      status = case when can_edit_outlet then p_target_status::public.outlet_daily_record_status else status end,
      submitted_by = case when can_edit_outlet and p_target_status <> 'draft' then actor.id else submitted_by end,
      notes = case when can_edit_outlet then nullif(trim(coalesce(p_notes, '')), '') else notes end,
      updated_by = actor.id
    where id = existing.id returning id into saved_id;
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    insert into public.outlet_daily_record_lines (
      record_id, product_id, qty_sent, morning_received_qty, evening_leftover_qty,
      wastage_qty, wastage_reason, notes
    ) values (
      saved_id, (line ->> 'product_id')::uuid,
      case when can_edit_sent then coalesce(nullif(line ->> 'qty_sent', '')::numeric, 0) else 0 end,
      case when can_edit_outlet then coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0) else 0 end,
      0,
      case when can_edit_outlet then coalesce(nullif(line ->> 'wastage_qty', '')::numeric, 0) else 0 end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'wastage_reason', '')), '')::public.outlet_daily_wastage_reason else null end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'notes', '')), '') else null end
    )
    on conflict (record_id, product_id) do update set
      qty_sent = case when can_edit_sent then excluded.qty_sent else public.outlet_daily_record_lines.qty_sent end,
      morning_received_qty = case when can_edit_outlet then excluded.morning_received_qty else public.outlet_daily_record_lines.morning_received_qty end,
      evening_leftover_qty = 0,
      wastage_qty = case when can_edit_outlet then excluded.wastage_qty else public.outlet_daily_record_lines.wastage_qty end,
      wastage_reason = case when can_edit_outlet then excluded.wastage_reason else public.outlet_daily_record_lines.wastage_reason end,
      notes = case when can_edit_outlet then excluded.notes else public.outlet_daily_record_lines.notes end;
  end loop;

  return saved_id;
end $$;

revoke all on function public.get_production_recipe_options() from public, anon;
revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public, anon;
grant execute on function public.get_production_recipe_options() to authenticated;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;

notify pgrst, 'reload schema';

-- Post-check:
-- select r.role_code, array_agg(p.permission_code order by p.permission_code)
-- from public.roles r join public.role_permissions rp on rp.role_id=r.id
-- join public.permissions p on p.id=rp.permission_id
-- where p.module='recipes' or p.permission_code like 'outlet_daily_record.%'
-- group by r.role_code order by r.role_code;
