-- Create an item master and its optional sourcing scope in one transaction.
-- This keeps the UI simple without allowing half-created supplier mappings.
create or replace function public.create_operational_item(
  p_item jsonb,
  p_supplier jsonb default null,
  p_branch_ids uuid[] default '{}'::uuid[],
  p_preferred boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  created_item_id uuid;
  created_supplier_item_id uuid;
  item_code text := nullif(trim(coalesce(p_item->>'item_code', '')), '');
  item_name text := nullif(trim(coalesce(p_item->>'item_name', '')), '');
  category text := nullif(trim(coalesce(p_item->>'category', '')), '');
  base_unit text := nullif(trim(coalesce(p_item->>'base_unit', '')), '');
  purchase_unit text := nullif(trim(coalesce(p_item->>'purchase_unit', '')), '');
  autocount_code text := nullif(trim(coalesce(p_item->>'autocount_code', '')), '');
  supplier_id uuid;
  branch_id uuid;
  mapped_count integer := 0;
  conversion numeric := coalesce(nullif(p_supplier->>'conversion_to_base_uom', '')::numeric, nullif(p_item->>'conversion_to_base_unit', '')::numeric, 1);
  unit_cost numeric := coalesce(nullif(p_supplier->>'unit_cost', '')::numeric, nullif(p_item->>'cost', '')::numeric, 0);
  moq numeric := coalesce(nullif(p_supplier->>'moq', '')::numeric, nullif(p_item->>'moq', '')::numeric, 0);
  lead_time integer := coalesce(nullif(p_supplier->>'lead_time_days', '')::integer, nullif(p_item->>'lead_time_days', '')::integer, 0);
  supplier_uom text := nullif(trim(coalesce(p_supplier->>'purchase_uom', '')), '');
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  if not public.has_permission('items.create') then raise exception 'Missing permission: items.create'; end if;
  if item_code is null or item_name is null or category is null or base_unit is null then
    raise exception 'Item code, name, category and base unit are required.';
  end if;
  if purchase_unit is null then purchase_unit := base_unit; end if;
  if conversion <= 0 or unit_cost < 0 or moq < 0 or lead_time < 0 then
    raise exception 'Item sourcing values must be within valid ranges.';
  end if;
  if p_supplier is not null and jsonb_typeof(p_supplier) <> 'object' then
    raise exception 'Sourcing details must be a JSON object.';
  end if;
  if p_supplier is not null then
    if not public.has_permission('supplier_items.create') then raise exception 'Missing permission: supplier_items.create'; end if;
    supplier_id := nullif(p_supplier->>'supplier_id', '')::uuid;
    if supplier_id is null then raise exception 'Select a supplier or clear sourcing details.'; end if;
    if not exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.company_id = actor.company_id and s.status = 'active' and s.deleted_at is null
    ) then raise exception 'The selected supplier is not active in your workspace.'; end if;
    if cardinality(coalesce(p_branch_ids, '{}'::uuid[])) > 0 then
      if exists (
        select 1 from unnest(p_branch_ids) ids(branch_id)
        left join public.branches b on b.id = ids.branch_id and b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null
        where b.id is null or not public.can_access_inventory_branch(b.company_id, b.id)
      ) then raise exception 'One or more selected branches are not available in your workspace.'; end if;
    end if;
  elsif cardinality(coalesce(p_branch_ids, '{}'::uuid[])) > 0 then
    raise exception 'Select a supplier before assigning branch availability.';
  end if;

  insert into public.items (
    company_id, item_code, autocount_code, item_name, category, purchase_unit,
    base_unit, conversion_to_base_unit, supplier_id, cost, safety_stock,
    lead_time_days, moq, status
  ) values (
    actor.company_id, item_code, autocount_code, item_name, category, purchase_unit,
    base_unit, coalesce(nullif(p_item->>'conversion_to_base_unit', '')::numeric, 1), supplier_id,
    coalesce(nullif(p_item->>'cost', '')::numeric, 0), coalesce(nullif(p_item->>'safety_stock', '')::numeric, 0),
    coalesce(nullif(p_item->>'lead_time_days', '')::integer, 0), coalesce(nullif(p_item->>'moq', '')::numeric, 0), 'active'
  ) returning id into created_item_id;

  if supplier_id is not null then
    insert into public.supplier_items (
      company_id, supplier_id, item_id, supplier_item_code, supplier_item_name,
      purchase_uom, conversion_to_base_uom, unit_cost, moq, lead_time_days,
      status, created_by, updated_by
    ) values (
      actor.company_id, supplier_id, created_item_id, item_code, item_name,
      coalesce(supplier_uom, purchase_unit), conversion, unit_cost, moq, lead_time,
      'active', actor.id, actor.id
    ) returning id into created_supplier_item_id;

    foreach branch_id in array coalesce(p_branch_ids, '{}'::uuid[]) loop
      if p_preferred then
        update public.branch_supplier_items
        set is_preferred = false, updated_by = actor.id
        where branch_supplier_items.branch_id = branch_id
          and branch_supplier_items.item_id = created_item_id
          and is_preferred and deleted_at is null;
      end if;
      insert into public.branch_supplier_items (
        branch_id, supplier_item_id, item_id, is_preferred, status, created_by, updated_by
      ) values (branch_id, created_supplier_item_id, created_item_id, p_preferred, 'active', actor.id, actor.id);
      mapped_count := mapped_count + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'item_id', created_item_id,
    'supplier_item_id', created_supplier_item_id,
    'mapped_branch_count', mapped_count,
    'readiness', case
      when created_supplier_item_id is null then 'master_only'
      when mapped_count = 0 then 'supplier_ready'
      else 'branch_ready'
    end
  );
end;
$$;

revoke all on function public.create_operational_item(jsonb, jsonb, uuid[], boolean) from public, anon;
grant execute on function public.create_operational_item(jsonb, jsonb, uuid[], boolean) to authenticated;
notify pgrst, 'reload schema';
