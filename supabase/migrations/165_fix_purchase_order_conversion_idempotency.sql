-- The purchase-order idempotency trigger requires every authenticated insert
-- to carry a key.  The PR conversion function predates that invariant, so
-- make conversion generate one atomically instead of failing at the trigger.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
    into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'convert_purchase_request_to_purchase_order'
    and p.pronargs = 2;

  if function_definition is null then
    raise exception 'The purchase request conversion function is missing.';
  end if;

  function_definition := replace(
    function_definition,
    E'production_risk, status, approval_status, remarks, created_by, updated_by\n  ) values (',
    E'production_risk, status, approval_status, remarks, created_by, updated_by, idempotency_key\n  ) values ('
  );
  function_definition := replace(
    function_definition,
    E'actor.id, actor.id\n  );\n\n  insert into public.purchase_order_lines',
    E'actor.id, actor.id, gen_random_uuid()\n  );\n\n  insert into public.purchase_order_lines'
  );
  execute function_definition;
end
$$;

notify pgrst, 'reload schema';
