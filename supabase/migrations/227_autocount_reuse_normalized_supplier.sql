-- AutoCount Confirm must reuse the canonical supplier when a new creditor
-- code carries a name that already exists in the company. The active supplier
-- name index is intentionally unique; creditor codes remain one-to-many
-- external references to that canonical supplier.

create or replace function public.apply_autocount_import_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  job public.autocount_import_jobs%rowtype;
  row_record record;
  target_supplier public.suppliers%rowtype;
  target_item public.items%rowtype;
  target_supplier_item public.supplier_items%rowtype;
  target_branch public.branches%rowtype;
  result jsonb := jsonb_build_object(
    'suppliersCreated', 0, 'suppliersUpdated', 0, 'itemsCreated', 0,
    'itemsUpdated', 0, 'supplierItemsCreated', 0, 'branchMappingsCreated', 0,
    'uomConversionsCreated', 0, 'inventoryMovementsCreated', 0
  );
  external_ref jsonb;
  v_supplier_code text;
  v_supplier_group text;
  v_supplier_name text;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('imports.create') then
    raise exception 'Missing permission: imports.create' using errcode = '42501';
  end if;

  select * into job from public.autocount_import_jobs where id = p_job_id for update;
  if job.id is null or job.company_id is distinct from actor.company_id then
    raise exception 'AutoCount import job was not found.' using errcode = 'P0002';
  end if;
  if job.status = 'completed' then return coalesce(job.summary->'result', job.summary); end if;
  if job.status <> 'ready' or jsonb_array_length(job.blocking_issues) > 0 then
    raise exception 'AutoCount import job is not ready to confirm.' using errcode = '23514';
  end if;

  -- Prevent two confirms for the same tenant from racing the supplier identity
  -- indexes while retaining concurrency between different companies.
  perform pg_advisory_xact_lock(hashtextextended(actor.company_id::text, 0));
  update public.autocount_import_jobs set status = 'applying', confirmed_at = now() where id = job.id;

  for row_record in
    select * from public.autocount_import_rows
    where job_id = job.id and entity_type = 'supplier'
    order by source_row
  loop
    if jsonb_array_length(coalesce(row_record.normalized->'external_refs', '[]'::jsonb)) = 0 then
      raise exception 'AutoCount supplier % has no authoritative creditor reference. Repair the source export before confirming.', row_record.normalized->>'supplier_group'
        using errcode = '23514';
    end if;

    v_supplier_code := nullif(trim(row_record.normalized->>'supplier_code'), '');
    v_supplier_group := coalesce(nullif(trim(row_record.normalized->>'supplier_group'), ''), v_supplier_code);
    v_supplier_name := coalesce(nullif(trim(row_record.normalized->>'supplier_name'), ''), v_supplier_group, v_supplier_code);

    select s.* into target_supplier
    from public.suppliers s
    where s.company_id = actor.company_id
      and s.deleted_at is null
      and (
        lower(trim(s.supplier_code)) = lower(v_supplier_code)
        or upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = upper(regexp_replace(v_supplier_name, '\s+', ' ', 'g'))
        or exists (
          select 1 from public.supplier_external_references ser
          where ser.company_id = actor.company_id
            and ser.supplier_id = s.id
            and ser.source_system = 'autocount'
            and lower(trim(ser.external_code)) = lower(v_supplier_code)
        )
      )
    order by
      (lower(trim(s.supplier_code)) = lower(v_supplier_code)) desc,
      (upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = upper(regexp_replace(v_supplier_name, '\s+', ' ', 'g'))) desc,
      s.created_at,
      s.id
    limit 1
    for update;

    if target_supplier.id is null then
      insert into public.suppliers(company_id, supplier_code, supplier_group, name, status)
      values (actor.company_id, v_supplier_code, v_supplier_group, v_supplier_name, 'active')
      on conflict (company_id, (upper(regexp_replace(trim(name), '\s+', ' ', 'g')))) where deleted_at is null
      do nothing
      returning * into target_supplier;

      if target_supplier.id is null then
        select s.* into target_supplier
        from public.suppliers s
        where s.company_id = actor.company_id
          and s.deleted_at is null
          and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = upper(regexp_replace(v_supplier_name, '\s+', ' ', 'g'))
        order by s.created_at, s.id
        limit 1
        for update;
        update public.suppliers s
        set supplier_group = coalesce(v_supplier_group, s.supplier_group),
            name = v_supplier_name,
            status = 'active',
            updated_at = now()
        where s.id = target_supplier.id
        returning * into target_supplier;
        result := jsonb_set(result, '{suppliersUpdated}', to_jsonb((result->>'suppliersUpdated')::integer + 1));
      else
        result := jsonb_set(result, '{suppliersCreated}', to_jsonb((result->>'suppliersCreated')::integer + 1));
      end if;
    else
      update public.suppliers s
      set supplier_group = coalesce(v_supplier_group, s.supplier_group),
          name = v_supplier_name,
          status = 'active',
          updated_at = now()
      where s.id = target_supplier.id
      returning * into target_supplier;
      result := jsonb_set(result, '{suppliersUpdated}', to_jsonb((result->>'suppliersUpdated')::integer + 1));
    end if;

    for external_ref in
      select value from jsonb_array_elements(coalesce(row_record.normalized->'external_refs', '[]'::jsonb))
    loop
      insert into public.supplier_external_references(company_id, supplier_id, source_system, external_code, source_name)
      values (actor.company_id, target_supplier.id, 'autocount', external_ref->>'code', nullif(external_ref->>'name', ''))
      on conflict (company_id, source_system, external_code) do update
      set supplier_id = excluded.supplier_id,
          source_name = coalesce(excluded.source_name, public.supplier_external_references.source_name),
          updated_at = now();
    end loop;
  end loop;

  for row_record in
    select * from public.autocount_import_rows
    where job_id = job.id and entity_type = 'item'
    order by source_row
  loop
    v_supplier_code := nullif(trim(row_record.normalized->>'supplier_code'), '');
    v_supplier_group := nullif(trim(row_record.normalized->>'supplier_group'), '');
    select s.* into target_supplier
    from public.suppliers s
    where s.company_id = actor.company_id
      and s.deleted_at is null
      and (
        lower(trim(s.supplier_code)) = lower(v_supplier_code)
        or (v_supplier_group is not null and lower(trim(s.supplier_group)) = lower(v_supplier_group))
        or exists (
          select 1 from public.supplier_external_references ser
          where ser.company_id = actor.company_id
            and ser.supplier_id = s.id
            and ser.source_system = 'autocount'
            and lower(trim(ser.external_code)) = lower(v_supplier_code)
        )
      )
    order by (lower(trim(s.supplier_code)) = lower(v_supplier_code)) desc, s.created_at, s.id
    limit 1;

    select * into target_item from public.items
    where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code'))
      and deleted_at is null
    limit 1;
    if target_item.id is null then
      insert into public.items(company_id, item_code, item_name, category, purchase_unit, base_unit, supplier_id, cost, status)
      values (
        actor.company_id,
        row_record.normalized->>'item_code',
        row_record.normalized->>'item_name',
        row_record.normalized->>'supplier_group',
        row_record.normalized->>'base_uom',
        row_record.normalized->>'base_uom',
        target_supplier.id,
        greatest(coalesce((row_record.normalized->>'standard_cost')::numeric, 0), 0),
        'active'
      )
      returning * into target_item;
      result := jsonb_set(result, '{itemsCreated}', to_jsonb((result->>'itemsCreated')::integer + 1));
    else
      update public.items
      set item_name = row_record.normalized->>'item_name',
          category = row_record.normalized->>'supplier_group',
          purchase_unit = row_record.normalized->>'base_uom',
          base_unit = row_record.normalized->>'base_uom',
          supplier_id = coalesce(target_supplier.id, supplier_id),
          status = case when coalesce(row_record.normalized->>'active', 'true') = 'false' then 'inactive'::public.item_status else 'active'::public.item_status end
      where id = target_item.id
      returning * into target_item;
      result := jsonb_set(result, '{itemsUpdated}', to_jsonb((result->>'itemsUpdated')::integer + 1));
    end if;

    if target_supplier.id is not null then
      select * into target_supplier_item from public.supplier_items
      where company_id = actor.company_id
        and supplier_id = target_supplier.id
        and item_id = target_item.id
        and deleted_at is null
        and status = 'active'
      limit 1;
      if target_supplier_item.id is null then
        insert into public.supplier_items(company_id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, conversion_to_base_uom, unit_cost, status, created_by)
        values (actor.company_id, target_supplier.id, target_item.id, target_item.item_code, target_item.item_name, target_item.base_unit, 1, 0, 'active', actor.id)
        returning * into target_supplier_item;
        result := jsonb_set(result, '{supplierItemsCreated}', to_jsonb((result->>'supplierItemsCreated')::integer + 1));
      end if;
    end if;
  end loop;

  for row_record in
    select * from public.autocount_import_rows
    where job_id = job.id and entity_type = 'branch_mapping'
    order by source_row
  loop
    select * into target_branch from public.branches
    where company_id = actor.company_id
      and lower(trim(branch_code)) = lower(trim(row_record.normalized->>'branch_code'))
      and deleted_at is null
      and status = 'active'
    limit 1;
    select * into target_item from public.items
    where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code'))
      and deleted_at is null
    limit 1;
    if target_item.id is null then
      raise exception 'Staged item % is missing.', row_record.normalized->>'item_code';
    end if;

    v_supplier_code := nullif(trim(row_record.normalized->>'supplier_code'), '');
    v_supplier_group := nullif(trim(row_record.normalized->>'supplier_group'), '');
    select s.* into target_supplier
    from public.suppliers s
    where s.company_id = actor.company_id
      and s.deleted_at is null
      and (
        lower(trim(s.supplier_code)) = lower(v_supplier_code)
        or (v_supplier_group is not null and lower(trim(s.supplier_group)) = lower(v_supplier_group))
        or exists (
          select 1 from public.supplier_external_references ser
          where ser.company_id = actor.company_id
            and ser.supplier_id = s.id
            and ser.source_system = 'autocount'
            and lower(trim(ser.external_code)) = lower(v_supplier_code)
        )
      )
    order by (lower(trim(s.supplier_code)) = lower(v_supplier_code)) desc, s.created_at, s.id
    limit 1;

    if target_branch.id is null then
      raise exception 'Staged branch % is missing or inactive.', row_record.normalized->>'branch_code';
    end if;
    if target_supplier.id is null then
      raise exception 'Staged supplier % is missing.', coalesce(v_supplier_code, v_supplier_group);
    end if;

    select * into target_supplier_item from public.supplier_items
    where company_id = actor.company_id
      and supplier_id = target_supplier.id
      and item_id = target_item.id
      and deleted_at is null
      and status = 'active'
    limit 1;
    if target_supplier_item.id is null then
      raise exception 'Supplier item relationship for % and % is missing.', coalesce(v_supplier_code, v_supplier_group), row_record.normalized->>'item_code';
    end if;
    if not exists (
      select 1 from public.branch_supplier_items
      where branch_id = target_branch.id
        and supplier_item_id = target_supplier_item.id
        and deleted_at is null
    ) then
      update public.branch_supplier_items
      set is_preferred = false, updated_at = now(), updated_by = actor.id
      where branch_id = target_branch.id
        and item_id = target_item.id
        and deleted_at is null
        and status = 'active';
      insert into public.branch_supplier_items(branch_id, supplier_item_id, item_id, is_preferred, status, created_by)
      values (target_branch.id, target_supplier_item.id, target_item.id, true, 'active', actor.id);
      result := jsonb_set(result, '{branchMappingsCreated}', to_jsonb((result->>'branchMappingsCreated')::integer + 1));
    end if;
  end loop;

  for row_record in
    select * from public.autocount_import_rows
    where job_id = job.id and entity_type = 'uom_conversion'
    order by source_row
  loop
    select * into target_item from public.items
    where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code'))
      and deleted_at is null
    limit 1;
    if not exists (
      select 1 from public.uom_conversions
      where company_id = actor.company_id
        and item_id = target_item.id
        and lower(from_uom) = lower(row_record.normalized->>'from_uom')
        and lower(to_uom) = lower(row_record.normalized->>'to_uom')
        and deleted_at is null
    ) then
      insert into public.uom_conversions(company_id, item_id, from_uom, to_uom, factor, status, created_by)
      values (actor.company_id, target_item.id, row_record.normalized->>'from_uom', row_record.normalized->>'to_uom', (row_record.normalized->>'factor')::numeric, 'active', actor.id);
      result := jsonb_set(result, '{uomConversionsCreated}', to_jsonb((result->>'uomConversionsCreated')::integer + 1));
    end if;
  end loop;

  update public.autocount_import_jobs
  set status = 'completed',
      completed_at = now(),
      summary = summary || jsonb_build_object('result', result)
  where id = job.id;
  return result;
exception when others then
  raise;
end;
$$;

revoke all on function public.apply_autocount_import_job(uuid) from public, anon;
grant execute on function public.apply_autocount_import_job(uuid) to authenticated;

comment on function public.apply_autocount_import_job(uuid) is
  'Confirms one staged AutoCount job atomically; canonical suppliers are reused by normalized name and creditor reference.';

notify pgrst, 'reload schema';
