-- Repair the AutoCount confirm RPC introduced in migration 169.
-- Keep this as a follow-up migration because 169 may already be applied remotely.

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.apply_autocount_import_job(uuid)'::regprocedure)
    into function_definition;

  -- Item rows do not carry a branch. Remove the misplaced branch check.
  function_definition := regexp_replace(
    function_definition,
    E'\\n[[:space:]]*if target_branch[.]id is null then raise exception ''Staged branch % is missing or inactive.'', row_record[.]normalized->>''branch_code''; end if;',
    '',
    'g'
  );

  -- A supplier-item relationship is created here, so do not reject it first.
  function_definition := regexp_replace(
    function_definition,
    E'\\n[[:space:]]*if target_supplier_item[.]id is null then raise exception ''Supplier item relationship for % and % is missing.'', row_record[.]normalized->>''supplier_code'', row_record[.]normalized->>''item_code''; end if;',
    '',
    'g'
  );

  -- Validate the branch and supplier relationship before creating the mapping.
  function_definition := replace(
    function_definition,
    '    if not exists (select 1 from public.branch_supplier_items'
      , '    if target_branch.id is null then raise exception ''Staged branch % is missing or inactive.'', row_record.normalized->>''branch_code''; end if;'
      || chr(10) || '    if target_supplier.id is null then raise exception ''Staged supplier % is missing.'', row_record.normalized->>''supplier_code''; end if;'
      || chr(10) || '    if target_supplier_item.id is null then raise exception ''Supplier item relationship for % and % is missing.'', row_record.normalized->>''supplier_code'', row_record.normalized->>''item_code''; end if;'
      || chr(10) || '    if not exists (select 1 from public.branch_supplier_items'
  );

  execute function_definition;
end;
$$;

notify pgrst, 'reload schema';
