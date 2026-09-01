-- Posting a Stock Count can apply pending item retirements. The retirement
-- trigger used the unsupported notification priority "high", which violates
-- notifications_priority_check and rolls back the entire posting transaction.
-- Use the supported equivalent "urgent" and fail unless the live function is
-- verified to contain the corrected value.
do $migration$
declare
  definition text;
  patched text;
begin
  select pg_get_functiondef(
    'public.apply_posted_stock_count_item_retirements()'::regprocedure
  ) into definition;

  if definition is null then
    raise exception 'apply_posted_stock_count_item_retirements() is unavailable';
  end if;

  -- pg_get_functiondef may render string literals with explicit ::text casts.
  -- This trigger contains one notification priority literal, so patch both
  -- representations while retaining the surrounding function unchanged.
  patched := replace(definition, $value$'high'::text$value$, $value$'urgent'::text$value$);
  patched := replace(patched, $value$'high'$value$, $value$'urgent'$value$);

  if patched = definition and position($value$'urgent'$value$ in definition) = 0 then
    raise exception 'Could not verify the Stock Count retirement notification priority';
  end if;

  execute patched;
end $migration$;
