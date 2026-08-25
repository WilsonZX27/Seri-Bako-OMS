-- Finish the schema lint closure: repair the renamed barcode table reference
-- and make compatibility parameters/variables explicitly intentional.
do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v057(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, 'from barcodes where item_id=record_id', 'from public.barcode_mappings where item_id=record_id');
  d := replace(d, 'from barcodes where product_id=record_id', 'from public.barcode_mappings where product_id=record_id');
  if d = original then raise exception 'Legacy barcode dependency repair pattern was not found.'; end if; execute d;
end $$;

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v059(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, ' company uuid;', '');
  d := replace(d, ' company := (root->>''company_id'')::uuid;', '');
  if d = original or position('company uuid' in d) > 0 then raise exception 'Legacy preview unused variable repair pattern was not found.'; end if; execute d;
end $$;

do $$
declare signature regprocedure; d text;
begin
  select oid::regprocedure into signature from pg_proc
  where pronamespace='public'::regnamespace and proname='can_access_purchase_request' limit 1;
  select pg_get_functiondef(signature) into d;
  if position('perform target_requested_by;' in d) = 0 then
    d := replace(d, E'begin\n', E'begin\n  perform target_requested_by; -- compatibility parameter retained for callers\n');
    execute d;
  end if;
end $$;

do $$
declare signature regprocedure; d text;
begin
  select oid::regprocedure into signature from pg_proc
  where pronamespace='public'::regnamespace and proname='notify_stock_count_scope_change' limit 1;
  select pg_get_functiondef(signature) into d;
  if position('perform p_item_id;' in d) = 0 then
    d := replace(d, E'begin\n', E'begin\n  perform p_item_id; perform p_actor_id; -- compatibility parameters retained for audit callers\n');
    execute d;
  end if;
end $$;

notify pgrst, 'reload schema';
