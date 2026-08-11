-- Repair the bounded Stock Card RPC installed by migration 142.
-- The ledger stores reference_id as uuid; the RPC's public contract returns text.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.get_stock_card_bounded(date,date,uuid,uuid,text,text,text,text)'::regprocedure
  ) into function_definition;

  function_definition := regexp_replace(
    function_definition,
    '\m(st\.reference_id)\M',
    '\1::text',
    'g'
  );

  execute function_definition;
end;
$$;

revoke all on function public.get_stock_card_bounded(date,date,uuid,uuid,text,text,text,text) from public;
grant execute on function public.get_stock_card_bounded(date,date,uuid,uuid,text,text,text,text) to authenticated;
