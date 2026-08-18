-- The supplier master uses supplier_code, not code.  Keep the already deployed
-- transition function compatible while correcting the source migration too.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
    into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'transition_purchase_request'
    and p.pronargs = 3;

  if function_definition is null then
    raise exception 'The purchase request transition function is missing.';
  end if;

  function_definition := replace(
    function_definition,
    'order by supplier.code nulls last',
    'order by supplier.supplier_code nulls last'
  );
  execute function_definition;
end
$$;

notify pgrst, 'reload schema';
