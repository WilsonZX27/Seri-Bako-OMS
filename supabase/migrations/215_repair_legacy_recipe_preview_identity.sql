-- Recipe identity now uses recipe_no; recipe names belong to Products.
do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v057(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, 'r.recipe_code', 'r.recipe_no');
  d := replace(d, 'r.recipe_name', 'r.recipe_no');
  if d = original then raise exception 'Legacy recipe identity preview pattern was not found.'; end if;
  execute d;
end $$;
