-- Structured brand visibility: only an explicit source Brand/品牌 field is
-- trusted.  Existing descriptions are never heuristically split into brands.
alter table public.items add column if not exists brand_name text;

create index if not exists items_company_brand_active_idx
  on public.items(company_id, lower(trim(brand_name)))
  where deleted_at is null and nullif(trim(brand_name), '') is not null;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.create_operational_item(jsonb,jsonb,uuid[],boolean)'::regprocedure);
  if position('item_name, category, purchase_unit' in definition) = 0
    or position('item_name, nullif(trim(coalesce(p_item->>''brand_name'', '''')), ''''), category, purchase_unit' in definition) > 0 then
    raise exception 'create_operational_item definition shape changed; brand migration is unsafe';
  end if;
  definition := replace(definition,
    'item_code, autocount_code, item_name, category, purchase_unit,',
    'item_code, autocount_code, item_name, brand_name, category, purchase_unit,');
  definition := replace(definition,
    'actor.company_id, item_code, autocount_code, item_name, brand_name, category, purchase_unit,',
    'actor.company_id, item_code, autocount_code, item_name, nullif(trim(coalesce(p_item->>''brand_name'', '''')), ''''), category, purchase_unit,');
  if position('brand_name' in definition) = 0 then
    raise exception 'create_operational_item brand patch did not apply';
  end if;
  execute definition;
end $$;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.apply_autocount_import_job(uuid)'::regprocedure);
  if position('item_code, item_name, category, purchase_unit, base_unit, supplier_id, cost, status' in definition) = 0
    or position('update public.items set item_name = row_record.normalized->>''item_name'', category = v_supplier_group,' in definition) = 0 then
    raise exception 'apply_autocount_import_job definition shape changed; brand migration is unsafe';
  end if;
  definition := replace(definition,
    'item_code, item_name, category, purchase_unit, base_unit, supplier_id, cost, status',
    'item_code, item_name, brand_name, category, purchase_unit, base_unit, supplier_id, cost, status');
  definition := replace(definition,
    'row_record.normalized->>''item_code'', row_record.normalized->>''item_name'', v_supplier_group,',
    'row_record.normalized->>''item_code'', row_record.normalized->>''item_name'', nullif(trim(row_record.normalized->>''brand_name''), ''''), v_supplier_group,');
  definition := replace(definition,
    'update public.items set item_name = row_record.normalized->>''item_name'', category = v_supplier_group,',
    'update public.items set item_name = row_record.normalized->>''item_name'', brand_name = nullif(trim(row_record.normalized->>''brand_name''), ''''), category = v_supplier_group,');
  if position('brand_name' in definition) = 0 then
    raise exception 'apply_autocount_import_job brand patch did not apply';
  end if;
  execute definition;
end $$;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.get_items_workspace(text,text,text,uuid,text,text,text,text,integer,integer)'::regprocedure);
  if position('i.item_name,' in definition) = 0
    or position('row.item_name ilike' in definition) = 0 then
    raise exception 'get_items_workspace definition shape changed; brand migration is unsafe';
  end if;
  -- pg_get_functiondef normalizes source files to LF on some Postgres
  -- versions, while older linked projects return CRLF. Match the SQL shape
  -- rather than one particular line-ending/indentation representation.
  definition := regexp_replace(
    definition,
    'i[.]item_name,[[:space:]]+i[.]category,',
    'i.item_name, i.brand_name, i.category,',
    1,
    1,
    'n'
  );
  definition := regexp_replace(
    definition,
    'row[.]category ilike',
    'coalesce(row.brand_name, '''') ilike ''%'' || trim(p_search) || ''%'' or row.category ilike',
    1,
    1,
    'n'
  );
  if position('i.brand_name' in definition) = 0 or position('row.brand_name' in definition) = 0 then
    raise exception 'get_items_workspace brand patch did not apply';
  end if;
  execute definition;
end $$;

comment on column public.items.brand_name is 'Authoritative product brand from explicit source data; never inferred from item_name.';
