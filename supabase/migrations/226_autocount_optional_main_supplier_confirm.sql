-- Keep AutoCount Preview and Confirm on the same business rule: Main Supplier
-- is optional. Items without one are imported, while supplier relationships
-- and branch mappings are skipped until Purchasing assigns the source.

do $migration$
declare
  definition text;
  original_definition text;
begin
  definition := pg_get_functiondef('public.apply_autocount_import_job(uuid)'::regprocedure);
  original_definition := definition;

  if position($needle$if target_supplier.id is null then raise exception 'Staged supplier % is missing.', row_record.normalized->>'supplier_code'; end if;$needle$ in definition) = 0 then
    raise exception 'apply_autocount_import_job supplier requirement shape changed; optional supplier patch is unsafe';
  end if;
  definition := replace(
    definition,
    $needle$if target_supplier.id is null then raise exception 'Staged supplier % is missing.', row_record.normalized->>'supplier_code'; end if;$needle$,
    ''
  );

  if position($needle$purchase_unit = row_record.normalized->>'base_uom', base_unit = row_record.normalized->>'base_uom', supplier_id = target_supplier.id,$needle$ in definition) = 0 then
    raise exception 'apply_autocount_import_job item update shape changed; optional supplier patch is unsafe';
  end if;
  definition := replace(
    definition,
    $needle$purchase_unit = row_record.normalized->>'base_uom', base_unit = row_record.normalized->>'base_uom', supplier_id = target_supplier.id,$needle$,
    $replacement$purchase_unit = row_record.normalized->>'base_uom', base_unit = row_record.normalized->>'base_uom', supplier_id = coalesce(target_supplier.id, supplier_id),$replacement$
  );

  if position($needle$values (actor.company_id, row_record.normalized->>'item_code', row_record.normalized->>'item_name', row_record.normalized->>'supplier_code',$needle$ in definition) = 0
    or position($needle$category = row_record.normalized->>'supplier_code',$needle$ in definition) = 0 then
    raise exception 'apply_autocount_import_job item group shape changed; optional supplier patch is unsafe';
  end if;
  definition := replace(
    definition,
    $needle$values (actor.company_id, row_record.normalized->>'item_code', row_record.normalized->>'item_name', row_record.normalized->>'supplier_code',$needle$,
    $replacement$values (actor.company_id, row_record.normalized->>'item_code', row_record.normalized->>'item_name', row_record.normalized->>'supplier_group',$replacement$
  );
  definition := replace(
    definition,
    $needle$category = row_record.normalized->>'supplier_code',$needle$,
    $replacement$category = row_record.normalized->>'supplier_group',$replacement$
  );

  definition := regexp_replace(
    definition,
    '    select \* into target_supplier_item from public\.supplier_items where company_id = actor\.company_id',
    E'    if target_supplier.id is not null then\n      select * into target_supplier_item from public.supplier_items where company_id = actor.company_id'
  );
  definition := regexp_replace(
    definition,
    '(result := jsonb_set\(result, ''\{supplierItemsCreated\}'', to_jsonb\(\(result->>''supplierItemsCreated''\)::integer \+ 1\)\);)[[:space:]]+end if;[[:space:]]+end loop;',
    E'\\1\n      end if;\n    end if;\n  end loop;'
  );

  if position('if target_supplier.id is not null then' in definition) = 0 then
    raise exception 'apply_autocount_import_job supplier item shape changed; optional supplier patch is unsafe';
  end if;

  if definition = original_definition then
    raise exception 'apply_autocount_import_job optional supplier patch made no change';
  end if;
  execute definition;
end;
$migration$;

comment on function public.apply_autocount_import_job(uuid) is
  'Confirms one staged AutoCount job atomically; items without Main Supplier import without purchasing mappings.';

notify pgrst, 'reload schema';
