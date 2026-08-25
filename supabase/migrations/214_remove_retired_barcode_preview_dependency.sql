-- Barcode tables were retired from the branch-owned inventory model. Legacy
-- hard-delete preview must not reference either obsolete table name.
do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v057(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, 'select count(*) into c from public.barcode_mappings where item_id=record_id;', 'select 0 into c;');
  d := replace(d, 'select count(*) into c from public.barcode_mappings where product_id=record_id;', 'select 0 into c;');
  if d = original then raise exception 'Retired barcode preview dependency was not found.'; end if;
  execute d;
end $$;
