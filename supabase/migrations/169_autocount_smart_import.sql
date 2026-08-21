-- AutoCount direct import: tenant-scoped staging, external supplier identities,
-- and one atomic application boundary. AutoCount quantity/cost snapshots never
-- write inventory movements; OMS Stock Take remains the stock authority.

create table public.autocount_import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  status text not null default 'staging' check (status in ('staging','ready','applying','completed','failed')),
  content_hash text not null,
  file_count integer not null default 0 check (file_count >= 0),
  summary jsonb not null default '{}'::jsonb,
  blocking_issues jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.staffs(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  constraint autocount_import_jobs_hash_not_empty check (length(trim(content_hash)) > 0)
);

create unique index autocount_import_jobs_company_hash_active_idx
  on public.autocount_import_jobs(company_id, content_hash)
  where status in ('staging','ready','applying','completed');

create table public.autocount_import_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.autocount_import_jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  file_name text not null,
  file_type text not null check (file_type in ('supplier_list','item_list','location_snapshot')),
  content_hash text not null,
  row_count integer not null check (row_count >= 0),
  headers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, content_hash)
);

create table public.autocount_import_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.autocount_import_jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  entity_type text not null check (entity_type in ('supplier','item','branch_mapping','uom_conversion')),
  business_key text not null,
  source_file text not null,
  source_row integer not null check (source_row > 0),
  normalized jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, entity_type, business_key)
);

create table public.supplier_external_references (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  supplier_id uuid not null references public.suppliers(id),
  source_system text not null default 'autocount',
  external_code text not null,
  source_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, source_system, external_code)
);

create index autocount_import_files_job_idx on public.autocount_import_files(job_id);
create index autocount_import_rows_job_entity_idx on public.autocount_import_rows(job_id, entity_type);
create index supplier_external_references_supplier_idx on public.supplier_external_references(supplier_id);

alter table public.autocount_import_jobs enable row level security;
alter table public.autocount_import_files enable row level security;
alter table public.autocount_import_rows enable row level security;
alter table public.supplier_external_references enable row level security;

create policy "tenant autocount jobs" on public.autocount_import_jobs for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('imports.create'))
  with check (company_id = public.current_staff_company_id() and created_by = public.current_staff_id() and public.has_permission('imports.create'));
create policy "tenant autocount files" on public.autocount_import_files for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('imports.create'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('imports.create')
    and exists (select 1 from public.autocount_import_jobs j where j.id = autocount_import_files.job_id and j.company_id = autocount_import_files.company_id));
create policy "tenant autocount rows" on public.autocount_import_rows for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('imports.create'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('imports.create')
    and exists (select 1 from public.autocount_import_jobs j where j.id = autocount_import_rows.job_id and j.company_id = autocount_import_rows.company_id));
create policy "tenant supplier external references" on public.supplier_external_references for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('supplier_items.read'))
  with check (company_id = public.current_staff_company_id()
    and public.has_any_permission(array['supplier_items.create','supplier_items.update'])
    and exists (select 1 from public.suppliers s where s.id = supplier_id and s.company_id = company_id));

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
  update public.autocount_import_jobs set status = 'applying', confirmed_at = now() where id = job.id;

  for row_record in select * from public.autocount_import_rows where job_id = job.id and entity_type = 'supplier' order by source_row loop
    select * into target_supplier from public.suppliers
      where company_id = actor.company_id and lower(trim(supplier_code)) = lower(trim(row_record.normalized->>'supplier_code'))
        and deleted_at is null limit 1;
    if target_supplier.id is null then
      insert into public.suppliers(company_id, supplier_code, name, status)
      values (actor.company_id, row_record.normalized->>'supplier_code', row_record.normalized->>'supplier_name', 'active')
      returning * into target_supplier;
      result := jsonb_set(result, '{suppliersCreated}', to_jsonb((result->>'suppliersCreated')::integer + 1));
    else
      update public.suppliers set name = coalesce(nullif(row_record.normalized->>'supplier_name',''), name), status = 'active'
      where id = target_supplier.id returning * into target_supplier;
      result := jsonb_set(result, '{suppliersUpdated}', to_jsonb((result->>'suppliersUpdated')::integer + 1));
    end if;
    for external_ref in select value from jsonb_array_elements(coalesce(row_record.normalized->'external_refs','[]'::jsonb)) loop
      insert into public.supplier_external_references(company_id, supplier_id, source_system, external_code, source_name)
      values (actor.company_id, target_supplier.id, 'autocount', external_ref->>'code', nullif(external_ref->>'name',''))
      on conflict (company_id, source_system, external_code) do update
      set supplier_id = excluded.supplier_id, source_name = coalesce(excluded.source_name, public.supplier_external_references.source_name), updated_at = now();
    end loop;
  end loop;

  for row_record in select * from public.autocount_import_rows where job_id = job.id and entity_type = 'item' order by source_row loop
    select * into target_supplier from public.suppliers where company_id = actor.company_id
      and lower(trim(supplier_code)) = lower(trim(row_record.normalized->>'supplier_code')) and deleted_at is null limit 1;
    if target_supplier.id is null then raise exception 'Staged supplier % is missing.', row_record.normalized->>'supplier_code'; end if;
    select * into target_item from public.items where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code')) and deleted_at is null limit 1;
    if target_item.id is null then
      insert into public.items(company_id, item_code, item_name, category, purchase_unit, base_unit, supplier_id, cost, status)
      values (actor.company_id, row_record.normalized->>'item_code', row_record.normalized->>'item_name', row_record.normalized->>'supplier_code',
        row_record.normalized->>'base_uom', row_record.normalized->>'base_uom', target_supplier.id,
        greatest(coalesce((row_record.normalized->>'standard_cost')::numeric,0),0), 'active')
      returning * into target_item;
      result := jsonb_set(result, '{itemsCreated}', to_jsonb((result->>'itemsCreated')::integer + 1));
    else
      update public.items set item_name = row_record.normalized->>'item_name', category = row_record.normalized->>'supplier_code',
        purchase_unit = row_record.normalized->>'base_uom', base_unit = row_record.normalized->>'base_uom', supplier_id = target_supplier.id,
        cost = case when coalesce((row_record.normalized->>'standard_cost')::numeric,0) > 0 then (row_record.normalized->>'standard_cost')::numeric else cost end,
        status = case when coalesce(row_record.normalized->>'active','true') = 'false' then 'inactive'::public.item_status else 'active'::public.item_status end
      where id = target_item.id returning * into target_item;
      result := jsonb_set(result, '{itemsUpdated}', to_jsonb((result->>'itemsUpdated')::integer + 1));
    end if;
    select * into target_supplier_item from public.supplier_items where company_id = actor.company_id
      and supplier_id = target_supplier.id and item_id = target_item.id and deleted_at is null and status = 'active' limit 1;
    if target_item.id is null then raise exception 'Staged item % is missing.', row_record.normalized->>'item_code'; end if;
    if target_supplier.id is null then raise exception 'Staged supplier % is missing.', row_record.normalized->>'supplier_code'; end if;
    if target_supplier_item.id is null then
      insert into public.supplier_items(company_id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, conversion_to_base_uom, unit_cost, status, created_by)
      values (actor.company_id, target_supplier.id, target_item.id, target_item.item_code, target_item.item_name, target_item.base_unit, 1, 0, 'active', actor.id)
      returning * into target_supplier_item;
      result := jsonb_set(result, '{supplierItemsCreated}', to_jsonb((result->>'supplierItemsCreated')::integer + 1));
    end if;
  end loop;

  for row_record in select * from public.autocount_import_rows where job_id = job.id and entity_type = 'branch_mapping' order by source_row loop
    select * into target_branch from public.branches where company_id = actor.company_id
      and lower(trim(branch_code)) = lower(trim(row_record.normalized->>'branch_code')) and deleted_at is null and status = 'active' limit 1;
    select * into target_item from public.items where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code')) and deleted_at is null limit 1;
    if target_item.id is null then raise exception 'Staged item % is missing.', row_record.normalized->>'item_code'; end if;
    select * into target_supplier from public.suppliers where company_id = actor.company_id
      and lower(trim(supplier_code)) = lower(trim(row_record.normalized->>'supplier_code')) and deleted_at is null limit 1;
    select * into target_supplier_item from public.supplier_items where company_id = actor.company_id
      and supplier_id = target_supplier.id and item_id = target_item.id and deleted_at is null and status = 'active' limit 1;
    if target_branch.id is null then raise exception 'Staged branch % is missing or inactive.', row_record.normalized->>'branch_code'; end if;
    if target_supplier.id is null then raise exception 'Staged supplier % is missing.', row_record.normalized->>'supplier_code'; end if;
    if target_supplier_item.id is null then raise exception 'Supplier item relationship for % and % is missing.', row_record.normalized->>'supplier_code', row_record.normalized->>'item_code'; end if;
    if not exists (select 1 from public.branch_supplier_items where branch_id = target_branch.id and supplier_item_id = target_supplier_item.id and deleted_at is null) then
      update public.branch_supplier_items set is_preferred = false, updated_at = now(), updated_by = actor.id
      where branch_id = target_branch.id and item_id = target_item.id and deleted_at is null and status = 'active';
      insert into public.branch_supplier_items(branch_id, supplier_item_id, item_id, is_preferred, status, created_by)
      values (target_branch.id, target_supplier_item.id, target_item.id, true, 'active', actor.id);
      result := jsonb_set(result, '{branchMappingsCreated}', to_jsonb((result->>'branchMappingsCreated')::integer + 1));
    end if;
  end loop;

  for row_record in select * from public.autocount_import_rows where job_id = job.id and entity_type = 'uom_conversion' order by source_row loop
    select * into target_item from public.items where company_id = actor.company_id
      and lower(trim(item_code)) = lower(trim(row_record.normalized->>'item_code')) and deleted_at is null limit 1;
    if not exists (select 1 from public.uom_conversions where company_id = actor.company_id and item_id = target_item.id
      and lower(from_uom) = lower(row_record.normalized->>'from_uom') and lower(to_uom) = lower(row_record.normalized->>'to_uom') and deleted_at is null) then
      insert into public.uom_conversions(company_id, item_id, from_uom, to_uom, factor, status, created_by)
      values (actor.company_id, target_item.id, row_record.normalized->>'from_uom', row_record.normalized->>'to_uom', (row_record.normalized->>'factor')::numeric, 'active', actor.id);
      result := jsonb_set(result, '{uomConversionsCreated}', to_jsonb((result->>'uomConversionsCreated')::integer + 1));
    end if;
  end loop;

  update public.autocount_import_jobs set status = 'completed', completed_at = now(), summary = summary || jsonb_build_object('result', result) where id = job.id;
  return result;
exception when others then
  -- Business writes roll back with the statement; the API records the failure message separately.
  raise;
end;
$$;

revoke all on function public.apply_autocount_import_job(uuid) from public, anon;
grant execute on function public.apply_autocount_import_job(uuid) to authenticated;
grant select, insert, update on public.autocount_import_jobs, public.autocount_import_files, public.autocount_import_rows, public.supplier_external_references to authenticated;

notify pgrst, 'reload schema';
